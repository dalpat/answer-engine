/**
 * In-memory session state shared across the shell (sidebar ↔ page).
 * Reflects the current browser session's threads. Replaced by real
 * persisted threads (Drizzle) once auth + thread storage land.
 */

export interface ThreadStub {
	id: string;
	title: string;
}

export const session = $state<{ threads: ThreadStub[]; activeId: string | null }>({
	threads: [],
	activeId: null
});

export function startThread(title: string): string {
	const id = crypto.randomUUID();
	session.threads.unshift({ id, title });
	session.activeId = id;
	return id;
}

export function selectThread(id: string) {
	session.activeId = id;
}

export function removeThread(id: string) {
	session.threads = session.threads.filter((t) => t.id !== id);
	if (session.activeId === id) session.activeId = null;
}

export function newThread() {
	session.activeId = null;
}
