/**
 * POST /api/ask — streams the ask pipeline as SSE and persists the turn.
 * See docs/spec.html §04/§06.
 *
 * Requires a threadId (the client creates the thread first). Persists the user
 * message up front, then the assistant message + sources + related on completion.
 * With a connectionId it runs the real askLoop against the user's BYOK model;
 * without one it runs the demo generator.
 */
import type { RequestHandler } from './$types';
import { askLoop, demoAsk } from '$lib/server/ask';
import { resolveConnection } from '$lib/server/connections';
import { getThread, addUserMessage, addAssistantMessage, buildHistory } from '$lib/server/threads';
import { encodeEvent, type AskEvent, type SourceCard } from '$lib/events';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });

	const body = (await request.json()) as {
		query?: string;
		threadId?: string;
		connectionId?: string;
		model?: string;
		deep?: boolean;
	};
	const query = body.query?.trim();
	if (!query) return new Response('query required', { status: 400 });
	if (!body.threadId) return new Response('threadId required', { status: 400 });

	const thread = await getThread(locals.user.id, body.threadId);
	if (!thread) return new Response('thread not found', { status: 404 });

	// Prior context (before this turn), then record the new question.
	const history = await buildHistory(thread.id);
	await addUserMessage(thread.id, query);

	let events: AsyncGenerator<AskEvent>;
	let connectionId: string | null = null;
	if (body.connectionId) {
		const conn = await resolveConnection(locals.user.id, body.connectionId);
		if (!conn) return new Response('connection not found', { status: 404 });
		const model = body.model || conn.defaultModel;
		if (!model) return new Response('no model selected', { status: 400 });
		connectionId = body.connectionId;
		events = askLoop(
			{ query, history, deep: body.deep },
			{ baseUrl: conn.baseUrl, apiKey: conn.apiKey, model }
		);
	} else {
		events = demoAsk(query);
	}

	const collected = { answer: '', sources: [] as SourceCard[], related: [] as string[] };

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			const emit = (ev: AskEvent) => controller.enqueue(encoder.encode(encodeEvent(ev)));
			try {
				for await (const ev of events) {
					if (ev.type === 'token') collected.answer += ev.text;
					else if (ev.type === 'sources') collected.sources = ev.sources;
					else if (ev.type === 'related') collected.related = ev.questions;
					emit(ev);
				}
			} catch (err) {
				emit({ type: 'error', message: err instanceof Error ? err.message : 'stream failed' });
			} finally {
				// Persist whatever we produced (demo or real) so the thread is durable.
				if (collected.answer) {
					await addAssistantMessage(
						thread.id,
						collected.answer,
						connectionId,
						collected.sources,
						collected.related
					).catch(() => {});
				}
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
