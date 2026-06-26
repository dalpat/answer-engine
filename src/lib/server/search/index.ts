/**
 * Search seam — pluggable backend. Default SearXNG (self-hosted metasearch);
 * set SEARCH_BACKEND=duckduckgo for a keyless, no-extra-service option.
 * Isolates the backend so swapping is config, not a rewrite. See docs/spec.html §03/§05.
 */
import { env } from '$env/dynamic/private';
import { searxngSearch } from './searxng';
import { ddgSearch } from './duckduckgo';

export interface SearchResult {
	url: string;
	title: string;
	snippet: string;
}

/** Query the configured backend. Returns ranked links + snippets (no page content). */
export function search(query: string): Promise<SearchResult[]> {
	return (env.SEARCH_BACKEND ?? 'searxng') === 'duckduckgo'
		? ddgSearch(query)
		: searxngSearch(query);
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
