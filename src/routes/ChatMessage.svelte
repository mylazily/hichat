<script lang="ts">
	import type { Message } from '$lib/stores/chat';

	interface Props {
		message: Message;
	}

	let { message }: Props = $props();

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString('zh-CN', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatContent(content: string): string {
		let formatted = content
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
			.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');
		return formatted;
	}
</script>

<div class="flex gap-2.5 md:gap-4 max-w-4xl mx-auto {message.role === 'user' ? 'flex-row-reverse' : ''}">
	<!-- Avatar -->
	<div class="flex-shrink-0">
		{#if message.role === 'user'}
			<div class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white text-xs md:text-sm font-medium">
				U
			</div>
		{:else}
			<div class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center">
				<svg class="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0 {message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col">
		<div class="max-w-[92%] md:max-w-[85%] {message.role === 'user' ? 'bg-[#4f46e5] text-white' : 'bg-[#1a1a1a] text-[#e8e8e8]'} rounded-2xl rounded-{message.role === 'user' ? 'tr' : 'tl'}-sm px-3.5 py-2.5 md:px-4 md:py-3 text-sm leading-relaxed">
			{#if message.isStreaming && message.content === ''}
				<div class="flex items-center gap-1 py-1">
					<div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0s"></div>
					<div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s"></div>
					<div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.4s"></div>
				</div>
			{:else}
				<div class="prose prose-invert prose-sm max-w-none break-words">
					{@html formatContent(message.content)}
				</div>
			{/if}
		</div>
		<span class="text-[10px] md:text-xs text-[#555] mt-0.5 md:mt-1 px-1">{formatTime(message.timestamp)}</span>
	</div>
</div>

<style>
	:global(.code-block) {
		background: #0d0d0d;
		border: 1px solid #2a2a2a;
		border-radius: 0.5rem;
		padding: 0.625rem 0.875rem;
		overflow-x: auto;
		font-family: 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0.375rem 0;
		-webkit-overflow-scrolling: touch;
	}
	:global(.inline-code) {
		background: rgba(255,255,255,0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.85em;
	}
	:global(.prose) {
		color: inherit;
	}
	:global(.prose br) {
		content: '';
		display: block;
		margin-bottom: 0.375rem;
	}
</style>
