<script lang="ts">
	import { marked } from 'marked';
	import type { AskEvent, Phase, SourceCard } from '$lib/events';
	import { session, startThread } from '$lib/stores/session.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Menu from '$lib/components/Menu.svelte';

	const PHASES: { key: Phase; label: string }[] = [
		{ key: 'understanding', label: 'Understanding' },
		{ key: 'searching', label: 'Searching the web' },
		{ key: 'reading', label: 'Reading sources' },
		{ key: 'answering', label: 'Writing answer' }
	];

	let query = $state('');
	let asked = $state('');
	let running = $state(false);
	let phase = $state<Phase | null>(null);
	let queries = $state<string[]>([]);
	let sources = $state<SourceCard[]>([]);
	let answer = $state('');
	let related = $state<string[]>([]);
	let elapsed = $state<number | null>(null);
	let errorMsg = $state('');
	let stepsOpen = $state(true);

	let answerHtml = $derived(answer ? marked.parse(answer) : '');
	let phaseIndex = $derived(phase ? PHASES.findIndex((p) => p.key === phase) : -1);
	let started = $derived(running || phase !== null || answer !== '' || errorMsg !== '');
	let done = $derived(elapsed !== null);

	// "New thread" / selecting from the sidebar clears activeId → reset the view.
	$effect(() => {
		if (session.activeId === null && started) {
			reset();
			asked = '';
		}
	});

	function reset() {
		phase = null;
		queries = [];
		sources = [];
		answer = '';
		related = [];
		elapsed = null;
		errorMsg = '';
		stepsOpen = true;
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
				stepsOpen = false; // collapse the process once the answer is ready
				break;
			case 'error':
				errorMsg = ev.message;
				break;
		}
	}

	async function ask(q: string) {
		if (!q.trim() || running) return;
		reset();
		asked = q.trim();
		query = '';
		startThread(asked);
		running = true;
		try {
			const res = await fetch('/api/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: asked })
			});
			if (!res.body) throw new Error('no stream');
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { done: rdone, value } = await reader.read();
				if (rdone) break;
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

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			ask(query);
		}
	}
</script>

