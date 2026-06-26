/**
 * POST /api/ask — streams the ask pipeline as Server-Sent Events.
 * See docs/spec.html §04/§06. The endpoint is a thin pump over askLoop().
 *
 * With a connectionId: runs the real pipeline against the user's BYOK model.
 * Without one: runs the demo generator so the live-progress UX is visible
 * before any connection is configured.
 */
import type { RequestHandler } from './$types';
import { askLoop, demoAsk } from '$lib/server/ask';
import { resolveConnection } from '$lib/server/connections';
import { encodeEvent, type AskEvent } from '$lib/events';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });

	const body = (await request.json()) as { query?: string; connectionId?: string; model?: string };
	const query = body.query?.trim();
	if (!query) return new Response('query required', { status: 400 });

	let events: AsyncGenerator<AskEvent>;
	if (body.connectionId) {
		const conn = await resolveConnection(locals.user.id, body.connectionId);
		if (!conn) return new Response('connection not found', { status: 404 });
		const model = body.model || conn.defaultModel;
		if (!model) return new Response('no model selected', { status: 400 });
		events = askLoop({ query }, { baseUrl: conn.baseUrl, apiKey: conn.apiKey, model });
	} else {
		events = demoAsk(query);
	}

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const ev of events) {
					controller.enqueue(encoder.encode(encodeEvent(ev)));
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : 'stream failed';
				controller.enqueue(encoder.encode(encodeEvent({ type: 'error', message })));
			} finally {
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
