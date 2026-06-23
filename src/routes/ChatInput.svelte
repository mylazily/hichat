<script lang="ts">
	interface Props {
		value: string;
		isStreaming: boolean;
		onSend: () => void;
		onKeydown: (e: KeyboardEvent) => void;
	}

	let { value = $bindable(), isStreaming, onSend, onKeydown }: Props = $props();

	let textarea: HTMLTextAreaElement;

	function autoResize() {
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
		}
	}

	$effect(() => {
		autoResize();
	});
</script>

<div class="max-w-4xl mx-auto relative">
	<div class="flex items-end gap-1.5 md:gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-3 py-2.5 md:px-4 md:py-3 focus-within:border-[#4f46e5] focus-within:ring-1 focus-within:ring-[#4f46e5]/30 transition-all">
		<textarea
			bind:this={textarea}
			bind:value
			onkeydown={onKeydown}
			placeholder={isStreaming ? 'AI 正在回复...' : '输入消息...'}
			disabled={isStreaming}
			rows="1"
			class="flex-1 bg-transparent text-sm text-[#e8e8e8] placeholder-[#555] resize-none outline-none min-h-[22px] max-h-[120px] py-0.5"
		></textarea>
		<button
			onclick={onSend}
			disabled={isStreaming || !value.trim()}
			class="p-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex-shrink-0 no-select active:scale-90"
			aria-label="发送"
		>
			{#if isStreaming}
				<svg class="w-4 h-4 md:w-5 md:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			{:else}
				<svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
				</svg>
			{/if}
		</button>
	</div>
</div>
