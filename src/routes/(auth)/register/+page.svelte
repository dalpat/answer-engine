<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	let { form } = $props();
</script>

<AuthForm
	title="Create your account"
	cta="Sign up"
	error={form?.error}
	altText="Already have an account?"
	altHref="/login"
	altLabel="Sign in"
/>
