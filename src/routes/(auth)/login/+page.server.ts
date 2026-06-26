import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import {
	verifyPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) return fail(400, { error: 'Email and password are required.' });

		const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
		// Constant-ish: still run a verify against the stored hash when the user exists.
		const ok = user ? await verifyPassword(user.passwordHash, password) : false;
		if (!user || !ok) return fail(400, { error: 'Incorrect email or password.' });

		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionCookie(cookies, token, session.expiresAt);

		redirect(302, '/');
	}
};
