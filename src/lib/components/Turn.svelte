<script lang="ts">
	import { marked } from 'marked';
	import type { Phase } from '$lib/events';
	import type { Turn } from '$lib/types';

	let { turn, onrelated }: { turn: Turn; onrelated: (q: string) => void } = $props();

	const PHASES: { key: Phase; label: string }[] = [
		{ key: 'understanding', label: 'Understanding' },
		{ key: 'searching', label: 'Searching the web' },
		{ key: 'reading', label: 'Reading sources' },
		{ key: 'answering', label: 'Writing answer' }
	];

	const answerHtml = $derived(turn.answer ? marked.parse(turn.answer) : '');
	const phaseIndex = $derived(turn.phase ? PHASES.findIndex((p) => p.key === turn.phase) : -1);
	const done = $derived(turn.elapsed !== null);
</script>

<section class="turn">
	<h2 class="question">{turn.question}</h2>

	{#if turn.error}
		<div class="error">⚠ {turn.error}</div>
	{/if}

	{#if turn.phase !== null}
		<div class="process" class:collapsed={!turn.stepsOpen}>
			<button class="process-head" onclick={() => (turn.stepsOpen = !turn.stepsOpen)}>
				<span class="ph-icon">{done ? '✓' : ''}</span>
				<span class="ph-label">
					{#if done}Searched {turn.sources.length} sources · {(turn.elapsed! / 1000).toFixed(1)}s
					{:else}{PHASES[phaseIndex]?.label ?? 'Working'}…{/if}
				</span>
				<span class="ph-toggle">{turn.stepsOpen ? '▾' : '▸'}</span>
			</button>
			{#if turn.stepsOpen}
				<ol class="steps">
					{#each PHASES as p, i (p.key)}
						<li class="step" class:done={phaseIndex > i || done} class:active={phaseIndex === i && !done}>
							<span class="dot"></span>
							<div class="cbody">
								<span class="t">{p.label}</span>
								{#if p.key === 'searching' && turn.queries.length}
									<div class="chips">
										{#each turn.queries as q (q)}<span class="chip">{q}</span>{/each}
									</div>
								{/if}
								{#if p.key === 'reading' && turn.sources.length}
									<div class="cards">
										{#each turn.sources as s (s.n)}
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
		</div>
	{/if}

	{#if turn.sources.length}
		<div class="sourcebar">
			{#each turn.sources as s (s.n)}
				<a class="srccard cited" href={s.url} target="_blank" rel="noreferrer">
					<span class="num">{s.n}</span><span class="fav"></span>{s.domain}
				</a>
			{/each}
		</div>
	{/if}

	{#if turn.answer}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<article class="prose">{@html answerHtml}</article>
	{/if}

	{#if turn.related.length}
		<div class="related">
			<h3>Related</h3>
			{#each turn.related as r (r)}
				<button class="relq" onclick={() => onrelated(r)}>{r}<span>↗</span></button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.turn {
		padding-bottom: 8px;
	}
	.turn + :global(.turn) {
		border-top: 1px solid var(--line);
		padding-top: 26px;
		margin-top: 26px;
	}
	.question {
		font-size: 23px;
		letter-spacing: -0.01em;
		font-weight: 650;
		margin: 0 0 18px;
	}
	.process {
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--panel);
		margin-bottom: 20px;
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
	.related {
		margin-top: 30px;
		border-top: 1px solid var(--line);
		padding-top: 16px;
	}
	.related h3 {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		margin: 0 0 8px;
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
		padding: 12px 2px;
		font-size: 15px;
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
