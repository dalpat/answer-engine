/**
 * Search seam — today SearXNG (self-hosted metasearch). Isolates the backend
 * so swapping is config, not a rewrite. See docs/spec.html §03/§05.
 */
import { env } from '$env/dynamic/private';

export interface SearchResult {
	url: string;
	title: string;
	snippet: string;
}

/** Query SearXNG's JSON API. Returns ranked links + snippets (no page content). */
export async function search(query: string): Promise<SearchResult[]> {
	const base = env.SEARXNG_URL ?? 'http://localhost:8080';
	const url = new URL('/search', base);
	url.searchParams.set('q', query);
	url.searchParams.set('format', 'json');

	const res = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`SearXNG ${res.status}`);
	const data = (await res.json()) as { results?: Array<{ url: string; title: string; content: string }> };

	return (data.results ?? []).map((r) => ({
		url: r.url,
		title: r.title,
		snippet: r.content ?? ''
	}));
}

/** Merge + dedupe results from parallel fan-out queries, preserving best rank. */
export function dedupe(lists: SearchResult[][]): SearchResult[] {
	const seen = new Map<string, SearchResult>();
	for (const list of lists) {
		for (const r of list) {
			if (!seen.has(r.url)) seen.set(r.url, r);
		}
	}
	return [...seen.values()];
}
