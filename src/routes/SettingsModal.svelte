<script lang="ts">
	interface Props {
		apiKey: string;
		selectedModel: string;
		models: string[];
		onSave: (key: string, model: string) => void;
		onClose: () => void;
		onLoadModels: () => void;
	}

	let { apiKey, selectedModel, models, onSave, onClose, onLoadModels }: Props = $props();

	let localKey = $state(apiKey);
	let localModel = $state(selectedModel);
	let showKey = $state(false);

	function handleSave() {
		onSave(localKey.trim(), localModel);
	}
</script>

<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onclick={onClose} role="presentation">
	<div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-t-2xl md:rounded-2xl w-full max-w-md mx-0 md:mx-4 p-5 md:p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
		<div class="flex items-center justify-between mb-5">
			<h2 class="text-lg font-semibold text-[#e8e8e8]">设置</h2>
			<button onclick={onClose} class="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#888] transition-colors no-select" aria-label="关闭">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<div class="space-y-5">
			<!-- API Key -->
			<div>
				<label class="block text-sm font-medium text-[#a0a0a0] mb-2" for="api-key">Agnes AI API Key</label>
				<div class="relative">
					<input
						id="api-key"
						type={showKey ? 'text' : 'password'}
						bind:value={localKey}
						placeholder="sk-..."
						class="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#555] focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/30 outline-none transition-all pr-12"
					/>
					<button
						onclick={() => showKey = !showKey}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#e8e8e8] transition-colors p-1"
						aria-label={showKey ? '隐藏' : '显示'}
					>
						{#if showKey}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
							</svg>
						{/if}
					</button>
				</div>
				<p class="text-xs text-[#666] mt-1.5">API Key 仅存储在本地浏览器中</p>
			</div>

			<!-- Model Selection -->
			<div>
				<div class="flex items-center justify-between mb-2">
					<label class="block text-sm font-medium text-[#a0a0a0]" for="model-select">模型</label>
					<button
						onclick={onLoadModels}
						class="text-xs text-[#4f46e5] hover:text-[#7c3aed] transition-colors no-select"
						disabled={!localKey}
					>
						刷新模型列表
					</button>
				</div>
				{#if models.length > 0}
					<select
						id="model-select"
						bind:value={localModel}
						class="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/30 outline-none transition-all appearance-none cursor-pointer"
					>
						{#each models as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				{:else}
					<input
						id="model-select"
						type="text"
						bind:value={localModel}
						placeholder="输入模型名称"
						class="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#555] focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/30 outline-none transition-all"
					/>
				{/if}
			</div>
		</div>

		<div class="flex gap-3 mt-6">
			<button
				onclick={onClose}
				class="flex-1 px-4 py-3 rounded-xl border border-[#2a2a2a] text-sm text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors no-select"
			>
				取消
			</button>
			<button
				onclick={handleSave}
				class="flex-1 px-4 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-sm text-white font-medium transition-colors no-select active:scale-[0.98]"
			>
				保存
			</button>
		</div>
	</div>
</div>
