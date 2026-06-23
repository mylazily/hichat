<script lang="ts">
	import { t } from '$lib/stores/language';
	import { messages, isStreaming, sendMessage, stopStreaming } from '$lib/stores/chat';
	import ChatMessage from './ChatMessage.svelte';
	import ChatInput from './ChatInput.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';

	let { onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean } = $props();

	let messagesEnd: HTMLDivElement = $state(undefined!);
	let scrollContainerEl: HTMLElement = $state(undefined!);
	let isAtBottom = $state(true);
	let isProgrammaticScroll = $state(false);

	let hasMessages = $derived($messages.length > 0);

	function checkIsAtBottom() {
		if (isProgrammaticScroll) return;
		const el = scrollContainerEl;
		if (!el) return;
		isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
	}

	$effect(() => {
		const _items = $messages;
		const _streaming = $isStreaming;
		if (isAtBottom && messagesEnd) {
			isProgrammaticScroll = true;
			messagesEnd.scrollIntoView({ behavior: 'instant' });
			requestAnimationFrame(() => {
				isProgrammaticScroll = false;
			});
		}
	});

	function handleSend(text: string) {
		if ($isStreaming) return;
		sendMessage(text);
	}

	function handleStop() {
		if ($isStreaming) {
			stopStreaming();
		}
	}
</script>

<div class="chat-layout">
	<!-- Header -->
	<header class="header">
		<!-- Sidebar toggle (hamburger) - mobile only -->
		{#if onToggleSidebar}
			<button class="header-btn header-hamburger" onclick={onToggleSidebar} title="菜单">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 12h18M3 6h18M3 18h18" />
				</svg>
			</button>
		{/if}

		<!-- App title with pink gradient icon -->
		<div class="header-title-group">
			<div class="header-title-icon">
				<span class="header-title-icon-text">爱</span>
			</div>
			<h1 class="header-title">{$t.appTitle}</h1>
		</div>
	</header>

	<div class="chat-body">
		{#if hasMessages}
			<!-- Messages Area -->
			<div
				bind:this={scrollContainerEl}
				onscroll={checkIsAtBottom}
				class="messages-scroll"
			>
				<div class="messages-container">
					{#each $messages as message (message.id)}
						<ChatMessage {message} isStreaming={$isStreaming} isLastMessage={message === $messages[$messages.length - 1]} />
					{/each}

					<!-- Thinking indicator -->
					{#if $isStreaming && $messages.length > 0 && $messages[$messages.length - 1].role === 'user'}
						<div class="msg-ai" style="animation: fadeIn 0.2s ease;">
							<div class="msg-bot-color">
								<TypingIndicator />
							</div>
						</div>
					{/if}

					{#if messagesEnd}
						<div bind:this={messagesEnd}></div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Welcome Screen -->
			<div class="welcome-screen">
				<div class="welcome-icon">
					<span class="welcome-icon-text">爱</span>
				</div>
				<h2 class="welcome-title">{$t.welcomeTitle}</h2>
				<p class="welcome-subtitle">{$t.welcomeSubtitle}</p>
				<div class="suggestion-grid">
					{#each $t.presetQuestions as q, i}
						<button
							class="suggestion-card"
							onclick={() => handleSend(q)}
							style="animation: slideUp 0.3s ease {i * 0.06}s both;"
						>
							{q}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<ChatInput
			onSend={handleSend}
			onStop={handleStop}
			isStreaming={$isStreaming}
		/>
	</div>
</div>

<style>
	.chat-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--dbx-bg-content);
	}

	/* Hide hamburger on desktop */
	.header-hamburger {
		display: none;
	}

	@media (max-width: 768px) {
		.header-hamburger {
			display: flex;
		}
	}

	.header-title-group {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-title-icon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ec4899, #f43f5e);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.header-title-icon-text {
		color: white;
		font-size: 13px;
		font-weight: 700;
	}

	.chat-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.messages-scroll {
		flex: 1;
		overflow-y: auto;
	}

	.messages-container {
		max-width: 680px;
		margin: 0 auto;
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.welcome-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ec4899, #f43f5e);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20px;
		animation: fadeIn 0.4s ease;
	}

	.welcome-icon-text {
		color: white;
		font-size: 24px;
		font-weight: 700;
	}
</style>
