import { redirect } from '@sveltejs/kit';
import { invalidateSession, deleteSessionCookie } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) await invalidateSession(locals.session.id);
	deleteSessionCookie(cookies);
	redirect(302, '/login');
};
