/**
 * Optional headless-browser fallback for JS-heavy pages (docs/spec.html §04).
 * Playwright is NOT a dependency — this module is only imported when
 * EXTRACT_BROWSER=1 AND `playwright` is installed. The @vite-ignore keeps the
 * bundler from trying to resolve it at build time.
 */

let browserP: Promise<{ newPage: () => Promise<BrowserPage> }> | null = null;

interface BrowserPage {
	goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>;
	evaluate(fn: () => string): Promise<string>;
	close(): Promise<void>;
}

async function getBrowser() {
	if (!browserP) {
		browserP = (async () => {
			// Variable specifier: TS won't resolve the (optional) module, Vite ignores it.
			const mod = 'playwright';
			const pw = (await import(/* @vite-ignore */ mod)) as {
				chromium: { launch(o: { headless: boolean }): Promise<{ newPage: () => Promise<BrowserPage> }> };
			};
			return pw.chromium.launch({ headless: true });
		})();
	}
	return browserP;
}

export async function renderAndExtract(url: string): Promise<string> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
		return await page.evaluate(() => document.body?.innerText ?? '');
	} finally {
		await page.close();
	}
}
