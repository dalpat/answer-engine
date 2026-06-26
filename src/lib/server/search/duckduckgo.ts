/**
 * Keyless DuckDuckGo backend — no API key, no separate service. Parses the
 * html.duckduckgo.com results page. Good for solo/local use; may be rate-limited
 * from datacenter IPs (SearXNG is the more robust default).
 */
import type { SearchResult } from './index';

const UA =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function ddgSearch(query: string): Promise<SearchResult[]> {
	const res = await fetch('https://html.duckduckgo.com/html/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
		body: new URLSearchParams({ q: query })
	});
	if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
	return parseDdg(await res.text()).slice(0, 12);
}

/** Exported for testing — pure parse of DDG html results. */
export function parseDdg(html: string): SearchResult[] {
	const links = [
		...html.matchAll(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)
	];
	const snippets = [
		...html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)
	];
	return links
		.map((m, i) => ({
			url: cleanUrl(m[1]),
			title: stripTags(m[2]),
			snippet: snippets[i] ? stripTags(snippets[i][1]) : ''
		}))
		.filter((r) => r.url.startsWith('http'));
}

function cleanUrl(href: string): string {
	// DDG wraps results in //duckduckgo.com/l/?uddg=<encoded real url>
	if (href.includes('uddg=')) {
		const q = href.split('?')[1] ?? '';
		const real = new URLSearchParams(q).get('uddg');
		if (real) return decodeURIComponent(real);
	}
	if (href.startsWith('//')) return 'https:' + href;
	return href;
}

function stripTags(s: string): string {
	return s
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}
