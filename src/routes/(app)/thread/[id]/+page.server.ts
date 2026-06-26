import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getThread } from '$lib/server/threads';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	const thread = await getThread(locals.user.id, params.id);
	if (!thread) error(404, 'Thread not found');
	return { thread };
};
