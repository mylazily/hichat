<script lang="ts">
	import { t, locale, toggleLocale } from '$lib/stores/language';
	import {
		sendMessage,
		resetChat,
		getStoredConversations,
		removeConversationFromStorage,
		loadConversation
	} from '$lib/stores/chat';
	import type { StoredConversation } from '$lib/stores/chat';
	import ChatInterface from './ChatInterface.svelte';
	import { onMount } from 'svelte';

	let sidebarOpen = $state(false);
	let storedConversations: StoredConversation[] = $state(getStoredConversations());
	let searchQuery = $state('');
	let pinnedIds: Set<string> = $state(new Set());

	// Load pinned IDs from localStorage
	function loadPinnedIds() {
		try {
			const saved = localStorage.getItem('hichat-pinned');
			if (saved) pinnedIds = new Set(JSON.parse(saved));
		} catch { /* ignore */ }
	}

	function savePinnedIds() {
		localStorage.setItem('hichat-pinned', JSON.stringify([...pinnedIds]));
	}

	function togglePin(id: string) {
		if (pinnedIds.has(id)) {
			pinnedIds.delete(id);
		} else {
			pinnedIds.add(id);
		}
		pinnedIds = new Set(pinnedIds);
		savePinnedIds();
	}

	let pinnedConversations = $derived(
		storedConversations.filter(c => pinnedIds.has(c.id))
	);

	let filteredConversations = $derived(
		searchQuery.trim()
			? storedConversations.filter(c => !pinnedIds.has(c.id) && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
			: storedConversations.filter(c => !pinnedIds.has(c.id))
	);

	onMount(() => {
		// Desktop: show sidebar by default; Mobile: hidden
		if (window.innerWidth > 768) {
			sidebarOpen = true;
		}
		loadPinnedIds();
	});

	function handleNewChat() {
		resetChat();
		storedConversations = getStoredConversations();
		if (window.innerWidth <= 768) sidebarOpen = false;
	}

	function handleRemoveConversation(id: string) {
		removeConversationFromStorage(id);
		storedConversations = getStoredConversations();
	}

	function handleLoadConversation(id: string) {
		loadConversation(id);
		sidebarOpen = false;
	}
</script>

<svelte:head>
	<title>爱爱 - AI 助手</title>
	<meta name="description" content="来自爱爱大学的 AI 助手，有什么想问的尽管问我哦~" />
</svelte:head>

<div class="app-layout">
	<!-- Sidebar overlay for mobile -->
	{#if sidebarOpen}
		<div class="sidebar-overlay" onclick={() => (sidebarOpen = false)} role="presentation"></div>
	{/if}

	<!-- Sidebar -->
	<aside class="sidebar {sidebarOpen ? '' : 'collapsed'}">
		<!-- Logo area -->
		<div class="sidebar-logo">
			<div class="sidebar-logo-icon">
				<span class="sidebar-logo-text">爱</span>
			</div>
			<span class="sidebar-logo-label">爱爱</span>
		</div>

		<!-- New chat button -->
		<div class="sidebar-header">
			<button class="sidebar-new-chat-btn" onclick={handleNewChat}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 5v14M5 12h14" />
				</svg>
				{$t.newChatButton}
			</button>
		</div>

		<!-- Search box -->
		<div class="sidebar-search" style="position: relative;">
			<span class="sidebar-search-icon">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
			</span>
			<input
				type="text"
				placeholder="搜索对话..."
				bind:value={searchQuery}
			/>
		</div>

		<!-- History list -->
		<div class="sidebar-history">
			<!-- Pinned conversations -->
			{#if pinnedConversations.length > 0}
				<div class="sidebar-section-label">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
						<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
					</svg>
					置顶对话
				</div>
				{#each pinnedConversations as conv}
					<button
						class="sidebar-history-item"
						onclick={() => handleLoadConversation(conv.id)}
					>
						<span class="sidebar-history-item-title">{conv.title}</span>
						<span
							class="sidebar-history-item-pin"
							onclick={(e) => { e.stopPropagation(); togglePin(conv.id); }}
							role="button"
							tabindex="0"
							title="取消置顶"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
								<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
							</svg>
						</span>
						<span
							class="sidebar-history-item-delete"
							onclick={(e) => { e.stopPropagation(); handleRemoveConversation(conv.id); }}
							role="button"
							tabindex="0"
						>
							<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</span>
					</button>
				{/each}
			{/if}

			<div class="sidebar-section-label">{$t.chatHistory}</div>
			{#if filteredConversations.length > 0}
				{#each filteredConversations as conv}
					<button
						class="sidebar-history-item"
						onclick={() => handleLoadConversation(conv.id)}
					>
						<span class="sidebar-history-item-title">{conv.title}</span>
						<span
							class="sidebar-history-item-pin"
							onclick={(e) => { e.stopPropagation(); togglePin(conv.id); }}
							role="button"
							tabindex="0"
							title="置顶"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
							</svg>
						</span>
						<span
							class="sidebar-history-item-delete"
							onclick={(e) => { e.stopPropagation(); handleRemoveConversation(conv.id); }}
							role="button"
							tabindex="0"
						>
							<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</span>
					</button>
				{/each}
			{:else}
				<div class="sidebar-empty">
					{searchQuery ? '没有找到匹配的对话' : $t.noConversations}
				</div>
			{/if}
		</div>

		<!-- Prompt templates -->
		<div class="sidebar-templates">
			<div class="sidebar-section-label">快捷提示</div>
			<div class="sidebar-templates-grid">
				<button class="sidebar-template-btn" onclick={() => { sendMessage('请帮我翻译以下内容：'); if (window.innerWidth <= 768) sidebarOpen = false; }}>
					翻译
				</button>
				<button class="sidebar-template-btn" onclick={() => { sendMessage('请帮我写一篇文章：'); if (window.innerWidth <= 768) sidebarOpen = false; }}>
					写作
				</button>
				<button class="sidebar-template-btn" onclick={() => { sendMessage('请帮我编写以下代码：'); if (window.innerWidth <= 768) sidebarOpen = false; }}>
					编程
				</button>
				<button class="sidebar-template-btn" onclick={() => { sendMessage('请帮我总结以下内容：'); if (window.innerWidth <= 768) sidebarOpen = false; }}>
					总结
				</button>
				<button class="sidebar-template-btn" onclick={() => { sendMessage('请帮我分析以下内容：'); if (window.innerWidth <= 768) sidebarOpen = false; }}>
					分析
				</button>
			</div>
		</div>

		<!-- Sidebar footer with language toggle -->
		<div class="sidebar-footer">
			<button
				onclick={toggleLocale}
				class="sidebar-lang-btn"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<path d="M2 12h20" />
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
				</svg>
				{$locale === 'en' ? '中文' : 'English'}
			</button>
		</div>
	</aside>

	<!-- Main content -->
	<main class="main-content">
		<ChatInterface
			onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
			{sidebarOpen}
		/>
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: var(--dbx-bg-content);
	}

	/* Sidebar logo */
	.sidebar-logo {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px;
		border-bottom: 1px solid var(--dbx-line-7);
	}

	.sidebar-logo-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ec4899, #f43f5e);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sidebar-logo-text {
		color: white;
		font-size: 14px;
		font-weight: 700;
	}

	.sidebar-logo-label {
		font-size: 15px;
		font-weight: 600;
		color: var(--dbx-text-primary);
	}

	/* Sidebar header */
	.sidebar-header {
		padding: 12px 16px;
		border-bottom: 1px solid var(--dbx-line-7);
	}

	.sidebar-new-chat-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		padding: 10px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-secondary);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.sidebar-new-chat-btn:hover {
		background: var(--dbx-fill-trans-10);
		border-color: rgba(0, 102, 255, 0.3);
	}

	/* Sidebar history */
	.sidebar-history {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.sidebar-section-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--dbx-text-quaternary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 8px 12px;
	}

	.sidebar-history-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		border: none;
		background: transparent;
		color: var(--dbx-text-secondary);
		font-size: 13px;
		cursor: pointer;
		transition: background var(--transition-fast);
		text-align: left;
	}

	.sidebar-history-item:hover {
		background: var(--dbx-fill-trans-10);
	}

	.sidebar-history-item-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sidebar-history-item-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xxs);
		color: var(--dbx-text-quaternary);
		opacity: 0;
		transition: all var(--transition-fast);
	}

	.sidebar-history-item:hover .sidebar-history-item-delete {
		opacity: 1;
	}

	.sidebar-history-item-delete:hover {
		background: rgba(255, 59, 48, 0.08);
		color: var(--dbx-function-danger);
	}

	.sidebar-history-item-pin {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xxs);
		color: var(--dbx-text-quaternary);
		opacity: 0;
		transition: all var(--transition-fast);
	}

	.sidebar-history-item:hover .sidebar-history-item-pin {
		opacity: 1;
	}

	.sidebar-history-item-pin:hover {
		color: var(--dbx-brand-primary);
	}

	/* Sidebar templates */
	.sidebar-templates {
		padding: 8px 12px;
		border-top: 1px solid var(--dbx-line-7);
	}

	.sidebar-templates-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 4px 0;
	}

	.sidebar-template-btn {
		padding: 6px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-tertiary);
		font-size: 12px;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.sidebar-template-btn:hover {
		border-color: var(--dbx-brand-primary);
		color: var(--dbx-brand-primary);
		background: rgba(0, 102, 255, 0.04);
	}

	.sidebar-empty {
		padding: 8px 12px;
		color: var(--dbx-text-quaternary);
		font-size: 12px;
	}

	/* Sidebar footer */
	.sidebar-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--dbx-line-7);
	}

	.sidebar-lang-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		border: none;
		background: transparent;
		color: var(--dbx-text-tertiary);
		font-size: 12px;
		cursor: pointer;
		width: 100%;
		transition: background var(--transition-fast);
	}

	.sidebar-lang-btn:hover {
		background: var(--dbx-fill-trans-10);
	}

	@media (max-width: 768px) {
		.sidebar-logo {
			padding: 12px 16px;
		}
	}
</style>
