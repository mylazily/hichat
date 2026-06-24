<script lang="ts">
	import { t } from '$lib/stores/language';
	import { messages, isStreaming, sendMessage, stopStreaming } from '$lib/stores/chat';
	import ChatMessage from './ChatMessage.svelte';
	import ChatInput from './ChatInput.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean } = $props();

	let messagesEnd: HTMLDivElement = $state(undefined!);
	let scrollContainerEl: HTMLElement = $state(undefined!);
	let isAtBottom = $state(true);
	let isProgrammaticScroll = $state(false);
	let toastMessage = $state('');
	let toastVisible = $state(false);

	let hasMessages = $derived($messages.length > 0);

	// Prompt templates
	const promptTemplates = [
		{ label: '翻译', prompt: '请帮我翻译以下内容：' },
		{ label: '写作', prompt: '请帮我写一篇文章：' },
		{ label: '编程', prompt: '请帮我编写以下代码：' },
		{ label: '总结', prompt: '请帮我总结以下内容：' },
		{ label: '分析', prompt: '请帮我分析以下内容：' }
	];

	// Date separator helper
	function getDateKey(timestamp: number): string {
		const d = new Date(timestamp);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function formatDate(timestamp: number): string {
		const d = new Date(timestamp);
		const now = new Date();
		const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
		const key = getDateKey(timestamp);
		if (key === today) return '今天';
		if (key === yesterdayKey) return '昨天';
		return `${d.getMonth() + 1}月${d.getDate()}日`;
	}

	// Compute messages with date separators
	let messagesWithDates = $derived(() => {
		const result: Array<{ type: 'date'; date: string; key: string } | { type: 'message'; message: typeof $messages[0] }> = [];
		let lastDateKey = '';
		for (const msg of $messages) {
			const dateKey = getDateKey(msg.timestamp);
			if (dateKey !== lastDateKey) {
				result.push({ type: 'date', date: formatDate(msg.timestamp), key: dateKey });
				lastDateKey = dateKey;
			}
			result.push({ type: 'message', message: msg });
		}
		return result;
	});

	function showToast(msg: string) {
		toastMessage = msg;
		toastVisible = true;
	}

	function handleToastDone() {
		toastVisible = false;
	}

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
					{#each messagesWithDates() as item (item.type === 'date' ? item.key : item.message.id)}
						{#if item.type === 'date'}
							<div class="date-separator">
								<span class="date-separator-text">{item.date}</span>
							</div>
						{:else}
							<ChatMessage
								message={item.message}
								isStreaming={$isStreaming}
								isLastMessage={item.message === $messages[$messages.length - 1]}
								onCopy={showToast}
								onRegenerate={handleSend}
							/>
						{/if}
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

		<!-- Prompt templates bar (only when no messages) -->
		{#if !hasMessages}
			<div class="prompt-templates">
				{#each promptTemplates as tpl}
					<button
						class="prompt-template-btn"
						onclick={() => handleSend(tpl.prompt)}
					>
						{tpl.label}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Toast notification -->
		{#if toastVisible}
			<Toast message={toastMessage} onDone={handleToastDone} />
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
