<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Composer from '$lib/components/Composer.svelte';
	import TurnView from '$lib/components/Turn.svelte';
	import type { AskEvent } from '$lib/events';
	import type { Turn } from '$lib/types';
	import { emptyTurn } from '$lib/types';
	import { streamAsk } from '$lib/stream';
	import { conns, loadConnections } from '$lib/stores/connections.svelte';
	import { takePending, addThreadLocal } from '$lib/stores/session.svelte';

	let { data } = $props();

	function buildTurns(messages: typeof data.thread.messages): Turn[] {
		const turns: Turn[] = [];
		let cur: Turn | null = null;
		for (const m of messages) {
			if (m.role === 'user') {
				cur = {
					question: m.content,
					phase: null,
					queries: [],
					sources: [],
					answer: '',
					related: [],
					elapsed: null,
					error: '',
					running: false,
					stepsOpen: false
				};
				turns.push(cur);
			} else if (cur) {
				cur.answer = m.content;
				cur.sources = m.sources;
				cur.related = m.related;
			}
		}
		return turns;
	}

	// Persisted turns derive from server data (SSR-correct, auto-resets on nav).
	let baseTurns = $derived(buildTurns(data.thread.messages));
	// Turns produced live this session (streaming) sit on top.
	let liveTurns = $state<Turn[]>([]);
	let allTurns = $derived([...baseTurns, ...liveTurns]);

	let streaming = $state(false);
	let deep = $state(false);
	let bottom = $state<HTMLElement>();

	// Clear the live overlay when navigating to a different thread.
	let currentId = $state('');
	$effect(() => {
		if (data.thread.id !== currentId) {
			currentId = data.thread.id;
			liveTurns = [];
		}
	});

	async function scrollDown() {
		await tick();
		bottom?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}

	function applyTo(i: number, ev: AskEvent) {
		const t = liveTurns[i];
		switch (ev.type) {
			case 'status':
				t.phase = ev.phase;
				if (ev.queries) t.queries = ev.queries;
				break;
			case 'sources':
				t.sources = ev.sources;
				break;
			case 'token':
				t.answer += ev.text;
				break;
			case 'related':
				t.related = ev.questions;
				break;
			case 'done':
				t.elapsed = ev.elapsedMs;
				t.stepsOpen = false;
				break;
			case 'error':
				t.error = ev.message;
				break;
		}
	}

	async function ask(q: string) {
		if (!q.trim() || streaming) return;
		const i = liveTurns.push(emptyTurn(q)) - 1;
		streaming = true;
		scrollDown();
		try {
			await streamAsk(
				{
					query: q,
					threadId: data.thread.id,
					connectionId: conns.active?.connectionId,
					model: conns.active?.model,
					deep
				},
				(ev) => applyTo(i, ev)
			);
		} catch (e) {
			liveTurns[i].error = e instanceof Error ? e.message : 'request failed';
		} finally {
			liveTurns[i].running = false;
			streaming = false;
		}
	}

	onMount(async () => {
		if (!conns.loaded) await loadConnections();
		addThreadLocal({ id: data.thread.id, title: data.thread.title });
		const p = takePending(data.thread.id);
		if (p) {
			deep = p.deep;
			ask(p.question);
		}
	});
</script>

<div class="app">
	<main class="thread">
		{#each allTurns as turn, i (i)}
			<TurnView {turn} onrelated={ask} />
		{/each}
		<div bind:this={bottom}></div>
	</main>

	<div class="dock">
		<Composer onsubmit={ask} bind:deep disabled={streaming} placeholder="Ask a follow-up…" />
	</div>
</div>

<style>
	.app {
		max-width: 760px;
		margin: 0 auto;
		min-height: 100%;
		display: flex;
		flex-direction: column;
	}
	.thread {
		flex: 1;
		padding: 40px 24px 24px;
	}
	.dock {
		position: sticky;
		bottom: 0;
		padding: 16px 24px 22px;
		background: linear-gradient(to top, var(--bg) 72%, transparent);
	}
</style>
