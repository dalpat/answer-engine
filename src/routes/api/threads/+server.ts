import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listThreads, createThread } from '$lib/server/threads';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	return json(await listThreads(locals.user.id));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	const body = await request.json().catch(() => ({}));
	const title = String(body.title ?? '').trim();
	const thread = await createThread(locals.user.id, title);
	return json(thread, { status: 201 });
};
