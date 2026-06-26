import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Already signed in? Skip the auth screens. */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};
