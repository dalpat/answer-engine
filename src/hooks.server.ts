import type { Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	deleteSessionCookie
} from '$lib/server/auth';
import { runMigrations } from '$lib/server/db/migrate';

// Ensure the schema exists before serving (idempotent, once per server start).
await runMigrations();

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSessionToken(token);
	if (session) {
		setSessionCookie(event.cookies, token, session.expiresAt); // keep cookie in sync with refresh
	} else {
		deleteSessionCookie(event.cookies);
	}
	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};
