import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getThread, deleteThread } from '$lib/server/threads';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	const thread = await getThread(locals.user.id, params.id);
	if (!thread) return new Response('not found', { status: 404 });
	return json(thread);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	await deleteThread(locals.user.id, params.id);
	return new Response(null, { status: 204 });
};
