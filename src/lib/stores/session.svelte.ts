/**
 * Server-backed thread list for the sidebar, plus a tiny handoff for the
 * pending first question when creating a thread from the home composer.
 */

export interface ThreadSummary {
	id: string;
	title: string;
}

export const session = $state<{ threads: ThreadSummary[]; loaded: boolean }>({
	threads: [],
	loaded: false
});

export async function loadThreads() {
	const res = await fetch('/api/threads');
	if (!res.ok) return;
	session.threads = (await res.json()) as ThreadSummary[];
	session.loaded = true;
}

export function addThreadLocal(t: ThreadSummary) {
	session.threads = [t, ...session.threads.filter((x) => x.id !== t.id)];
}

export async function createThread(title: string): Promise<ThreadSummary> {
	const res = await fetch('/api/threads', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title })
	});
	const t = (await res.json()) as ThreadSummary;
	addThreadLocal(t);
	return t;
}

export async function removeThread(id: string) {
	await fetch(`/api/threads/${id}`, { method: 'DELETE' });
	session.threads = session.threads.filter((t) => t.id !== id);
}

/** Handoff: the home composer stashes the first question; the thread page takes it. */
export const pending = $state<{ threadId: string | null; question: string | null; deep: boolean }>({
	threadId: null,
	question: null,
	deep: false
});

export function setPending(threadId: string, question: string, deep: boolean) {
	pending.threadId = threadId;
	pending.question = question;
	pending.deep = deep;
}

export function takePending(threadId: string): { question: string; deep: boolean } | null {
	if (pending.threadId !== threadId || pending.question === null) return null;
	const result = { question: pending.question, deep: pending.deep };
	pending.threadId = null;
	pending.question = null;
	pending.deep = false;
	return result;
}
