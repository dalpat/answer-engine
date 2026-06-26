/**
 * Client store for BYOK connections + the active model selection.
 * The active selection (connectionId + model) is what /api/ask uses, and is
 * persisted to localStorage so it survives reloads.
 */

export interface PublicConnection {
	id: string;
	name: string;
	baseUrl: string;
	defaultModel: string | null;
}

export interface ActiveModel {
	connectionId: string;
	name: string;
	model: string;
}

const ACTIVE_KEY = 'ae:active-model';

function loadActive(): ActiveModel | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(ACTIVE_KEY);
		return raw ? (JSON.parse(raw) as ActiveModel) : null;
	} catch {
		return null;
	}
}

function persistActive(a: ActiveModel | null) {
	if (typeof localStorage === 'undefined') return;
	if (a) localStorage.setItem(ACTIVE_KEY, JSON.stringify(a));
	else localStorage.removeItem(ACTIVE_KEY);
}

export const conns = $state<{
	list: PublicConnection[];
	loaded: boolean;
	active: ActiveModel | null;
}>({ list: [], loaded: false, active: loadActive() });

export async function loadConnections() {
	const res = await fetch('/api/connections');
	if (!res.ok) return;
	conns.list = (await res.json()) as PublicConnection[];
	conns.loaded = true;
	reconcileActive();
}

/** Drop / default the active selection based on what actually exists. */
function reconcileActive() {
	if (conns.active && !conns.list.some((c) => c.id === conns.active!.connectionId)) {
		setActive(null);
	}
	if (!conns.active && conns.list.length) {
		const c = conns.list[0];
		if (c.defaultModel) setActive({ connectionId: c.id, name: c.name, model: c.defaultModel });
	}
}

export async function addConnection(input: {
	name: string;
	baseUrl: string;
	apiKey: string;
	defaultModel: string;
}): Promise<PublicConnection> {
	const res = await fetch('/api/connections', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({ error: 'Failed to save connection' }));
		throw new Error(error ?? 'Failed to save connection');
	}
	const conn = (await res.json()) as PublicConnection;
	conns.list = [...conns.list, conn];
	if (!conns.active && conn.defaultModel) {
		setActive({ connectionId: conn.id, name: conn.name, model: conn.defaultModel });
	}
	return conn;
}

export async function removeConnection(id: string) {
	await fetch(`/api/connections/${id}`, { method: 'DELETE' });
	conns.list = conns.list.filter((c) => c.id !== id);
	if (conns.active?.connectionId === id) setActive(null);
	reconcileActive();
}

/** Probe an endpoint for its models (pre-save). */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
	const res = await fetch('/api/connections/models', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ baseUrl, apiKey })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error ?? 'Could not list models');
	return data.models as string[];
}

export function setActive(a: ActiveModel | null) {
	conns.active = a;
	persistActive(a);
}
