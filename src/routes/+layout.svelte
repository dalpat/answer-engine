<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import './app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Answer Engine</title>
</svelte:head>

<div class="shell">
	<Sidebar />
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.shell {
		display: flex;
		height: 100dvh;
		overflow: hidden;
	}
	.content {
		flex: 1;
		min-width: 0;
		height: 100dvh;
		overflow-y: auto;
	}
</style>
