<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/state';
	const email = $derived((page.data.user?.email as string | undefined) ?? '—');
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
			<button class="btn btn-primary" disabled>
				<Icon name="plus" size={16} /> Add connection
			</button>
		</div>
		<div class="placeholder">
			<span class="ph-icon"><Icon name="sparkle" size={20} /></span>
			<p>No connections yet.</p>
			<span class="hint">Connection management lands next — this wires the composer model switcher.</span>
		</div>
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
</style>
