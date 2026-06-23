<script lang="ts">
	import { t } from '$lib/stores/language';
	import { apiKey, selectedModel, models, loadModels, saveSettings } from '$lib/stores/chat';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	const BUILT_IN_KEY = 'sk-1fl1DqnHZ29eMviDFAJTY6nnLVlpdst3j9ybnJcvXuWVKbu8';
	let useCustomKey = $state($apiKey !== BUILT_IN_KEY && $apiKey !== '');
	let localKey = $state($apiKey === BUILT_IN_KEY ? '' : $apiKey);
	let localModel = $state($selectedModel);
	let showKey = $state(false);

	function handleSave() {
		const keyToSave = useCustomKey ? localKey.trim() : BUILT_IN_KEY;
		saveSettings(keyToSave, localModel);
		onClose();
	}
</script>

<div class="settings-overlay" onclick={onClose} role="presentation">
	<div class="settings-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
		<!-- Header -->
		<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
			<h2 style="font-size: 18px; font-weight: 600; color: var(--dbx-text-primary);">{$t.settings}</h2>
			<button
				onclick={onClose}
				style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-lg); border: none; background: transparent; color: var(--dbx-text-tertiary); cursor: pointer; transition: background var(--transition-fast);"
				onmouseenter={(e) => (e.currentTarget.style.background = 'var(--dbx-fill-trans-10)')}
				onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
			>
				<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div style="display: flex; flex-direction: column; gap: 20px;">
			<!-- API Key Mode Toggle -->
			<div style="background: var(--dbx-bg-elevated); border-radius: var(--radius-xl); padding: 16px; border: 1px solid var(--dbx-line-7);">
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
					<span style="font-size: 14px; font-weight: 500; color: var(--dbx-text-primary);">{$t.apiSource}</span>
					<div style="display: flex; background: var(--dbx-bg-surface); border-radius: var(--radius-md); padding: 2px; border: 1px solid var(--dbx-line-7);">
						<button
							onclick={() => useCustomKey = false}
							style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: all var(--transition-fast); {useCustomKey ? 'color: var(--dbx-text-tertiary); background: transparent;' : 'background: var(--dbx-text-primary); color: white;'}"
						>
							{$t.builtIn}
						</button>
						<button
							onclick={() => useCustomKey = true}
							style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: all var(--transition-fast); {useCustomKey ? 'background: var(--dbx-text-primary); color: white;' : 'color: var(--dbx-text-tertiary); background: transparent;'}"
						>
							{$t.custom}
						</button>
					</div>
				</div>
				{#if !useCustomKey}
					<p style="font-size: 12px; color: var(--dbx-text-tertiary);">{$t.builtInDesc}</p>
				{:else}
					<div style="position: relative;">
						<input
							type={showKey ? 'text' : 'password'}
							bind:value={localKey}
							placeholder={$t.customKeyPlaceholder}
							style="width: 100%; background: var(--dbx-bg-surface); border: 1px solid var(--dbx-line-7); border-radius: var(--radius-lg); padding: 10px 40px 10px 14px; font-size: 13px; color: var(--dbx-text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box;"
							onfocus={(e) => (e.currentTarget.style.borderColor = 'var(--dbx-fill-primary)')}
							onblur={(e) => (e.currentTarget.style.borderColor = 'var(--dbx-line-7)')}
						/>
						<button
							onclick={() => showKey = !showKey}
							style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--dbx-text-tertiary); cursor: pointer; padding: 4px; display: flex; align-items: center;"
						>
							{#if showKey}
								<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
								</svg>
							{:else}
								<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
								</svg>
							{/if}
						</button>
					</div>
					<p style="font-size: 12px; color: var(--dbx-text-tertiary); margin-top: 6px;">{$t.customKeyHint}</p>
				{/if}
			</div>

			<!-- Model Selection -->
			<div>
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
					<label style="font-size: 14px; font-weight: 500; color: var(--dbx-text-secondary);">{$t.model}</label>
					<button
						onclick={loadModels}
						style="font-size: 12px; color: var(--dbx-fill-primary); background: transparent; border: none; cursor: pointer;"
					>
						{$t.refreshModels}
					</button>
				</div>
				{#if $models.length > 0}
					<select
						bind:value={localModel}
						style="width: 100%; background: var(--dbx-bg-elevated); border: 1px solid var(--dbx-line-7); border-radius: var(--radius-lg); padding: 10px 14px; font-size: 13px; color: var(--dbx-text-primary); outline: none; appearance: none; cursor: pointer; box-sizing: border-box;"
					>
						{#each $models as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				{:else}
					<input
						type="text"
						bind:value={localModel}
						placeholder={$t.modelPlaceholder}
						style="width: 100%; background: var(--dbx-bg-elevated); border: 1px solid var(--dbx-line-7); border-radius: var(--radius-lg); padding: 10px 14px; font-size: 13px; color: var(--dbx-text-primary); outline: none; box-sizing: border-box;"
					/>
				{/if}
			</div>
		</div>

		<!-- Action buttons -->
		<div style="display: flex; gap: 10px; margin-top: 24px;">
			<button
				onclick={onClose}
				style="flex: 1; padding: 10px; border-radius: var(--radius-lg); border: 1px solid var(--dbx-line-7); background: var(--dbx-bg-surface); color: var(--dbx-text-tertiary); font-size: 14px; cursor: pointer; transition: background var(--transition-fast);"
				onmouseenter={(e) => (e.currentTarget.style.background = 'var(--dbx-fill-trans-10)')}
				onmouseleave={(e) => (e.currentTarget.style.background = 'var(--dbx-bg-surface)')}
			>
				{$t.cancel}
			</button>
			<button
				onclick={handleSave}
				style="flex: 1; padding: 10px; border-radius: var(--radius-lg); border: none; background: var(--dbx-text-primary); color: var(--dbx-bg-surface); font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity var(--transition-fast);"
				onmouseenter={(e) => (e.currentTarget.style.opacity = '0.85')}
				onmouseleave={(e) => (e.currentTarget.style.opacity = '1')}
			>
				{$t.save}
			</button>
		</div>
	</div>
</div>
