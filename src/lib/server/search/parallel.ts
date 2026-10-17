/** Optional anonymous Parallel Search MCP backend (Streamable HTTP). */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { SearchResult } from './index';

const ENDPOINT = 'https://search.parallel.ai/mcp';
const USER_AGENT = 'AnswerEngine/0.1 (+https://github.com/dalpat/answer-engine)';
const TIMEOUT_MS = 15_000;
// Share the anonymous session across fan-out queries and follow-ups in this process.
const sessionId = crypto.randomUUID();

export async function parallelSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
	const deadline = AbortSignal.timeout(TIMEOUT_MS);
	const abort = signal ? AbortSignal.any([signal, deadline]) : deadline;
	const client = new Client({ name: 'answer-engine', version: '0.0.1' });
	const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
		requestInit: { headers: { 'User-Agent': USER_AGENT } },
		// Bound the handshake and HTTP response bodies as well as the tool request.
		fetch: (url, init) =>
			fetch(url, {
				...init,
				signal: init?.signal ? AbortSignal.any([abort, init.signal]) : abort
			})
	});
	try {
		abort.throwIfAborted();
		await client.connect(transport, { signal: abort, timeout: TIMEOUT_MS });
		const response = CallToolResultSchema.parse(await client.callTool(
			{
				name: 'web_search',
				arguments: { objective: query, search_queries: [query], session_id: sessionId }
			},
			undefined,
			{ signal: abort, timeout: TIMEOUT_MS }
		));
		if (response.isError) {
			const text = response.content.find((item) => item.type === 'text');
			throw new Error(text?.type === 'text' ? text.text : 'MCP tool failed');
		}
		const text = response.content.find((item) => item.type === 'text');
		const data = response.structuredContent ??
			(text?.type === 'text' ? JSON.parse(text.text) : null);
		if (!data || typeof data !== 'object') throw new Error('Invalid search response');
		const results = (data as { results?: unknown }).results ?? [];
		if (!Array.isArray(results)) throw new Error('Invalid search results');
		return results.map((result): SearchResult => {
			if (!result || typeof result.url !== 'string' ||
				(result.title != null && typeof result.title !== 'string') ||
				(result.excerpts != null && (!Array.isArray(result.excerpts) ||
					!result.excerpts.every((excerpt: unknown) => typeof excerpt === 'string')))) {
				throw new Error('Invalid search result');
			}
			return {
				url: result.url,
				title: result.title ?? result.url,
				snippet: (result.excerpts ?? []).join('\n')
			};
		});
	} catch (error) {
		const message = error instanceof StreamableHTTPError
			? `HTTP ${error.code}: ${error.message}`
			: error instanceof Error ? error.message : 'request failed';
		throw new Error(`Parallel search: ${message}`, {
			cause: error
		});
	} finally {
		await client.close();
	}
}
