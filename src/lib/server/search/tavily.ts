/**
 * Tavily backend — API-based web search designed for LLMs. Requires a
 * TAVILY_API_KEY (free tier: 1 000 credits/month). Set SEARCH_BACKEND=tavily.
 */
import { env } from '$env/dynamic/private';
import { tavily } from '@tavily/core';
import type { SearchResult } from './index';

export async function tavilySearch(query: string): Promise<SearchResult[]> {
	const client = tavily({ apiKey: env.TAVILY_API_KEY });
	const response = await client.search(query, { maxResults: 5 });
	return response.results.map((r: { url: string; title: string; content: string }) => ({
		url: r.url,
		title: r.title,
		snippet: r.content
	}));
}
