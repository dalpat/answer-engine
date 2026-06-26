<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import { conns, setActive } from '$lib/stores/connections.svelte';

	let {
		onsubmit,
		disabled = false,
		deep = $bindable(false),
		search = $bindable(true),
		placeholder = 'Ask anything…'
	}: {
		onsubmit: (q: string) => void;
		disabled?: boolean;
		deep?: boolean;
		search?: boolean;
		placeholder?: string;
	} = $props();

	let query = $state('');
	const ph = $derived(search ? placeholder : 'Send a message…');

	function submit() {
		const q = query.trim();
		if (!q || disabled) return;
		query = '';
		onsubmit(q);
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}
</script>

<div class="composer">
	<textarea bind:value={query} onkeydown={onKeydown} placeholder={ph} rows="1" {disabled}></textarea>
	<div class="tools">
		<div class="left">
			<Menu width={230}>
				{#snippet trigger(toggle)}
					<button class="model" type="button" onclick={toggle}>
						<span class="spark"><Icon name="sparkle" size={14} /></span>
						{conns.active?.model ?? 'Demo mode'}
						<span class="caret"><Icon name="chevron-down" size={14} /></span>
					</button>
				{/snippet}
				{#snippet children(close)}
					{#if conns.list.length === 0}
						<div class="menu-note">No models configured</div>
					{:else}
						{#each conns.list as c (c.id)}
							{#if c.defaultModel}
								<button
									class="menu-item"
									onclick={() => {
										setActive({ connectionId: c.id, name: c.name, model: c.defaultModel! });
										close();
									}}
								>
									<Icon name="sparkle" size={14} />
									<span class="model-opt">
										<span class="mo-model">{c.defaultModel}</span>
										<span class="mo-name">{c.name}</span>
									</span>
									{#if conns.active?.connectionId === c.id}<span class="mo-check">✓</span>{/if}
								</button>
							{/if}
						{/each}
					{/if}
					<div class="menu-sep"></div>
					<a class="menu-item" href="/settings" onclick={close}>
						<Icon name="settings" size={15} /> Manage connections
					</a>
				{/snippet}
			</Menu>

			<button
				class="toggle"
				class:on={search}
				type="button"
				title={search ? 'Web search on — answer engine' : 'Web search off — plain chat'}
				onclick={() => (search = !search)}
			>
				<Icon name="search" size={14} /> Search
			</button>

			{#if search}
				<button
					class="toggle"
					class:on={deep}
					type="button"
					title="Deep Research — extra gap-filling search round"
					onclick={() => (deep = !deep)}
				>
					<Icon name="compass" size={14} /> Deep
				</button>
			{/if}
		</div>

		<button class="send" onclick={submit} disabled={disabled || !query.trim()} aria-label="Send">
			<Icon name="arrow-up" size={18} />
		</button>
	</div>
</div>

<style>
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
	.left {
		display: flex;
		align-items: center;
		gap: 7px;
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
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: transparent;
		border: 1px solid var(--line);
		color: var(--muted);
		border-radius: 999px;
		padding: 6px 12px;
		font-size: 13px;
		cursor: pointer;
	}
	.toggle:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}
	.toggle.on {
		background: var(--active);
		border-color: var(--accent-line);
		color: var(--accent);
	}
	.send {
		width: 38px;
		height: 38px;
		border: 0;
		border-radius: 50%;
		background: var(--ink);
		color: #fff;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: opacity 0.15s;
	}
	.send:disabled {
		opacity: 0.25;
		cursor: default;
	}
	.menu-note {
		padding: 8px 11px 4px;
		font-size: 12.5px;
		color: var(--muted);
	}
	.model-opt {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.mo-model {
		font-size: 13.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mo-name {
		font-size: 11.5px;
		color: var(--muted);
	}
	.mo-check {
		color: var(--accent);
		font-weight: 700;
	}
</style>
