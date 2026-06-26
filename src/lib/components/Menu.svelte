<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		trigger,
		children,
		align = 'left',
		width = 200
	}: {
		/** Receives a `toggle` fn to wire onto your trigger element. */
		trigger: Snippet<[() => void]>;
		/** Receives a `close` fn so items can dismiss the menu. */
		children: Snippet<[() => void]>;
		align?: 'left' | 'right';
		width?: number;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();

	const toggle = () => (open = !open);
	const close = () => (open = false);

	function onWindowPointer(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onKey} />

<div class="menu-root" bind:this={root}>
	{@render trigger(toggle)}
	{#if open}
		<div class="menu-pop {align}" style="min-width:{width}px" role="menu">
			{@render children(close)}
		</div>
	{/if}
</div>

<style>
	.menu-root {
		position: relative;
		display: inline-flex;
	}
	.menu-pop {
		position: absolute;
		top: calc(100% + 6px);
		z-index: 50;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 6px;
		box-shadow: var(--shadow-lg);
		animation: pop 0.12s ease-out;
	}
	.menu-pop.left {
		left: 0;
	}
	.menu-pop.right {
		right: 0;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
</style>
