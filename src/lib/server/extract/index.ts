/**
 * Extraction seam — turn a URL into clean readable text.
 * Today: readability-first (lightweight HTTP fetch + heuristic extraction).
 * Later: drop in a Playwright fallback HERE when text is too short — the
 * call sites never change. See docs/spec.html §03/§04.
 */

export interface ExtractedPage {
	url: string;
	title: string;
	domain: string;
	favicon: string;
	text: string;
}

const FETCH_TIMEOUT_MS = 8000;
const MIN_USEFUL_CHARS = 200;

export async function extract(url: string): Promise<ExtractedPage | null> {
	try {
		const html = await fetchHtml(url);
		const text = readability(html);
		if (text.length < MIN_USEFUL_CHARS) {
			// TODO(later): Playwright fallback render for JS-heavy pages.
			return null;
		}
		const domain = new URL(url).hostname.replace(/^www\./, '');
		return {
			url,
			title: pickTitle(html) || domain,
			domain,
			favicon: `https://${domain}/favicon.ico`,
			text: text.slice(0, 8000)
		};
	} catch {
		return null;
	}
}

async function fetchHtml(url: string): Promise<string> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: { 'User-Agent': 'AnswerEngine/0.1 (+self-hosted)' }
		});
		return await res.text();
	} finally {
		clearTimeout(t);
	}
}

function pickTitle(html: string): string {
	return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
}

/**
 * Minimal readability pass: strip non-content tags, take text from block
 * elements. Good enough for server-rendered articles/docs (~90% of results).
 * Swap for Mozilla-Readability/Trafilatura-grade extraction when needed.
 */
function readability(html: string): string {
	const stripped = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
		.replace(/<header[\s\S]*?<\/header>/gi, ' ')
		.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
	const main = stripped.match(/<(?:article|main)[\s\S]*?<\/(?:article|main)>/i)?.[0] ?? stripped;
	return main
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
