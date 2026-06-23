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
		// 简单的 markdown 处理：代码块
		let formatted = content
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
			.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');
		return formatted;
	}
</script>

<div class="flex gap-4 max-w-4xl mx-auto {message.role === 'user' ? 'flex-row-reverse' : ''}">
	<!-- Avatar -->
	<div class="flex-shrink-0">
		{#if message.role === 'user'}
			<div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white text-sm font-medium">
				U
			</div>
		{:else}
			<div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center">
				<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0 {message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col">
		<div class="max-w-[85%] {message.role === 'user' ? 'bg-[#4f46e5] text-white' : 'bg-[#1a1a1a] text-[#e8e8e8]'} rounded-2xl px-4 py-3 text-sm leading-relaxed">
			{#if message.isStreaming && message.content === ''}
				<div class="flex items-center gap-1">
					<div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0s"></div>
					<div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s"></div>
					<div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.4s"></div>
				</div>
			{:else}
				<div class="prose prose-invert prose-sm max-w-none">
					{@html formatContent(message.content)}
				</div>
			{/if}
		</div>
		<span class="text-xs text-[#555] mt-1 px-1">{formatTime(message.timestamp)}</span>
	</div>
</div>

<style>
	:global(.code-block) {
		background: #0d0d0d;
		border: 1px solid #2a2a2a;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		overflow-x: auto;
		font-family: 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		margin: 0.5rem 0;
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
		margin-bottom: 0.5rem;
	}
</style>