{#snippet composer()}
	<div class="composer">
		<textarea
			bind:value={query}
			onkeydown={onKeydown}
			placeholder="Ask anything…"
			rows="1"
		></textarea>
		<div class="tools">
			<Menu width={210}>
				{#snippet trigger(toggle)}
					<button class="model" type="button" onclick={toggle}>
						<span class="spark"><Icon name="sparkle" size={14} /></span> Default model
						<span class="caret"><Icon name="chevron-down" size={14} /></span>
					</button>
				{/snippet}
				{#snippet children(close)}
					<div class="menu-note">No models configured</div>
					<div class="menu-sep"></div>
					<a class="menu-item" href="/settings" onclick={close}>
						<Icon name="settings" size={15} /> Configure models
					</a>
				{/snippet}
			</Menu>
			<button class="send" onclick={() => ask(query)} disabled={running || !query.trim()} aria-label="Send">
				<Icon name="arrow-up" size={18} />
			</button>
		</div>
	</div>
{/snippet}

{#if !started}
	<!-- Empty state: centered greeting + card composer (Kimi-style) -->
	<main class="home">
		<div class="hero">
			<div class="mark">✦</div>
			<h1>What do you want to know?</h1>
			<p class="sub">Searches the web, reads the sources, answers with citations.</p>
		</div>
		{@render composer()}
		<div class="hints">
			{#each ['Best mirrorless cameras in 2026', 'How does SearXNG work?', 'Explain AES-GCM simply'] as h (h)}
				<button class="hint" onclick={() => ask(h)}>{h}</button>
			{/each}
		</div>
	</main>
{:else}
	<!-- Conversation state: thread scrolls, composer docks to the bottom -->
	<div class="app">
		<main class="thread">
			<h2 class="question">{asked}</h2>

			{#if errorMsg}
				<div class="error">⚠ {errorMsg}</div>
			{/if}

			{#if phase !== null}
				<section class="process" class:collapsed={!stepsOpen}>
					<button class="process-head" onclick={() => (stepsOpen = !stepsOpen)}>
						<span class="ph-icon">{done ? '✓' : ''}</span>
						<span class="ph-label">
							{#if done}Searched {sources.length} sources · {(elapsed! / 1000).toFixed(1)}s
							{:else}{PHASES[phaseIndex]?.label ?? 'Working'}…{/if}
						</span>
						<span class="ph-toggle">{stepsOpen ? '▾' : '▸'}</span>
					</button>
					{#if stepsOpen}
						<ol class="steps">
							{#each PHASES as p, i (p.key)}
								<li class="step" class:done={phaseIndex > i || done} class:active={phaseIndex === i && !done}>
									<span class="dot"></span>
									<div class="cbody">
										<span class="t">{p.label}</span>
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
								</li>
							{/each}
						</ol>
					{/if}
				</section>
			{/if}

			{#if sources.length}
				<div class="sourcebar">
					{#each sources as s (s.n)}
						<a class="srccard cited" href={s.url} target="_blank" rel="noreferrer">
							<span class="num">{s.n}</span><span class="fav"></span>{s.domain}
						</a>
					{/each}
				</div>
			{/if}

			{#if answer}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<article class="prose">{@html answerHtml}</article>
			{/if}

			{#if related.length}
				<section class="related">
					<h3>Related</h3>
					{#each related as r (r)}
						<button class="relq" onclick={() => ask(r)}>{r}<span>↗</span></button>
					{/each}
				</section>
			{/if}
		</main>

		<div class="dock">
			{@render composer()}
		</div>
	</div>
{/if}

<style>
	/* ---------- Empty / home state ---------- */
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

	/* ---------- Composer card ---------- */
	.composer {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 24px;
		padding: 14px 16px 12px;
		box-shadow: var(--shadow-lg);
		transition: border-color 0.15s;
	}
	.composer:focus-within {
		border-color: var(--accent-line);
	}
	.composer textarea {
		width: 100%;
		border: 0;
		outline: 0;
		resize: none;
		background: transparent;
		font: inherit;
		font-size: 16px;
		line-height: 1.5;
		max-height: 180px;
		color: var(--ink);
	}
	.tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
	}
	.model {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: 1px solid var(--line);
		color: var(--muted);
		border-radius: 999px;
		padding: 6px 12px;
		font-size: 13px;
		cursor: pointer;
	}
	.model:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}
	.model .spark {
		color: var(--accent);
		display: inline-flex;
	}
	.model .caret {
		display: inline-flex;
		opacity: 0.7;
	}
	.menu-note {
		padding: 8px 11px 4px;
		font-size: 12.5px;
		color: var(--muted);
	}
	.send {
		width: 38px;
		height: 38px;
		border: 0;
		border-radius: 50%;
		background: var(--ink);
		color: #fff;
		font-size: 18px;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: opacity 0.15s;
	}
	.send:disabled {
		opacity: 0.25;
		cursor: default;
	}

	/* ---------- Conversation layout ---------- */
	.app {
		max-width: 760px;
		margin: 0 auto;
		min-height: 100%;
		display: flex;
		flex-direction: column;
	}
	.thread {
		flex: 1;
		padding: 40px 24px 140px;
	}
	.question {
		font-size: 24px;
		letter-spacing: -0.01em;
		font-weight: 650;
		margin: 0 0 20px;
	}
	.dock {
		position: sticky;
		bottom: 0;
		padding: 16px 24px 22px;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
		max-width: 760px;
		margin: 0 auto;
		width: 100%;
	}

	/* ---------- Process / stepper (quiet) ---------- */
	.process {
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--panel);
		margin-bottom: 22px;
		overflow: hidden;
	}
	.process-head {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		background: transparent;
		border: 0;
		padding: 13px 16px;
		font-size: 14px;
		color: var(--ink);
		cursor: pointer;
	}
	.ph-icon {
		color: var(--green);
		font-weight: 700;
		width: 12px;
	}
	.ph-label {
		flex: 1;
		text-align: left;
		color: var(--muted);
	}
	.ph-toggle {
		color: var(--muted);
		font-size: 11px;
	}
	.steps {
		list-style: none;
		margin: 0;
		padding: 4px 16px 16px 18px;
		position: relative;
	}
	.steps::before {
		content: '';
		position: absolute;
		left: 23px;
		top: 10px;
		bottom: 18px;
		width: 1.5px;
		background: var(--line);
	}
	.step {
		position: relative;
		padding: 6px 0 6px 22px;
		opacity: 0.5;
		transition: opacity 0.3s;
	}
	.step.active,
	.step.done {
		opacity: 1;
	}
	.dot {
		position: absolute;
		left: 0;
		top: 11px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--panel);
		border: 2px solid var(--line-strong);
	}
	.step.active .dot {
		border-color: var(--accent);
		box-shadow: 0 0 0 4px var(--accent-soft);
	}
	.step.done .dot {
		background: var(--accent);
		border-color: var(--accent);
	}
	.step .t {
		font-size: 14px;
	}
	.chips,
	.cards {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 7px;
	}
	.chip {
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 7px;
		padding: 3px 9px;
		font-size: 12.5px;
	}

	/* ---------- Source cards ---------- */
	.srccard {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 6px 11px;
		font-size: 12.5px;
		color: var(--muted);
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.srccard:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}
	.fav {
		width: 13px;
		height: 13px;
		border-radius: 3px;
		background: var(--accent-soft);
	}
	.sourcebar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 20px;
	}
	.cited .num {
		display: inline-flex;
		min-width: 15px;
		height: 15px;
		padding: 0 4px;
		align-items: center;
		justify-content: center;
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 4px;
		font-size: 10.5px;
		font-weight: 700;
	}

	/* ---------- Answer prose ---------- */
	.prose {
		font-size: 16px;
		line-height: 1.7;
	}
	.prose :global(p:first-child) {
		margin-top: 0;
	}
	.prose :global(pre) {
		background: var(--code-bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 14px;
		overflow: auto;
	}
	.prose :global(code) {
		background: var(--code-bg);
		border-radius: 5px;
		padding: 1px 5px;
		font-size: 0.9em;
	}

	/* ---------- Related ---------- */
	.related {
		margin-top: 34px;
		border-top: 1px solid var(--line);
		padding-top: 18px;
	}
	.related h3 {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		margin: 0 0 10px;
	}
	.relq {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		text-align: left;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--line);
		padding: 13px 2px;
		font-size: 15.5px;
		color: var(--ink);
		cursor: pointer;
	}
	.relq:hover {
		color: var(--accent);
	}
	.relq span {
		color: var(--muted);
	}

	.error {
		color: #b00020;
		background: #fdecef;
		border-radius: 12px;
		padding: 12px 16px;
		margin-bottom: 18px;
	}
</style>
