/// <reference types="bun" />
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';

const env: Record<string, string | undefined> = {};
mock.module('$env/dynamic/private', () => ({ env }));
const { search } = await import('../src/lib/server/search');
const { parallelSearch } = await import('../src/lib/server/search/parallel');
const { askLoop, chatLoop } = await import('../src/lib/server/ask');

const endpoint = 'https://search.parallel.ai/mcp';
const pageUrl = 'https://example.com/research';
const pageText = 'A useful research source with enough readable content for extraction. '.repeat(8);
const requests: Request[] = [];
const calls: Array<Record<string, any>> = [];
let toolResult: Record<string, unknown>;
let sse = false;
let failStatus = 0;
let hangAt = '';
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;
let sourcePrompt = '';

function mockFetch(handler: (...args: Parameters<typeof fetch>) => Promise<Response>): typeof fetch {
	return Object.assign(handler, { preconnect: globalThis.fetch.preconnect });
}

function rpc(id: unknown, result: unknown) {
	const message = { jsonrpc: '2.0', id, result };
	return sse
		? new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, {
				headers: { 'Content-Type': 'text/event-stream' }
			})
		: Response.json(message);
}

beforeEach(() => {
	env.SEARCH_BACKEND = 'parallel';
	delete env.EXTRACT_BROWSER;
	delete env.SEARXNG_URL;
	requests.length = calls.length = 0;
	sse = false;
	failStatus = 0;
	hangAt = '';
	sourcePrompt = '';
	toolResult = {
		content: [],
		structuredContent: {
			results: [{ url: pageUrl, title: 'Research source', excerpts: ['First excerpt', 'Second excerpt'] }]
		}
	};
	fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(mockFetch(async (input, init) => {
		const request = new Request(input, init);
		requests.push(request);
		if (request.url === endpoint) {
			expect(request.headers.get('User-Agent')).toBe(
				'AnswerEngine/0.1 (+https://github.com/dalpat/answer-engine)'
			);
			expect(request.headers.has('Authorization')).toBe(false);
			expect(init?.signal).toBeTruthy();
			if (request.method === 'GET') return new Response(null, { status: 405 });
			const body = await request.json();
			calls.push(body);
			if (body.method === hangAt) {
				return new Promise<Response>((_, reject) => {
					const abort = () => reject(init?.signal?.reason);
					if (init?.signal?.aborted) abort();
					else init?.signal?.addEventListener('abort', abort, { once: true });
				});
			}
			if (failStatus) return new Response('Backend unavailable', { status: failStatus });
			if (body.method === 'initialize') {
				return rpc(body.id, {
					protocolVersion: body.params.protocolVersion,
					capabilities: { tools: {} },
					serverInfo: { name: 'fixture', version: '1' }
				});
			}
			if (body.method.startsWith('notifications/')) return new Response(null, { status: 202 });
			if (body.method === 'tools/call') return rpc(body.id, toolResult);
			throw new Error(`Unexpected MCP method: ${body.method}`);
		}
		if (request.url === pageUrl) {
			return new Response(`<title>Research source</title><article>${pageText}</article>`);
		}
		if (request.url === 'http://model.test/v1/chat/completions') {
			const body = await request.json();
			if (body.stream) {
				sourcePrompt = body.messages.at(-1).content;
				return new Response('data: {"choices":[{"delta":{"content":"Cited answer [1]."}}]}\n\ndata: [DONE]\n\n');
			}
			return Response.json({ choices: [{ message: { content: '' } }] });
		}
		if (request.url.startsWith('https://en.wikipedia.org/w/api.php')) {
			return Response.json({ query: { search: [] } });
		}
		if (request.url.startsWith('http://search.test/search?')) return Response.json({ results: [] });
		if (request.url.startsWith('https://html.duckduckgo.com/')) return new Response('');
		throw new Error(`Unexpected destination: ${request.url}`);
	}));
});

afterEach(() => fetchSpy.mockRestore());

test('the configured selector performs anonymous MCP search and maps ranked excerpts', async () => {
	expect(await search('current research sources')).toEqual([
		{ url: pageUrl, title: 'Research source', snippet: 'First excerpt\nSecond excerpt' }
	]);
	const call = calls.find((call) => call.method === 'tools/call');
	expect(call?.params.name).toBe('web_search');
	expect(call?.params.arguments).toMatchObject({
		objective: 'current research sources', search_queries: ['current research sources']
	});
	expect(call?.params.arguments.session_id).toMatch(/^[a-f0-9-]{36}$/);
	await search('related research sources');
	const sessions = calls.filter((call) => call.method === 'tools/call')
		.map((call) => call.params.arguments.session_id);
	expect(new Set(sessions).size).toBe(1);
});

