/**
 * Own-your-code auth — the Lucia pattern (docs/spec.html §09).
 * Vetted primitives, ~one file, fully in our repo:
 *   - argon2id password hashing (@node-rs/argon2)
 *   - opaque session tokens; only the SHA-256 hash is stored as the session id
 *   - 30-day sessions with sliding refresh
 */
import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import type { Cookies } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';

const DAY = 1000 * 60 * 60 * 24;
const SESSION_TTL = 30 * DAY;
const REFRESH_WINDOW = 15 * DAY;

export const SESSION_COOKIE = 'session';

// --- passwords ---

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
	return hash(password, ARGON_OPTS);
}
export function verifyPassword(stored: string, password: string): Promise<boolean> {
	return verify(stored, password, ARGON_OPTS);
}

// --- sessions ---

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function generateSessionToken(): string {
	return randomBytes(24).toString('base64url');
}

export async function createSession(token: string, userId: string) {
	const id = sha256(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(schema.sessions).values({ id, userId, expiresAt });
	return { id, userId, expiresAt };
}

export async function validateSessionToken(token: string) {
	const id = sha256(token);
	const [row] = await db
		.select({ session: schema.sessions, user: schema.users })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.where(eq(schema.sessions.id, id));

	if (!row) return { session: null, user: null };

	const { session, user } = row;
	const now = Date.now();

	if (now >= session.expiresAt.getTime()) {
		await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
		return { session: null, user: null };
	}

	// Sliding refresh: extend when inside the refresh window.
	if (now >= session.expiresAt.getTime() - REFRESH_WINDOW) {
		session.expiresAt = new Date(now + SESSION_TTL);
		await db
			.update(schema.sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(schema.sessions.id, id));
	}

	return {
		session: { id: session.id, expiresAt: session.expiresAt },
		user: { id: user.id, email: user.email }
	};
}

export async function invalidateSession(id: string) {
	await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
}

// --- cookie helpers ---

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		secure: process.env.NODE_ENV === 'production'
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
