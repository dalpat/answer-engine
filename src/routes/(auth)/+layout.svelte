<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { children } = $props();
</script>

<div class="auth-wrap">
	<div class="auth-card">
		<a class="brand" href="/login">
			<span class="logo"><Icon name="sparkle" size={20} /></span>
			Answer Engine
		</a>
		{@render children()}
	</div>
</div>

<style>
	.auth-wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.auth-card {
		width: 100%;
		max-width: 380px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 18px;
		padding: 30px 28px;
		box-shadow: var(--shadow-lg);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		justify-content: center;
		font-weight: 650;
		font-size: 16px;
		color: var(--ink);
		text-decoration: none;
		margin-bottom: 22px;
	}
	.logo {
		color: var(--accent);
		display: grid;
		place-items: center;
	}
</style>
