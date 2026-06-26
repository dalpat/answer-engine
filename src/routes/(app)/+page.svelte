<script lang="ts">
	import { goto } from '$app/navigation';
	import Composer from '$lib/components/Composer.svelte';
	import { conns, loadConnections } from '$lib/stores/connections.svelte';
	import { createThread, setPending } from '$lib/stores/session.svelte';

	let deep = $state(false);
	let search = $state(true);
	let creating = $state(false);

	$effect(() => {
		if (!conns.loaded) loadConnections();
	});

	async function start(q: string) {
		if (creating) return;
		creating = true;
		try {
			const t = await createThread(q);
			setPending(t.id, q, deep, search);
			await goto(`/thread/${t.id}`);
		} finally {
			creating = false;
		}
	}
</script>

<main class="home">
	<div class="hero">
		<div class="mark">✦</div>
		<h1>What do you want to know?</h1>
		<p class="sub">Searches the web, reads the sources, answers with citations.</p>
	</div>

	<Composer onsubmit={start} bind:deep bind:search disabled={creating} />

	<div class="hints">
		{#each ['Best mirrorless cameras in 2026', 'How does SearXNG work?', 'Explain AES-GCM simply'] as h (h)}
			<button class="hint" onclick={() => start(h)} disabled={creating}>{h}</button>
		{/each}
	</div>
</main>

<style>
	.home {
		max-width: 720px;
		margin: 0 auto;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 24px;
		gap: 26px;
	}
	.hero {
		text-align: center;
	}
	.mark {
		font-size: 30px;
		color: var(--accent);
		margin-bottom: 10px;
	}
	.hero h1 {
		font-size: 30px;
		letter-spacing: -0.02em;
		margin: 0;
		font-weight: 650;
	}
	.hero .sub {
		color: var(--muted);
		margin: 8px 0 0;
		font-size: 15px;
	}
	.hints {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}
	.hint {
		background: var(--panel);
		border: 1px solid var(--line);
		color: var(--muted);
		border-radius: 999px;
		padding: 8px 14px;
		font-size: 13.5px;
		cursor: pointer;
		transition: all 0.15s;
	}
	.hint:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}
</style>
