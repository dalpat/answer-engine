<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { session, loadThreads } from '$lib/stores/session.svelte';

	let { children } = $props();

	$effect(() => {
		if (!session.loaded) loadThreads();
	});
</script>

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
