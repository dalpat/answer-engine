<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/state';
	import { conns, loadConnections, removeConnection, setActive } from '$lib/stores/connections.svelte';
	import ConnectionForm from '$lib/components/ConnectionForm.svelte';

	const email = $derived((page.data.user?.email as string | undefined) ?? '—');
	let adding = $state(false);

	$effect(() => {
		if (!conns.loaded) loadConnections();
	});

	function useConnection(id: string, name: string, model: string | null) {
		if (model) setActive({ connectionId: id, name, model });
	}
</script>

<main class="page">
	<header class="page-head">
		<h1>Settings</h1>
		<p class="sub">Manage your models, account, and appearance.</p>
	</header>

	<!-- BYOK connections -->
	<section class="card">
		<div class="card-head">
			<div>
				<h2>Model connections</h2>
				<p class="sub">Connect any OpenAI-compatible endpoint. Keys are encrypted at rest.</p>
			</div>
			{#if !adding}
				<button class="btn btn-primary" onclick={() => (adding = true)}>
					<Icon name="plus" size={16} /> Add connection
				</button>
			{/if}
		</div>

		{#if adding}
			<ConnectionForm ondone={() => (adding = false)} oncancel={() => (adding = false)} />
		{:else if conns.list.length === 0}
			<div class="placeholder">
				<span class="ph-icon"><Icon name="sparkle" size={20} /></span>
				<p>No connections yet.</p>
				<span class="hint">Add your first OpenAI-compatible endpoint to start asking.</span>
			</div>
		{:else}
			<ul class="conn-list">
				{#each conns.list as c (c.id)}
					{@const isActive = conns.active?.connectionId === c.id}
					<li class="conn" class:active={isActive}>
						<div class="conn-info">
							<div class="conn-name">
								{c.name}
								{#if isActive}<span class="badge">Active</span>{/if}
							</div>
							<div class="conn-meta">{c.defaultModel} · {c.baseUrl}</div>
						</div>
						<div class="conn-actions">
							{#if !isActive}
								<button class="btn sm" onclick={() => useConnection(c.id, c.name, c.defaultModel)}>
									Use
								</button>
							{/if}
							<button class="icon-btn" onclick={() => removeConnection(c.id)} aria-label="Delete">
								<Icon name="trash" size={16} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Account -->
	<section class="card">
		<div class="card-head">
			<h2>Account</h2>
		</div>
		<div class="row">
			<span class="row-label">Signed in as</span>
			<span class="row-val">{email}</span>
		</div>
	</section>

	<!-- Appearance -->
	<section class="card">
		<div class="card-head">
			<h2>Appearance</h2>
		</div>
		<div class="row">
			<span class="row-label">Theme</span>
			<span class="row-val">Light</span>
		</div>
	</section>
</main>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 48px 28px 96px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.page-head h1 {
		font-size: 26px;
		font-weight: 650;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.sub {
		color: var(--muted);
		font-size: 14px;
		margin: 6px 0 0;
	}
	h2 {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}
	.card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 16px;
	}
	.placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 4px;
		padding: 26px;
		border: 1px dashed var(--line-strong);
		border-radius: 12px;
		color: var(--muted);
	}
	.ph-icon {
		color: var(--accent);
		margin-bottom: 4px;
	}
	.placeholder p {
		margin: 0;
		color: var(--ink);
		font-weight: 550;
	}
	.hint {
		font-size: 13px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
	}
	.row-label {
		color: var(--muted);
		font-size: 14px;
	}
	.row-val {
		font-size: 14px;
	}

	.conn-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.conn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 13px 14px;
	}
	.conn.active {
		border-color: var(--accent-line);
		background: var(--active);
	}
	.conn-info {
		min-width: 0;
	}
	.conn-name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 14.5px;
	}
	.badge {
		font-size: 11px;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border-radius: 6px;
		padding: 2px 7px;
	}
	.conn-meta {
		color: var(--muted);
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 2px;
	}
	.conn-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.btn.sm {
		padding: 6px 12px;
		font-size: 13px;
	}
</style>
