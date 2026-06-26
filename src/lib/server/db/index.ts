/**
 * Drizzle client over libSQL (SQLite-compatible).
 * Swap DATABASE_URL to a remote/postgres target later — see docs/spec.html §10.
 */
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = createClient({ url: env.DATABASE_URL ?? 'file:./data/app.db' });

export const db = drizzle(client, { schema });
export { schema };
