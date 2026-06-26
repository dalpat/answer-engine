/**
 * BYOK connection store — CRUD over the `connections` table with key
 * encryption. Keys never leave the server in plaintext. See docs/spec.html §08.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { encryptSecret, decryptSecret } from '$lib/server/crypto';

/** Safe shape returned to the client — never includes the key. */
export interface PublicConnection {
	id: string;
	name: string;
	baseUrl: string;
	defaultModel: string | null;
}

export interface NewConnection {
	name: string;
	baseUrl: string;
	apiKey: string;
	defaultModel: string;
}

export async function listConnections(userId: string): Promise<PublicConnection[]> {
	return db
		.select({
			id: schema.connections.id,
			name: schema.connections.name,
			baseUrl: schema.connections.baseUrl,
			defaultModel: schema.connections.defaultModel
		})
		.from(schema.connections)
		.where(eq(schema.connections.userId, userId));
}

export async function createConnection(
	userId: string,
	input: NewConnection
): Promise<PublicConnection> {
	const id = crypto.randomUUID();
	await db.insert(schema.connections).values({
		id,
		userId,
		name: input.name,
		baseUrl: input.baseUrl.replace(/\/+$/, ''),
		keyEncrypted: await encryptSecret(input.apiKey),
		defaultModel: input.defaultModel,
		createdAt: new Date()
	});
	return { id, name: input.name, baseUrl: input.baseUrl, defaultModel: input.defaultModel };
}

export async function deleteConnection(userId: string, id: string): Promise<void> {
	await db
		.delete(schema.connections)
		.where(and(eq(schema.connections.id, id), eq(schema.connections.userId, userId)));
}

/** Resolve to a usable LLM connection with the decrypted key. Null if not owned. */
export async function resolveConnection(userId: string, id: string) {
	const [row] = await db
		.select()
		.from(schema.connections)
		.where(and(eq(schema.connections.id, id), eq(schema.connections.userId, userId)));
	if (!row) return null;
	return {
		baseUrl: row.baseUrl,
		apiKey: await decryptSecret(row.keyEncrypted),
		defaultModel: row.defaultModel
	};
}
