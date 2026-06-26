<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	let { form } = $props();
</script>

<AuthForm
	title="Welcome back"
	cta="Sign in"
	error={form?.error}
	altText="New here?"
	altHref="/register"
	altLabel="Create an account"
/>
