import type { AskEvent } from '$lib/events';

/** POST /api/ask and invoke `apply` for each typed SSE event. */
export async function streamAsk(
	body: Record<string, unknown>,
	apply: (ev: AskEvent) => void
): Promise<void> {
	const res = await fetch('/api/ask', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.body) throw new Error('no stream');
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const frames = buffer.split('\n\n');
		buffer = frames.pop() ?? '';
		for (const frame of frames) {
			const line = frame.split('\n').find((l) => l.startsWith('data:'));
			if (!line) continue;
			apply(JSON.parse(line.slice(5).trim()) as AskEvent);
		}
	}
}
