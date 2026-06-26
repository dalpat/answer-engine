import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Everything under (app) requires a session. Exposes the user to all pages. */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { user: locals.user };
};
