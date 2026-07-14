<script lang="ts">
	import { fetchModels, addConnection } from '$lib/stores/connections.svelte';

	let { ondone, oncancel }: { ondone: () => void; oncancel: () => void } = $props();

	let name = $state('');
	let baseUrl = $state('');
	let apiKey = $state('');
	let models = $state<string[]>([]);
	let selectedModel = $state('');
	let probing = $state(false);
	let saving = $state(false);
	let error = $state('');

	const canProbe = $derived(baseUrl.trim() !== '' && apiKey.trim() !== '' && !probing);
	const canSave = $derived(name.trim() !== '' && selectedModel !== '' && !saving);

	async function probe() {
		error = '';
		probing = true;
		try {
			models = await fetchModels(baseUrl.trim(), apiKey.trim());
			selectedModel = models[0] ?? '';
			if (!name.trim()) name = new URL(baseUrl).hostname.replace(/^www\./, '');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not list models';
			models = [];
		} finally {
			probing = false;
		}
	}

	async function save() {
		error = '';
		saving = true;
		try {
			await addConnection({
				name: name.trim(),
				baseUrl: baseUrl.trim(),
				apiKey: apiKey.trim(),
				defaultModel: selectedModel
			});
			ondone();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save';
		} finally {
			saving = false;
		}
	}
</script>

<div class="conn-form">
	{#if error}<div class="form-error">{error}</div>{/if}

	<label>
		<span class="field-label">Base URL</span>
		<input class="field" bind:value={baseUrl} placeholder="https://api.groq.com/openai" />
		<small class="hint"
			>Just the origin — no <code>/v1</code>, it's added for you. A model on this machine is
			<code>http://localhost:PORT</code> (e.g. llama.cpp / Ollama).</small
		>
	</label>
	<label>
		<span class="field-label">API key</span>
		<input class="field" type="password" bind:value={apiKey} placeholder="sk-…" />
		<small class="hint">Local servers ignore this, but it can't be blank — type anything.</small>
	</label>

	{#if models.length === 0}
		<button class="btn" onclick={probe} disabled={!canProbe}>
			{probing ? 'Fetching models…' : 'Fetch models'}
		</button>
	{:else}
		<label>
			<span class="field-label">Name</span>
			<input class="field" bind:value={name} placeholder="e.g. Groq" />
		</label>
		<label>
			<span class="field-label">Default model · {models.length} available</span>
			<select class="field" bind:value={selectedModel}>
				{#each models as m (m)}<option value={m}>{m}</option>{/each}
			</select>
		</label>
	{/if}

	<div class="actions">
		<button class="btn" onclick={oncancel}>Cancel</button>
		{#if models.length > 0}
			<button class="btn btn-primary" onclick={save} disabled={!canSave}>
				{saving ? 'Saving…' : 'Save connection'}
			</button>
		{/if}
	</div>
</div>

<style>
	.conn-form {
		display: flex;
		flex-direction: column;
		gap: 13px;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 18px;
		background: var(--bg);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 2px;
	}
	.form-error {
		background: #fdecef;
		color: var(--danger);
		border-radius: 9px;
		padding: 9px 12px;
		font-size: 13.5px;
	}
	select.field {
		appearance: none;
		cursor: pointer;
	}
	.hint {
		display: block;
		margin-top: 5px;
		color: var(--muted);
		font-size: 12.5px;
		line-height: 1.45;
	}
	.hint code {
		font-size: 0.95em;
		padding: 1px 4px;
		border-radius: 4px;
		background: var(--line);
	}
</style>
