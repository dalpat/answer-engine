<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import Menu from './Menu.svelte';
	import { ui, toggleSidebar } from '$lib/stores/ui.svelte';
	import { session, selectThread, removeThread, newThread } from '$lib/stores/session.svelte';

	const path = $derived(page.url.pathname);

	function onNew() {
		newThread();
		goto('/');
	}
	function onSelect(id: string) {
		selectThread(id);
		goto('/');
	}
</script>

<aside class="sidebar" class:collapsed={ui.collapsed}>
	<div class="top">
		<a class="brand" href="/" aria-label="Answer Engine">
			<span class="logo"><Icon name="sparkle" size={18} /></span>
			<span class="brand-text">Answer Engine</span>
		</a>
		<button class="icon-btn" onclick={toggleSidebar} title="Toggle sidebar" aria-label="Toggle sidebar">
			<Icon name="panel-left" />
		</button>
	</div>

	<button class="new-btn" onclick={onNew}>
		<Icon name="plus" size={17} />
		<span class="label">New thread</span>
	</button>

	<nav class="nav">
		<a class="nav-item" class:active={path === '/'} href="/" onclick={onNew}>
			<Icon name="search" size={17} /><span class="label">Search</span>
		</a>
		<a class="nav-item" class:active={path.startsWith('/settings')} href="/settings">
			<Icon name="settings" size={17} /><span class="label">Settings</span>
		</a>
	</nav>

	<div class="history">
		<div class="section-label">Recent</div>
		{#if session.threads.length === 0}
			<p class="empty">No conversations yet</p>
		{:else}
			{#each session.threads as t (t.id)}
				<div class="hist-item" class:active={session.activeId === t.id}>
					<button class="hist-main" onclick={() => onSelect(t.id)} title={t.title}>
						<Icon name="message" size={15} />
						<span class="hist-title">{t.title}</span>
					</button>
					<Menu align="right" width={150}>
						{#snippet trigger(toggle)}
							<button class="icon-btn sm" onclick={toggle} aria-label="Thread menu">
								<Icon name="more" size={16} />
							</button>
						{/snippet}
						{#snippet children(close)}
							<button
								class="menu-item danger"
								onclick={() => {
									removeThread(t.id);
									close();
								}}
							>
								<Icon name="trash" size={15} /> Delete
							</button>
						{/snippet}
					</Menu>
				</div>
			{/each}
		{/if}
	</div>

	<div class="bottom">
		<Menu align="right" width={210}>
			{#snippet trigger(toggle)}
				<button class="account" onclick={toggle}>
					<span class="avatar"><Icon name="user" size={16} /></span>
					<span class="label acct-name">Guest</span>
					<span class="label"><Icon name="chevron-down" size={15} /></span>
				</button>
			{/snippet}
			{#snippet children(close)}
				<a class="menu-item" href="/settings" onclick={close}>
					<Icon name="settings" size={15} /> Settings
				</a>
				<div class="menu-sep"></div>
				<button class="menu-item" disabled>
					<Icon name="logout" size={15} /> Sign out
				</button>
			{/snippet}
		</Menu>
	</div>
</aside>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		width: 256px;
		flex-shrink: 0;
		height: 100dvh;
		background: var(--sidebar);
		border-right: 1px solid var(--line);
		padding: 12px 10px;
		gap: 4px;
		transition: width 0.18s ease;
		overflow: hidden;
	}
	.sidebar.collapsed {
		width: 60px;
	}
	.collapsed .label,
	.collapsed .brand-text {
		display: none;
	}
	.collapsed .new-btn,
	.collapsed .nav-item,
	.collapsed .account {
		justify-content: center;
	}
	.collapsed .history {
		display: none;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 6px 8px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-weight: 650;
		font-size: 15px;
		color: var(--ink);
		text-decoration: none;
	}
	.logo {
		color: var(--accent);
		display: grid;
		place-items: center;
	}

	.new-btn {
		display: flex;
		align-items: center;
		gap: 9px;
		background: var(--ink);
		color: #fff;
		border: 0;
		border-radius: 11px;
		padding: 10px 12px;
		font-size: 14px;
		font-weight: 550;
		cursor: pointer;
		margin-bottom: 6px;
	}
	.new-btn:hover {
		opacity: 0.9;
	}

	.nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.nav-item {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 9px 12px;
		border-radius: 10px;
		font-size: 14px;
		color: var(--ink);
		text-decoration: none;
	}
	.nav-item:hover {
		background: var(--hover);
	}
	.nav-item.active {
		background: var(--active);
		color: var(--accent);
	}

	.history {
		flex: 1;
		overflow-y: auto;
		margin-top: 12px;
		min-height: 0;
	}
	.section-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		padding: 4px 12px 6px;
	}
	.empty {
		color: var(--muted);
		font-size: 13px;
		padding: 2px 12px;
		margin: 0;
	}
	.hist-item {
		display: flex;
		align-items: center;
		border-radius: 10px;
		padding-right: 4px;
	}
	.hist-item:hover {
		background: var(--hover);
	}
	.hist-item.active {
		background: var(--active);
	}
	.hist-main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 9px;
		background: transparent;
		border: 0;
		padding: 9px 4px 9px 12px;
		font-size: 13.5px;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
	}
	.hist-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.hist-item .icon-btn.sm {
		opacity: 0;
	}
	.hist-item:hover .icon-btn.sm {
		opacity: 1;
	}

	.bottom {
		border-top: 1px solid var(--line);
		padding-top: 8px;
		margin-top: 4px;
	}
	.account {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		background: transparent;
		border: 0;
		border-radius: 10px;
		padding: 8px 10px;
		cursor: pointer;
		color: var(--ink);
	}
	.account:hover {
		background: var(--hover);
	}
	.avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--active);
		color: var(--accent);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.acct-name {
		flex: 1;
		text-align: left;
		font-size: 14px;
	}
</style>
