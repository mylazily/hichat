<script lang="ts">
	import type { Message } from '$lib/stores/chat';
	import Markdown from '$lib/components/Markdown.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';
	import ToolIndicator from '$lib/components/ToolIndicator.svelte';
	import CitationCard from '$lib/components/CitationCard.svelte';
	import QuizCard from '$lib/components/QuizCard.svelte';
	import PipelineProgress from '$lib/components/PipelineProgress.svelte';
	import { t } from '$lib/stores/language';

	interface Props {
		message: Message;
		isStreaming?: boolean;
		isLastMessage?: boolean;
		onCopy?: (msg: string) => void;
		onRegenerate?: (text: string) => void;
	}

	let { message, isStreaming = false, isLastMessage = false, onCopy, onRegenerate }: Props = $props();

	let thinkingExpanded = $state(false);

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

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			if (onCopy) onCopy('已复制到剪贴板');
		}).catch(() => {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			if (onCopy) onCopy('已复制到剪贴板');
		});
	}

	function exportChat() {
		const text = message.content;
		const blob = new Blob([text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `chat-export-${Date.now()}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

{#if message.role === 'user'}
	<!-- User message: light gray bubble, right-aligned, NO avatar -->
	<div class="msg-user">
		<div>
			<div class="msg-user-content">
				{message.content}
			</div>
			<div class="msg-actions" style="justify-content: flex-end;">
				<button class="msg-action-btn" onclick={() => copyToClipboard(message.content)} title="复制">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
					</svg>
					复制
				</button>
			</div>
		</div>
	</div>

{:else if message.role === 'assistant' && message.multimodalType === 'image'}
	<!-- AI image message -->
	<div class="msg-ai">
		<div class="msg-ai-inner">
			{#if message.generationStatus === 'generating' || message.generationStatus === 'polling'}
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
			<!-- Tool call indicators -->
			{#if message.toolCalls && message.toolCalls.length > 0}
				<ToolIndicator toolCalls={message.toolCalls} />
			{/if}

			<!-- Pipeline progress -->
			{#if message.pipelineSteps && message.pipelineSteps.length > 0}
				<PipelineProgress steps={message.pipelineSteps} />
			{/if}

			<!-- Thinking block -->
			{#if message.isStreaming && message.content === '' && !message.toolCalls}
				<div class="thinking-block">
					<div class="thinking-header" onclick={() => thinkingExpanded = !thinkingExpanded}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4M12 8h.01" />
						</svg>
						正在思考...
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; transition: transform 0.2s; transform: rotate({thinkingExpanded ? 180 : 0}deg);">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</div>
					{#if thinkingExpanded}
						<div class="thinking-content">
							<TypingIndicator />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Thinking content (from AI response) -->
			{#if message.thinkingContent && message.showThinking && !message.isStreaming}
				<div class="thinking-block">
					<div class="thinking-header" onclick={() => { message.showThinking = !message.showThinking; }}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4M12 8h.01" />
						</svg>
						{$t.thinking}
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; transition: transform 0.2s; transform: rotate({message.showThinking ? 180 : 0}deg);">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</div>
					{#if message.showThinking}
						<div class="thinking-content">
							{message.thinkingContent}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Research topic badge -->
			{#if message.researchTopic}
				<div class="research-badge">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					{$t.researchMode}: {message.researchTopic}
				</div>
			{/if}

			<div class="msg-bot-color">
				{#if message.isStreaming && message.content === '' && !thinkingExpanded && !message.toolCalls}
					<TypingIndicator />
				{:else if message.content}
					<Markdown content={message.content} />
					{#if message.isStreaming && isLastMessage}
						<span class="streaming-cursor"></span>
					{/if}
				{:else if !message.toolCalls}
					<TypingIndicator />
				{/if}
			</div>

			<!-- Citation cards -->
			{#if message.citations && message.citations.length > 0}
				<CitationCard citations={message.citations} />
			{/if}

			<!-- Quiz card -->
			{#if message.quizQuestions && message.quizQuestions.length > 0}
				<QuizCard questions={message.quizQuestions} />
			{/if}

			<!-- Action buttons for AI text messages -->
			{#if message.content && !message.isStreaming}
				<div class="msg-actions">
					<button class="msg-action-btn" onclick={() => copyToClipboard(message.content)} title="复制">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
						</svg>
						复制
					</button>
					{#if isLastMessage && message.role === 'assistant' && onRegenerate}
						<button class="msg-action-btn" onclick={() => onRegenerate('__regenerate__')} title="重新生成">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="23 4 23 10 17 10" />
								<path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
							</svg>
							重新生成
						</button>
					{/if}
					<button class="msg-action-btn" onclick={exportChat} title="导出">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						导出
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
