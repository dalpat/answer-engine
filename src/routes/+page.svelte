<script lang="ts">
	import { marked } from 'marked';
	import type { AskEvent, Phase, SourceCard } from '$lib/events';

	const PHASES: { key: Phase; label: string }[] = [
		{ key: 'understanding', label: 'Understanding' },
		{ key: 'searching', label: 'Searching' },
		{ key: 'reading', label: 'Reading sources' },
		{ key: 'answering', label: 'Answering' }
	];

	let query = $state('');
	let running = $state(false);
	let phase = $state<Phase | null>(null);
	let queries = $state<string[]>([]);
	let sources = $state<SourceCard[]>([]);
	let answer = $state('');
	let related = $state<string[]>([]);
	let elapsed = $state<number | null>(null);
	let errorMsg = $state('');

	let answerHtml = $derived(answer ? marked.parse(answer) : '');
	let phaseIndex = $derived(phase ? PHASES.findIndex((p) => p.key === phase) : -1);

	function reset() {
		phase = null;
		queries = [];
		sources = [];
		answer = '';
		related = [];
		elapsed = null;
		errorMsg = '';
	}

	function apply(ev: AskEvent) {
		switch (ev.type) {
			case 'status':
				phase = ev.phase;
				if (ev.queries) queries = ev.queries;
				break;
			case 'sources':
				sources = ev.sources;
				break;
			case 'token':
				answer += ev.text;
				break;
			case 'related':
				related = ev.questions;
				break;
			case 'done':
				elapsed = ev.elapsedMs;
				break;
			case 'error':
				errorMsg = ev.message;
				break;
		}
	}

	async function ask(q: string) {
		if (!q.trim() || running) return;
		reset();
		running = true;
		try {
			const res = await fetch('/api/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: q })
			});
			if (!res.body) throw new Error('no stream');
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const frames = buffer.split('\n\n');
				buffer = frames.pop() ?? '';
				for (const frame of frames) {
					const line = frame.split('\n').find((l) => l.startsWith('data:'));
					if (!line) continue;
					apply(JSON.parse(line.slice(5).trim()) as AskEvent);
				}
			}
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'request failed';
		} finally {
			running = false;
		}
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		ask(query);
	}
</script>

<main>
	<header>
		<h1>Answer Engine</h1>
		<p class="tagline">Search the web, read sources, get cited answers — on your own models.</p>
	</header>

	<form onsubmit={submit} class="composer">
		<input bind:value={query} placeholder="Ask anything…" autocomplete="off" disabled={running} />
		<button type="submit" disabled={running || !query.trim()}>
			{running ? '…' : 'Ask'}
		</button>
	</form>

	{#if errorMsg}
		<div class="error">⚠ {errorMsg}</div>
	{/if}

	{#if phase !== null}
		<section class="stepper">
			{#each PHASES as p, i (p.key)}
				<div class="step" class:done={phaseIndex > i} class:active={phaseIndex === i}>
					<span class="dot">{phaseIndex > i ? '✓' : i + 1}</span>
					<div class="cbody">
						<div class="t">{p.label}</div>
						{#if p.key === 'searching' && queries.length}
							<div class="chips">
								{#each queries as q (q)}<span class="chip">{q}</span>{/each}
							</div>
						{/if}
						{#if p.key === 'reading' && sources.length}
							<div class="cards">
								{#each sources as s (s.n)}
									<a class="srccard" href={s.url} target="_blank" rel="noreferrer">
										<span class="fav"></span>{s.domain}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</section>
	{/if}

	{#if answer}
		<article class="answer">
			{#if sources.length}
				<div class="sourcebar">
					{#each sources as s (s.n)}
						<a class="srccard" href={s.url} target="_blank" rel="noreferrer">
							<span class="num">{s.n}</span><span class="fav"></span>{s.domain}
						</a>
					{/each}
				</div>
			{/if}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="prose">{@html answerHtml}</div>
			{#if elapsed !== null}
				<div class="meta">Searched {sources.length} sources · {(elapsed / 1000).toFixed(1)}s</div>
			{/if}
		</article>
	{/if}

	{#if related.length}
		<section class="related">
			<h3>Related</h3>
			{#each related as r (r)}
				<button class="relq" onclick={() => ((query = r), ask(r))}>{r}<span>→</span></button>
			{/each}
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 56px 24px 96px;
	}
	header {
		text-align: center;
		margin-bottom: 28px;
	}
	h1 {
		font-size: 32px;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.tagline {
		color: var(--muted);
		margin: 6px 0 0;
	}
	.composer {
		display: flex;
		gap: 8px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 8px 8px 8px 20px;
		box-shadow: var(--shadow);
	}
	.composer input {
		flex: 1;
		border: 0;
		outline: 0;
		font-size: 16px;
		background: transparent;
	}
	.composer button {
		border: 0;
		background: var(--accent);
		color: #fff;
		font-weight: 600;
		padding: 0 22px;
		border-radius: 999px;
		cursor: pointer;
	}
	.composer button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.error {
		margin-top: 16px;
		color: #b00020;
		background: #fde8ec;
		border-radius: 10px;
		padding: 10px 14px;
	}

	.stepper {
		position: relative;
		margin: 28px 0 8px;
		padding-left: 30px;
	}
	.stepper::before {
		content: '';
		position: absolute;
		left: 9px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: var(--line);
	}
	.step {
		position: relative;
		margin-bottom: 16px;
		opacity: 0.55;
		transition: opacity 0.3s;
	}
	.step.active,
	.step.done {
		opacity: 1;
	}
	.dot {
		position: absolute;
		left: -30px;
		top: 0;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--panel);
		border: 2px solid var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 700;
		color: var(--accent);
	}
	.step.done .dot {
		background: var(--accent);
		color: #fff;
	}
	.t {
		font-weight: 600;
	}
	.chips,
	.cards {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}
	.chip {
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 8px;
		padding: 4px 10px;
		font-size: 13px;
	}
	.srccard {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 6px 10px;
		font-size: 13px;
		color: var(--ink);
		text-decoration: none;
		box-shadow: var(--shadow);
	}
	.fav {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		background: var(--accent-soft);
	}
	.num {
		display: inline-flex;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		align-items: center;
		justify-content: center;
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 4px;
		font-size: 11px;
		font-weight: 700;
	}

	.answer {
		margin-top: 24px;
	}
	.sourcebar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}
	.prose :global(p:first-child) {
		margin-top: 0;
	}
	.meta {
		margin-top: 18px;
		color: var(--muted);
		font-size: 13px;
	}

	.related {
		margin-top: 32px;
	}
	.related h3 {
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.relq {
		display: flex;
		justify-content: space-between;
		width: 100%;
		text-align: left;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 12px 16px;
		margin-bottom: 8px;
		font-size: 15px;
		cursor: pointer;
		box-shadow: var(--shadow);
	}
	.relq span {
		color: var(--muted);
	}
</style>
