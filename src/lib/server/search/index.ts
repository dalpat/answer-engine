/**
 * Search seam — pluggable backend via SEARCH_BACKEND:
 *   'searxng'    (default) self-hosted metasearch — most complete, needs a running instance
 *   'wikipedia'  keyless, reliable, no service — Wikipedia-only
 *   'duckduckgo' keyless general web — may be rate-limited on some networks
 *   'parallel'  keyless general web via the hosted Parallel Search MCP
 * Isolates the backend so swapping is config, not a rewrite. See docs/spec.html §03/§05.
 */
import { env } from '$env/dynamic/private';
import { searxngSearch } from './searxng';
import { ddgSearch } from './duckduckgo';
import { wikipediaSearch } from './wikipedia';
import { parallelSearch } from './parallel';

export interface SearchResult {
	url: string;
	title: string;
	snippet: string;
}

/** Query the configured backend. Returns ranked links + snippets (no page content). */
export function search(query: string): Promise<SearchResult[]> {
	switch (env.SEARCH_BACKEND) {
		case 'parallel':
			return parallelSearch(query);
		case 'wikipedia':
			return wikipediaSearch(query);
		case 'duckduckgo':
			return ddgSearch(query);
		default:
			return searxngSearch(query);
	}
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
