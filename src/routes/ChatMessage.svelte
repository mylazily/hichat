<script lang="ts">
	import type { Message } from '$lib/stores/chat';
	import Markdown from '$lib/components/Markdown.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';

	interface Props {
		message: Message;
		isStreaming?: boolean;
		isLastMessage?: boolean;
	}

	let { message, isStreaming = false, isLastMessage = false }: Props = $props();
</script>

{#if message.role === 'user'}
	<div class="msg-user">
		<div class="msg-user-content">
			{message.content}
		</div>
	</div>
{:else if message.role === 'assistant'}
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
