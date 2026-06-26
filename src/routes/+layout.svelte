<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import './app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Answer Engine</title>
</svelte:head>

{@render children()}
