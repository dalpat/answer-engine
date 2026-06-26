/**
 * Wikipedia backend — keyless, reliable, no extra service. Uses the MediaWiki
 * search API. Limited to Wikipedia content, but works anywhere with internet
 * (good when SearXNG isn't running and DuckDuckGo is rate-limited).
 */
import type { SearchResult } from './index';

export async function wikipediaSearch(query: string): Promise<SearchResult[]> {
	const api = new URL('https://en.wikipedia.org/w/api.php');
	api.searchParams.set('action', 'query');
	api.searchParams.set('list', 'search');
	api.searchParams.set('srsearch', query);
	api.searchParams.set('srlimit', '5');
	api.searchParams.set('format', 'json');
	api.searchParams.set('origin', '*');

	const res = await fetch(api, { headers: { 'User-Agent': 'AnswerEngine/0.1 (+self-hosted)' } });
	if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
	const data = (await res.json()) as {
		query?: { search?: Array<{ title: string; snippet: string }> };
	};
	return (data.query?.search ?? []).map((s) => ({
		url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, '_'))}`,
		title: s.title,
		snippet: (s.snippet ?? '').replace(/<[^>]+>/g, '')
	}));
}
