<script lang="ts">
	import { t } from '$lib/stores/language';
	import VoiceInput from '$lib/components/VoiceInput.svelte';

	let {
		onSend,
		onStop,
		isStreaming
	}: {
		onSend: (text: string) => void;
		onStop: () => void;
		isStreaming: boolean;
	} = $props();

	let value = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let isRecording = $state(false);
	let attachedImages: string[] = $state([]);
	let fileInputEl: HTMLInputElement | undefined = $state();

	// Auto-resize textarea
	$effect(() => {
		const _ = value;
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
		}
	});

	function handleSubmit(e: Event | undefined) {
		if (e) e.preventDefault();
		const trimmed = value.trim();
		if (!trimmed && attachedImages.length === 0) return;
		onSend(trimmed);
		value = '';
		attachedImages = [];
		if (textareaEl) {
			textareaEl.style.height = 'auto';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !(e as KeyboardEvent & { isComposing?: boolean }).isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function handleVoiceResult(text: string) {
		value = value ? value + ' ' + text : text;
		isRecording = false;
	}

	function handleAttachClick() {
		if (fileInputEl) {
			fileInputEl.click();
		}
	}

	function handleImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		for (const file of files) {
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = () => {
					attachedImages = [...attachedImages, reader.result as string];
				};
				reader.readAsDataURL(file);
			}
		}
		// Reset input so same file can be selected again
		input.value = '';
	}

	function removeImage(index: number) {
		attachedImages = attachedImages.filter((_, i) => i !== index);
	}
</script>

<div class="chat-input-container mobile-safe-bottom">
	<form onsubmit={handleSubmit} class="chat-input-form">
		<!-- Image preview thumbnails -->
		{#if attachedImages.length > 0}
			<div class="image-preview-container">
				{#each attachedImages as img, i}
					<div class="image-preview">
						<img src={img} alt="预览" />
						<button
							type="button"
							class="image-preview-remove"
							onclick={() => removeImage(i)}
							title="移除"
						>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Hidden file input for image upload -->
		<input
			type="file"
			accept="image/*"
			multiple
			style="display: none;"
			bind:this={fileInputEl}
			onchange={handleImageUpload}
		/>

		<div class="chat-input-wrapper">
			<!-- Textarea -->
			<textarea
				bind:this={textareaEl}
				bind:value
				onkeydown={handleKeyDown}
				placeholder={$t.inputPlaceholder}
				disabled={isStreaming}
				rows={1}
				class="chat-textarea"
			></textarea>
			<!-- Action button -->
			<div class="chat-action-btn-container">
				{#if isStreaming}
					<button
						type="button"
						onclick={onStop}
						class="chat-action-btn chat-action-btn-stop"
						title="停止生成"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="6" width="12" height="12" rx="2" />
						</svg>
					</button>
				{:else}
					<button
						type="submit"
						disabled={!value.trim() && attachedImages.length === 0}
						class="chat-action-btn {value.trim() || attachedImages.length > 0 ? 'chat-action-btn-active' : 'chat-action-btn-inactive'}"
						title="发送"
					>
						<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
						</svg>
					</button>
				{/if}
			</div>
			<!-- Bottom toolbar -->
			<div class="chat-toolbar">
				<div style="display: flex; align-items: center; gap: 4px;">
					<VoiceInput onResult={handleVoiceResult} isRecording={isRecording} />
					<button
						type="button"
						class="chat-attach-btn"
						onclick={handleAttachClick}
						title="上传图片"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
					</button>
				</div>
				<span class="chat-hint">
					Enter {$t.sendButton}, Shift+Enter 换行
				</span>
			</div>
		</div>
	</form>
</div>
