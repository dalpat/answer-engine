<script lang="ts">
	let {
		title,
		cta,
		error,
		altText,
		altHref,
		altLabel
	}: {
		title: string;
		cta: string;
		error?: string;
		altText: string;
		altHref: string;
		altLabel: string;
	} = $props();
</script>

<h1>{title}</h1>

<form method="POST" class="auth-form">
	{#if error}
		<div class="form-error">{error}</div>
	{/if}
	<label>
		<span class="field-label">Email</span>
		<input class="field" type="email" name="email" autocomplete="email" required />
	</label>
	<label>
		<span class="field-label">Password</span>
		<input class="field" type="password" name="password" autocomplete="current-password" required minlength="8" />
	</label>
	<button class="btn btn-primary submit" type="submit">{cta}</button>
</form>

<p class="alt">{altText} <a href={altHref}>{altLabel}</a></p>

<style>
	h1 {
		font-size: 20px;
		font-weight: 650;
		text-align: center;
		margin: 0 0 20px;
	}
	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.submit {
		justify-content: center;
		margin-top: 4px;
		padding: 11px;
	}
	.form-error {
		background: #fdecef;
		color: var(--danger);
		border-radius: 9px;
		padding: 9px 12px;
		font-size: 13.5px;
	}
	.alt {
		text-align: center;
		color: var(--muted);
		font-size: 13.5px;
		margin: 18px 0 0;
	}
	.alt a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 550;
	}
</style>
