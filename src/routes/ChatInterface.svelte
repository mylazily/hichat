<script lang="ts">
	import { t } from '$lib/stores/language';
	import { messages, isStreaming, sendMessage, stopStreaming, resetChat } from '$lib/stores/chat';
	import ChatMessage from './ChatMessage.svelte';
	import ChatInput from './ChatInput.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';

	let { onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean } = $props();

	let showSettings = $state(false);
	let messagesEnd: HTMLDivElement;
	let scrollContainerEl: HTMLElement;
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

	function handleResetChat() {
		resetChat();
	}
</script>

<div style="display: flex; flex-direction: column; height: 100%; background: var(--dbx-bg-body);">
	<!-- Header -->
	<header class="header">
		<!-- Sidebar toggle (hamburger) -->
		{#if onToggleSidebar}
			<button class="header-btn" onclick={onToggleSidebar}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 12h18M3 6h18M3 18h18" />
				</svg>
			</button>
		{/if}

		<!-- Current conversation title -->
		<div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;">
			<div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #f43f5e); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
				<span style="color: white; font-size: 12px; font-weight: 700;">爱</span>
			</div>
			<h1 class="header-title">{$t.appTitle}</h1>
		</div>

		<!-- New chat button -->
		{#if hasMessages}
			<button class="header-btn" onclick={handleResetChat}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 5v14M5 12h14" />
				</svg>
				{$t.newChatButton}
			</button>
		{/if}

		<!-- Settings button -->
		<button class="header-btn" onclick={() => showSettings = true}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
				<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
			</svg>
		</button>
	</header>

	<div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
		{#if hasMessages}
			<!-- Messages Area -->
			<div
				bind:this={scrollContainerEl}
				onscroll={checkIsAtBottom}
				style="flex: 1; overflow-y: auto;"
			>
				<div style="max-width: 680px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px;">
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
				<div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #f43f5e); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; animation: fadeIn 0.4s ease;">
					<span style="color: white; font-size: 24px;">💕</span>
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

{#if showSettings}
	<SettingsModal onClose={() => showSettings = false} />
{/if}