test('Streamable HTTP accepts SSE and JSON text fallback with nullable fields', async () => {
	sse = true;
	toolResult = { content: [{ type: 'text', text: JSON.stringify({ results: [{ url: pageUrl, title: null }] }) }] };
	expect(await search('research sources')).toEqual([{ url: pageUrl, title: pageUrl, snippet: '' }]);
});

test('empty or absent results produce an empty source list', async () => {
	for (const structuredContent of [{ results: [] }, {}]) {
		toolResult = { content: [], structuredContent };
		expect(await search('nothing found')).toEqual([]);
	}
});

test('tool, HTTP, malformed and network failures surface with a backend label', async () => {
	toolResult = { isError: true, content: [{ type: 'text', text: 'Quota exceeded' }] };
	await expect(search('research sources')).rejects.toThrow('Parallel search: Quota exceeded');
	failStatus = 503;
	await expect(search('research sources')).rejects.toThrow(/Parallel search:.*503/);
	failStatus = 0;
	toolResult = { content: [], structuredContent: { results: 'bad data' } };
	await expect(search('research sources')).rejects.toThrow('Parallel search: Invalid search results');
	toolResult = { content: [], structuredContent: { results: [{ url: pageUrl, excerpts: [42] }] } };
	await expect(search('research sources')).rejects.toThrow('Parallel search: Invalid search result');
	fetchSpy.mockImplementation(mockFetch(async () => { throw new Error('Network unreachable'); }));
	await expect(search('research sources')).rejects.toThrow('Parallel search: Network unreachable');
});

test('cancellation and deadlines abort both handshake and tool HTTP requests', async () => {
	const timeout = AbortSignal.timeout.bind(AbortSignal);
	const timer = spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
		expect(milliseconds).toBe(15_000);
		return timeout(10);
	});
	try {
		for (const method of ['initialize', 'tools/call']) {
			hangAt = method;
			await expect(search('research sources')).rejects.toThrow(/Parallel search:/);
			const request = requests.findLast((request) => request.url === endpoint && request.method === 'POST');
			expect(request?.signal.aborted).toBe(true);
		}
	} finally {
		timer.mockRestore();
	}
	requests.length = 0;
	await expect(parallelSearch('research sources', AbortSignal.abort())).rejects.toThrow(/Parallel search:/);
	expect(requests).toHaveLength(0);
});

test('the ask loop extracts Parallel links and supplies numbered sources to synthesis', async () => {
	const events = [];
	for await (const event of askLoop({ query: 'research sources' }, {
		baseUrl: 'http://model.test', apiKey: 'fixture', model: 'fixture'
	})) events.push(event);
	expect(events.find((event) => event.type === 'sources')).toMatchObject({
		sources: [{ n: 1, url: pageUrl, title: 'Research source' }]
	});
	expect(sourcePrompt).toContain('[1] Research source');
	expect(sourcePrompt).toContain(pageText.trim());
	expect(events).toContainEqual({ type: 'token', text: 'Cited answer [1].' });
	expect(events.at(-1)?.type).toBe('done');
});

test('existing backend choices, unset and unknown defaults, and chat stay on their paths', async () => {
	env.SEARXNG_URL = 'http://search.test';
	for (const backend of ['wikipedia', 'duckduckgo', 'searxng', undefined, 'unknown']) {
		env.SEARCH_BACKEND = backend;
		await search('research sources');
	}
	expect(requests.some((request) => request.url === endpoint)).toBe(false);
	expect(requests.filter((request) => request.url.startsWith('http://search.test/'))).toHaveLength(3);
	env.SEARCH_BACKEND = 'parallel';
	requests.length = 0;
	for await (const _ of chatLoop([{ role: 'user', content: 'hello' }], {
		baseUrl: 'http://model.test', apiKey: 'fixture', model: 'fixture'
	})) { /* consume */ }
	expect(requests.every((request) => request.url.startsWith('http://model.test/'))).toBe(true);
});
