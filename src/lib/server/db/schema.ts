/**
 * Data model — see docs/spec.html §10.
 * Portable types only (no SQLite-absent uuid/jsonb) so the Postgres swap is
 * just a driver + connection-string change.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

/** BYOK connections — one OpenAI-compatible backend each. Key stored encrypted. */
export const connections = sqliteTable('connections', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	name: text('name').notNull(),
	baseUrl: text('base_url').notNull(),
	keyEncrypted: text('key_encrypted').notNull(), // AES-256-GCM, see crypto.ts
	defaultModel: text('default_model'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const threads = sqliteTable('threads', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey(),
	threadId: text('thread_id')
		.notNull()
		.references(() => threads.id),
	role: text('role', { enum: ['user', 'assistant'] }).notNull(),
	content: text('content').notNull(),
	connectionId: text('connection_id').references(() => connections.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

/** Cited sources attached to an assistant message; `n` is the [n] citation number. */
export const sources = sqliteTable('sources', {
	id: text('id').primaryKey(),
	messageId: text('message_id')
		.notNull()
		.references(() => messages.id),
	n: integer('n').notNull(),
	url: text('url').notNull(),
	title: text('title'),
	domain: text('domain'),
	favicon: text('favicon'),
	snippet: text('snippet')
});

/** Suggested follow-up questions surfaced under an assistant message. */
export const related = sqliteTable('related', {
	id: text('id').primaryKey(),
	messageId: text('message_id')
		.notNull()
		.references(() => messages.id),
	question: text('question').notNull()
});
