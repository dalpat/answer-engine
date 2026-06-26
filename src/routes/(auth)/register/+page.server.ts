import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import {
	hashPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import type { Actions } from './$types';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!EMAIL_RE.test(email)) return fail(400, { error: 'Enter a valid email address.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });

		const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
		if (existing) return fail(400, { error: 'An account with that email already exists.' });

		const id = crypto.randomUUID();
		await db.insert(schema.users).values({
			id,
			email,
			passwordHash: await hashPassword(password),
			createdAt: new Date()
		});

		const token = generateSessionToken();
		const session = await createSession(token, id);
		setSessionCookie(cookies, token, session.expiresAt);

		redirect(302, '/');
	}
};
