<script lang="ts">
	import { t } from '$lib/stores/language';
	import VoiceInput from '$lib/components/VoiceInput.svelte';
	import { parseFile } from '$lib/api/files';

	let {
		onSend,
		onStop,
		isStreaming
	}: {
		onSend: (text: string, imageAttachments?: string[], fileAttachments?: { name: string; content: string }[]) => void;
		onStop: () => void;
		isStreaming: boolean;
	} = $props();

	let value = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let isRecording = $state(false);
	let attachedImages: string[] = $state([]);
	let attachedFiles: { name: string; content: string }[] = $state([]);
	let imageInputEl: HTMLInputElement | undefined = $state();
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
		if (!trimmed && attachedImages.length === 0 && attachedFiles.length === 0) return;
		onSend(trimmed, attachedImages.length > 0 ? attachedImages : undefined, attachedFiles.length > 0 ? attachedFiles : undefined);
		value = '';
		attachedImages = [];
		attachedFiles = [];
		if (textareaEl) {
			textareaEl.style.height = 'auto';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !(e as KeyboardEvent & { isComposing?: boolean }).isComposing) {
			e.preventDefault();
			handleSubmit(undefined);
		}
	}

	function handleVoiceResult(text: string) {
		value = value ? value + ' ' + text : text;
		isRecording = false;
	}

	function handleImageAttachClick() {
		if (imageInputEl) {
			imageInputEl.click();
		}
	}

	function handleFileAttachClick() {
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
		input.value = '';
	}

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		for (const file of files) {
			const parsed = await parseFile(file);
			if (parsed.isImage && parsed.imageDataUrl) {
				attachedImages = [...attachedImages, parsed.imageDataUrl];
			} else {
				attachedFiles = [...attachedFiles, { name: parsed.name, content: parsed.content }];
			}
		}
		input.value = '';
	}

	function removeImage(index: number) {
		attachedImages = attachedImages.filter((_, i) => i !== index);
	}

	function removeFile(index: number) {
		attachedFiles = attachedFiles.filter((_, i) => i !== index);
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

		<!-- File attachments -->
		{#if attachedFiles.length > 0}
			<div class="file-preview-container">
				{#each attachedFiles as file, i}
					<div class="file-preview">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
						<span class="file-preview-name">{file.name}</span>
						<button
							type="button"
							class="file-preview-remove"
							onclick={() => removeFile(i)}
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

		<!-- Hidden file inputs -->
		<input
			type="file"
			accept="image/*"
			multiple
			style="display: none;"
			bind:this={imageInputEl}
			onchange={handleImageUpload}
		/>
		<input
			type="file"
			accept=".txt,.md,.pdf,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.html,.css,.scss,.json,.xml,.yaml,.yml,.vue,.svelte"
			multiple
			style="display: none;"
			bind:this={fileInputEl}
			onchange={handleFileUpload}
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
						disabled={!value.trim() && attachedImages.length === 0 && attachedFiles.length === 0}
						class="chat-action-btn {value.trim() || attachedImages.length > 0 || attachedFiles.length > 0 ? 'chat-action-btn-active' : 'chat-action-btn-inactive'}"
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
						onclick={handleImageAttachClick}
						title="上传图片"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
					</button>
					<button
						type="button"
						class="chat-attach-btn"
						onclick={handleFileAttachClick}
						title="上传文件"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<polyline points="10 9 9 9 8 9" />
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

<style>
	.file-preview-container {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 8px;
		padding: 0 4px;
	}

	.file-preview {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		border-radius: var(--radius-xs);
		background: var(--dbx-fill-trans-10);
		border: 1px solid var(--dbx-line-7);
		font-size: 12px;
		color: var(--dbx-text-secondary);
	}

	.file-preview-name {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-preview-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--dbx-text-quaternary);
		cursor: pointer;
		padding: 0;
	}

	.file-preview-remove:hover {
		color: var(--dbx-function-danger);
		background: rgba(255, 59, 48, 0.08);
	}
</style>
