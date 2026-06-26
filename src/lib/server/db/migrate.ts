/**
 * Apply pending migrations on server start (idempotent, runs once).
 * Lets `docker compose up` create the schema on a fresh volume with no
 * manual step. Migrations live in ./drizzle (relative to cwd).
 */
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';

let done: Promise<void> | null = null;

export function runMigrations(): Promise<void> {
	if (!done) {
		done = migrate(db, { migrationsFolder: './drizzle' }).catch((err) => {
			console.error('[migrate] failed:', err);
		});
	}
	return done;
}
