/**
 * Thread + message persistence. A thread owns an ordered list of messages;
 * assistant messages own their cited sources and suggested related questions.
 * See docs/spec.html §10.
 */
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import type { SourceCard } from '$lib/events';

export interface ThreadSummary {
	id: string;
	title: string;
}

export interface StoredMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	sources: SourceCard[];
	related: string[];
}

export interface LoadedThread {
	id: string;
	title: string;
	messages: StoredMessage[];
}

export async function listThreads(userId: string): Promise<ThreadSummary[]> {
	return db
		.select({ id: schema.threads.id, title: schema.threads.title })
		.from(schema.threads)
		.where(eq(schema.threads.userId, userId))
		.orderBy(desc(schema.threads.createdAt));
}

export async function createThread(userId: string, title: string): Promise<ThreadSummary> {
	const id = crypto.randomUUID();
	const clean = (title.trim() || 'New thread').slice(0, 120);
	await db.insert(schema.threads).values({ id, userId, title: clean, createdAt: new Date() });
	return { id, title: clean };
}

/** Owns the user-scoped check; returns null if the thread isn't theirs. */
export async function getThread(userId: string, id: string): Promise<LoadedThread | null> {
	const [t] = await db
		.select()
		.from(schema.threads)
		.where(and(eq(schema.threads.id, id), eq(schema.threads.userId, userId)));
	if (!t) return null;

	const msgs = await db
		.select()
		.from(schema.messages)
		.where(eq(schema.messages.threadId, id))
		.orderBy(asc(schema.messages.createdAt));

	const out: StoredMessage[] = [];
	for (const m of msgs) {
		let sources: SourceCard[] = [];
		let related: string[] = [];
		if (m.role === 'assistant') {
			const srcs = await db
				.select()
				.from(schema.sources)
				.where(eq(schema.sources.messageId, m.id))
				.orderBy(asc(schema.sources.n));
			sources = srcs.map((s) => ({
				n: s.n,
				url: s.url,
				title: s.title ?? s.domain ?? s.url,
				domain: s.domain ?? '',
				favicon: s.favicon ?? undefined,
				snippet: s.snippet ?? undefined
			}));
			const rel = await db
				.select({ question: schema.related.question })
				.from(schema.related)
				.where(eq(schema.related.messageId, m.id));
			related = rel.map((r) => r.question);
		}
		out.push({ id: m.id, role: m.role, content: m.content, sources, related });
	}
	return { id: t.id, title: t.title, messages: out };
}

export async function deleteThread(userId: string, id: string): Promise<void> {
	const [t] = await db
		.select({ id: schema.threads.id })
		.from(schema.threads)
		.where(and(eq(schema.threads.id, id), eq(schema.threads.userId, userId)));
	if (!t) return;

	const msgs = await db
		.select({ id: schema.messages.id })
		.from(schema.messages)
		.where(eq(schema.messages.threadId, id));
	for (const m of msgs) {
		await db.delete(schema.sources).where(eq(schema.sources.messageId, m.id));
		await db.delete(schema.related).where(eq(schema.related.messageId, m.id));
	}
	await db.delete(schema.messages).where(eq(schema.messages.threadId, id));
	await db.delete(schema.threads).where(eq(schema.threads.id, id));
}

export async function addUserMessage(threadId: string, content: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(schema.messages).values({
		id,
		threadId,
		role: 'user',
		content,
		connectionId: null,
		createdAt: new Date()
	});
	return id;
}

export async function addAssistantMessage(
	threadId: string,
	content: string,
	connectionId: string | null,
	sources: SourceCard[],
	related: string[]
): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(schema.messages).values({
		id,
		threadId,
		role: 'assistant',
		content,
		connectionId,
		createdAt: new Date()
	});
	if (sources.length) {
		await db.insert(schema.sources).values(
			sources.map((s) => ({
				id: crypto.randomUUID(),
				messageId: id,
				n: s.n,
				url: s.url,
				title: s.title,
				domain: s.domain,
				favicon: s.favicon ?? null,
				snippet: s.snippet ?? null
			}))
		);
	}
	if (related.length) {
		await db.insert(schema.related).values(
			related.map((q) => ({ id: crypto.randomUUID(), messageId: id, question: q }))
		);
	}
	return id;
}

/** Prior Q&A as bounded summaries for follow-up context. */
export async function buildHistory(threadId: string): Promise<string[]> {
	const msgs = await db
		.select({ role: schema.messages.role, content: schema.messages.content })
		.from(schema.messages)
		.where(eq(schema.messages.threadId, threadId))
		.orderBy(asc(schema.messages.createdAt));
	return msgs.map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.slice(0, 600)}`);
}
