import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listConnections, createConnection } from '$lib/server/connections';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	return json(await listConnections(locals.user.id));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	const body = await request.json().catch(() => ({}));
	const name = String(body.name ?? '').trim();
	const baseUrl = String(body.baseUrl ?? '').trim();
	const apiKey = String(body.apiKey ?? '');
	const defaultModel = String(body.defaultModel ?? '').trim();

	if (!name || !baseUrl || !apiKey || !defaultModel) {
		return json({ error: 'name, baseUrl, apiKey and defaultModel are required' }, { status: 400 });
	}
	const conn = await createConnection(locals.user.id, { name, baseUrl, apiKey, defaultModel });
	return json(conn, { status: 201 });
};
