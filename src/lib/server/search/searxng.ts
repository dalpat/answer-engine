/** SearXNG backend — self-hosted metasearch JSON API. */
import { env } from '$env/dynamic/private';
import type { SearchResult } from './index';

export async function searxngSearch(query: string): Promise<SearchResult[]> {
	const base = env.SEARXNG_URL ?? 'http://localhost:8080';
	const url = new URL('/search', base);
	url.searchParams.set('q', query);
	url.searchParams.set('format', 'json');

	const res = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`SearXNG ${res.status}`);
	const data = (await res.json()) as {
		results?: Array<{ url: string; title: string; content: string }>;
	};
	return (data.results ?? []).map((r) => ({
		url: r.url,
		title: r.title,
		snippet: r.content ?? ''
	}));
}
