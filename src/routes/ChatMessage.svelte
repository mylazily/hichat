<script lang="ts">
	import type { Message } from '$lib/stores/chat';
	import Markdown from '$lib/components/Markdown.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';
	import { t } from '$lib/stores/language';

	interface Props {
		message: Message;
		isStreaming?: boolean;
		isLastMessage?: boolean;
	}

	let { message, isStreaming = false, isLastMessage = false }: Props = $props();

	function downloadFile(url: string, filename: string) {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
</script>

{#if message.role === 'user'}
	<!-- User message: light gray bubble, right-aligned, NO avatar -->
	<div class="msg-user">
		<div class="msg-user-content">
			{message.content}
		</div>
	</div>

{:else if message.role === 'assistant' && message.multimodalType === 'image'}
	<!-- AI image message -->
	<div class="msg-ai">
		<div class="msg-ai-inner">
			{#if message.generationStatus === 'generating' || message.generationStatus === 'polling'}
				<!-- Image generating: skeleton placeholder 1:1 ratio with spinner -->
				<div class="gen-card">
					<div class="gen-skeleton gen-skeleton-image">
						<div class="gen-skeleton-spinner">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 12a9 9 0 11-6.219-8.56" />
							</svg>
							<span>{$t.generatingImage}</span>
						</div>
					</div>
				</div>
			{:else if message.generationStatus === 'ready' && message.imageUrl}
				<!-- Image ready: image display + download button -->
				<div class="gen-card">
					<div class="gen-image">
						<img src={message.imageUrl} alt={message.content || '生成的图片'} loading="lazy" />
					</div>
					<button
						class="gen-download-btn"
						onclick={() => downloadFile(message.imageUrl!, '爱爱生成图片.png')}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						{$t.downloadButton}
					</button>
				</div>
			{:else if message.generationStatus === 'error'}
				<!-- Image error -->
				<div class="gen-error">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10" />
						<line x1="15" y1="9" x2="9" y2="15" />
						<line x1="9" y1="9" x2="15" y2="15" />
					</svg>
					<span>{$t.generationError}{message.generationError ? `: ${message.generationError}` : ''}</span>
				</div>
			{/if}
		</div>
	</div>

{:else if message.role === 'assistant' && message.multimodalType === 'video'}
	<!-- AI video message -->
	<div class="msg-ai">
		<div class="msg-ai-inner">
			{#if message.generationStatus === 'generating'}
				<!-- Video generating: skeleton placeholder 16:9 ratio with spinner -->
				<div class="gen-card">
					<div class="gen-skeleton gen-skeleton-video">
						<div class="gen-skeleton-spinner">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 12a9 9 0 11-6.219-8.56" />
							</svg>
							<span>{$t.generatingVideo}</span>
						</div>
					</div>
				</div>
			{:else if message.generationStatus === 'polling'}
				<!-- Video polling -->
				<div class="gen-card">
					<div class="gen-skeleton gen-skeleton-video">
						<div class="gen-skeleton-spinner">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 12a9 9 0 11-6.219-8.56" />
							</svg>
							<span>{$t.videoPolling}</span>
						</div>
					</div>
				</div>
			{:else if message.generationStatus === 'ready' && message.videoUrl}
				<!-- Video ready: video player + download button -->
				<div class="gen-card">
					<div class="gen-video">
						<video controls playsinline preload="metadata">
							<source src={message.videoUrl} type="video/mp4" />
							你的浏览器不支持视频播放
						</video>
					</div>
					<button
						class="gen-download-btn"
						onclick={() => downloadFile(message.videoUrl!, '爱爱生成视频.mp4')}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						{$t.downloadButton}
					</button>
				</div>
			{:else if message.generationStatus === 'error'}
				<!-- Video error -->
				<div class="gen-error">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10" />
						<line x1="15" y1="9" x2="9" y2="15" />
						<line x1="9" y1="9" x2="15" y2="15" />
					</svg>
					<span>{$t.generationError}{message.generationError ? `: ${message.generationError}` : ''}</span>
				</div>
			{/if}
		</div>
	</div>

{:else if message.role === 'assistant'}
	<!-- AI text message: NO background, NO bubble, plain text left-aligned, NO avatar -->
	<div class="msg-ai">
		<div class="msg-ai-inner">
			<div class="msg-bot-color">
				{#if message.isStreaming && message.content === ''}
					<TypingIndicator />
				{:else if message.content}
					<Markdown content={message.content} />
					{#if message.isStreaming && isLastMessage}
						<span class="streaming-cursor"></span>
					{/if}
				{:else}
					<TypingIndicator />
				{/if}
			</div>
		</div>
	</div>
{/if}
