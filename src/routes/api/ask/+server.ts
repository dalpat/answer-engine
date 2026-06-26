/**
 * POST /api/ask — streams the ask pipeline as Server-Sent Events.
 * See docs/spec.html §04/§06. The endpoint is a thin pump over askLoop().
 *
 * Until BYOK connection management lands, this runs the demo generator so the
 * live-progress UX is visible on first run.
 */
import type { RequestHandler } from './$types';
import { demoAsk } from '$lib/server/ask';
import { encodeEvent, type AskEvent } from '$lib/events';

export const POST: RequestHandler = async ({ request }) => {
	const { query } = (await request.json()) as { query?: string };
	if (!query?.trim()) {
		return new Response('query required', { status: 400 });
	}

	// TODO: resolve the user's active connection, decrypt its key, and call
	//   askLoop({ query }, conn)  instead of demoAsk(query).
	const events: AsyncGenerator<AskEvent> = demoAsk(query.trim());

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
