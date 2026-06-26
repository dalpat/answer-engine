import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listModels } from '$lib/server/llm';

/** Probe an OpenAI-compatible endpoint for its model list (pre-save, no DB write). */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	const body = await request.json().catch(() => ({}));
	const baseUrl = String(body.baseUrl ?? '').trim();
	const apiKey = String(body.apiKey ?? '');
	if (!baseUrl || !apiKey) return json({ error: 'baseUrl and apiKey are required' }, { status: 400 });

	try {
		const models = await listModels(baseUrl, apiKey);
		if (!models.length) return json({ error: 'Endpoint returned no models' }, { status: 400 });
		return json({ models });
	} catch {
		return json({ error: 'Could not reach the endpoint or list its models' }, { status: 400 });
	}
};
