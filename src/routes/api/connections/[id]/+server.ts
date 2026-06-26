import type { RequestHandler } from './$types';
import { deleteConnection } from '$lib/server/connections';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return new Response('unauthorized', { status: 401 });
	await deleteConnection(locals.user.id, params.id);
	return new Response(null, { status: 204 });
};
