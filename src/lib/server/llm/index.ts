/**
 * BYOK LLM client — any OpenAI-compatible endpoint. See docs/spec.html §08.
 * - listModels(): powers the auto-loaded model dropdown (GET /v1/models)
 * - streamChat(): streams synthesis tokens (POST /v1/chat/completions, SSE)
 */

export interface LlmConnection {
	baseUrl: string;
	apiKey: string; // already-decrypted at the call site
	model: string;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

function base(url: string): string {
	return url.replace(/\/+$/, '');
}

/** Auto-load available models for the connection settings dropdown. */
export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
	const res = await fetch(`${base(baseUrl)}/v1/models`, {
		headers: { Authorization: `Bearer ${apiKey}` }
	});
	if (!res.ok) throw new Error(`listModels ${res.status}`);
	const data = (await res.json()) as { data?: Array<{ id: string }> };
	return (data.data ?? []).map((m) => m.id).sort();
}

/** Cheap "Test connection" probe used on save. */
export async function testConnection(baseUrl: string, apiKey: string): Promise<boolean> {
	try {
		await listModels(baseUrl, apiKey);
		return true;
	} catch {
		return false;
	}
}

/** Non-streaming completion — used for the cheap rewrite + related-questions calls. */
export async function complete(conn: LlmConnection, messages: ChatMessage[]): Promise<string> {
	const res = await fetch(`${base(conn.baseUrl)}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${conn.apiKey}`
		},
		body: JSON.stringify({ model: conn.model, messages, temperature: 0 })
	});
	if (!res.ok) throw new Error(`complete ${res.status}`);
	const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
	return data.choices?.[0]?.message?.content ?? '';
}

/** Stream chat completion tokens. Yields text deltas as they arrive. */
export async function* streamChat(
	conn: LlmConnection,
	messages: ChatMessage[],
	opts: { temperature?: number } = {}
): AsyncGenerator<string> {
	const res = await fetch(`${base(conn.baseUrl)}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${conn.apiKey}`
		},
		body: JSON.stringify({
			model: conn.model,
			messages,
			temperature: opts.temperature ?? 0.3,
			stream: true
		})
	});
	if (!res.ok || !res.body) throw new Error(`streamChat ${res.status}`);

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data:')) continue;
			const payload = trimmed.slice(5).trim();
			if (payload === '[DONE]') return;
			try {
				const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
				if (delta) yield delta as string;
			} catch {
				// ignore keep-alives / partial frames
			}
		}
	}
}
