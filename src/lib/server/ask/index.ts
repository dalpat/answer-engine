/**
 * The ask loop — rewrite → search → dedupe → extract → synthesize → related.
 * See docs/spec.html §04/§05. "Deep" agentic mode is a future branch here.
 *
 * Returns an async generator of typed AskEvents (docs/spec.html §06), so the
 * SSE endpoint is a thin pump and the frontend is a reducer over events.
 */
import type { AskEvent, SourceCard } from '$lib/events';
import { search, dedupe, type SearchResult } from '$lib/server/search';
import { extract } from '$lib/server/extract';
import { streamChat, complete, type LlmConnection } from '$lib/server/llm';

const MAX_QUERIES = 3;
const MAX_SOURCES = 8;

export interface AskInput {
	query: string;
	/** Prior Q&A summaries fed back on follow-ups (bounded token cost). */
	history?: string[];
}

export async function* askLoop(input: AskInput, conn: LlmConnection): AsyncGenerator<AskEvent> {
	const started = Date.now();
	try {
		// 1 — Understand: rewrite the question into focused search queries.
		yield { type: 'status', phase: 'understanding' };
		const queries = await rewrite(input, conn);
		yield { type: 'status', phase: 'searching', queries };

		// 2,3 — Search (parallel fan-out) + dedupe.
		const lists = await Promise.all(queries.map((q) => search(q).catch(() => [] as SearchResult[])));
		const links = dedupe(lists).slice(0, MAX_SOURCES);
		yield { type: 'status', phase: 'reading', count: links.length };

		// 4 — Extract page content concurrently.
		const pages = (await Promise.all(links.map((l) => extract(l.url)))).filter(
			(p): p is NonNullable<typeof p> => p !== null
		);
		const cards: SourceCard[] = pages.map((p, i) => ({
			n: i + 1,
			url: p.url,
			title: p.title,
			domain: p.domain,
			favicon: p.favicon
		}));
		yield { type: 'sources', sources: cards };

		// 5 — Synthesize a cited answer, streaming tokens.
		yield { type: 'status', phase: 'answering' };
		const prompt = buildPrompt(input, pages);
		let answer = '';
		for await (const tok of streamChat(conn, prompt)) {
			answer += tok;
			yield { type: 'token', text: tok };
		}

		// 6 — Suggested related questions.
		const questions = await relatedQuestions(input.query, answer, conn).catch(() => []);
		if (questions.length) yield { type: 'related', questions };

		yield { type: 'done', elapsedMs: Date.now() - started };
	} catch (err) {
		yield { type: 'error', message: err instanceof Error ? err.message : 'ask failed' };
	}
}

async function rewrite(input: AskInput, conn: LlmConnection): Promise<string[]> {
	const out = await complete(conn, [
		{
			role: 'system',
			content:
				`Rewrite the user's question into up to ${MAX_QUERIES} focused web-search queries. ` +
				`Return ONLY the queries, one per line, no numbering.`
		},
		{ role: 'user', content: input.query }
	]);
	const queries = out
		.split('\n')
		.map((q) => q.replace(/^[-*\d.\s]+/, '').trim())
		.filter(Boolean)
		.slice(0, MAX_QUERIES);
	return queries.length ? queries : [input.query];
}

function buildPrompt(input: AskInput, pages: { text: string }[]) {
	const sources = pages.map((p, i) => `[${i + 1}] ${p.text}`).join('\n\n');
	const history = input.history?.length ? `Prior context:\n${input.history.join('\n')}\n\n` : '';
	return [
		{
			role: 'system' as const,
			content:
				'You are a research assistant. Answer using ONLY the numbered sources. ' +
				'Cite claims inline with [n] matching the source numbers. Be concise and well-structured (markdown).'
		},
		{ role: 'user' as const, content: `${history}Question: ${input.query}\n\nSources:\n${sources}` }
	];
}

async function relatedQuestions(query: string, answer: string, conn: LlmConnection): Promise<string[]> {
	const out = await complete(conn, [
		{
			role: 'system',
			content: 'Suggest 3 short natural follow-up questions. Return ONLY the questions, one per line.'
		},
		{ role: 'user', content: `Question: ${query}\n\nAnswer: ${answer.slice(0, 1500)}` }
	]);
	return out
		.split('\n')
		.map((q) => q.replace(/^[-*\d.\s]+/, '').trim())
		.filter(Boolean)
		.slice(0, 3);
}

/**
 * First-run DEMO path: emits the full event sequence with mock data so the live
 * stepper is visible before any BYOK connection is configured. Remove once
 * connection management UI lands.
 */
export async function* demoAsk(query: string): AsyncGenerator<AskEvent> {
	const started = Date.now();
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	yield { type: 'status', phase: 'understanding' };
	await sleep(500);
	yield { type: 'status', phase: 'searching', queries: [query, `${query} 2026`, `${query} comparison`] };
	await sleep(500);
	yield { type: 'status', phase: 'reading', count: 3 };
	await sleep(400);
	yield {
		type: 'sources',
		sources: [
			{ n: 1, url: 'https://example.com/a', title: 'Overview', domain: 'example.com' },
			{ n: 2, url: 'https://example.org/b', title: 'Comparison', domain: 'example.org' },
			{ n: 3, url: 'https://example.net/c', title: 'Deep dive', domain: 'example.net' }
		]
	};
	await sleep(300);
	yield { type: 'status', phase: 'answering' };
	const demo = `This is a **demo** answer for "${query}". Configure a BYOK connection in settings to get real, cited results [1]. The live stepper, source cards, and inline citations [2][3] are all wired to the typed event stream.`;
	for (const word of demo.split(' ')) {
		yield { type: 'token', text: word + ' ' };
		await sleep(40);
	}
	yield { type: 'related', questions: ['How do I add a connection?', 'Which models are supported?', 'How does search work?'] };
	yield { type: 'done', elapsedMs: Date.now() - started };
}
