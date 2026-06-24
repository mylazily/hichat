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
	import {
		memoryEntries,
		memoryEnabled,
		toggleMemory,
		removeMemory,
		clearMemory
	} from '$lib/stores/memory';
	import ChatInterface from './ChatInterface.svelte';
	import { onMount } from 'svelte';

	let sidebarOpen = $state(false);
	let storedConversations: StoredConversation[] = $state(getStoredConversations());
	let searchQuery = $state('');
	let pinnedIds: Set<string> = $state(new Set());

	// Memory panel
	let memoryPanelOpen = $state(false);

	// Theme
	type Theme = 'light' | 'dark' | 'auto';
	let theme: Theme = $state('auto');

	function loadTheme() {
		if (typeof window === 'undefined') return;
		const saved = localStorage.getItem('hichat-theme') as Theme | null;
		if (saved) theme = saved;
	}

	function saveTheme(t: Theme) {
		theme = t;
		if (typeof window !== 'undefined') {
			localStorage.setItem('hichat-theme', t);
		}
		applyTheme();
	}

	function applyTheme() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (theme === 'dark') {
			root.classList.add('dark');
		} else if (theme === 'light') {
			root.classList.remove('dark');
		} else {
			// Auto: follow system
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark) {
				root.classList.add('dark');
			} else {
				root.classList.remove('dark');
			}
		}
	}

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
		loadTheme();
		applyTheme();

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', applyTheme);
		return () => mediaQuery.removeEventListener('change', applyTheme);
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

	function getCategoryLabel(cat: string): string {
		const labels: Record<string, string> = {
			preference: '偏好',
			fact: '事实',
			context: '上下文',
			goal: '目标'
		};
		return labels[cat] || cat;
	}

	function getCategoryColor(cat: string): string {
		const colors: Record<string, string> = {
			preference: '#06f',
			fact: '#34c759',
			context: '#ff9500',
			goal: '#ff3b30'
		};
		return colors[cat] || '#999';
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

		<!-- Memory toggle -->
		<div class="sidebar-memory-toggle">
			<button class="sidebar-memory-btn" onclick={() => memoryPanelOpen = !memoryPanelOpen}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
					<path d="M12 6v6l4 2" />
				</svg>
				记忆面板
				{#if $memoryEntries.length > 0}
					<span class="memory-badge">{$memoryEntries.length}</span>
				{/if}
			</button>
		</div>

		<!-- Sidebar footer -->
		<div class="sidebar-footer">
			<!-- Theme toggle -->
			<div class="theme-toggle">
				<button class="theme-btn {theme === 'light' ? 'theme-btn-active' : ''}" onclick={() => saveTheme('light')} title="浅色">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				</button>
				<button class="theme-btn {theme === 'auto' ? 'theme-btn-active' : ''}" onclick={() => saveTheme('auto')} title="自动">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 2a10 10 0 000 20 10 10 0 000-20z" />
					</svg>
				</button>
				<button class="theme-btn {theme === 'dark' ? 'theme-btn-active' : ''}" onclick={() => saveTheme('dark')} title="深色">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
					</svg>
				</button>
			</div>

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

	<!-- Memory panel overlay -->
	{#if memoryPanelOpen}
		<div class="memory-panel-overlay" onclick={() => memoryPanelOpen = false} role="presentation"></div>
	{/if}

	<!-- Memory panel -->
	{#if memoryPanelOpen}
		<div class="memory-panel">
			<div class="memory-panel-header">
				<h3 class="memory-panel-title">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
						<path d="M12 6v6l4 2" />
					</svg>
					记忆面板
				</h3>
				<div class="memory-panel-actions">
					<button class="memory-toggle-btn" onclick={toggleMemory}>
						{#if $memoryEnabled}
							<span style="color: var(--dbx-function-success);">已开启</span>
						{:else}
							<span style="color: var(--dbx-text-quaternary);">已关闭</span>
						{/if}
					</button>
					<button class="memory-clear-btn" onclick={clearMemory}>
						清空
					</button>
					<button class="memory-close-btn" onclick={() => memoryPanelOpen = false}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
			<div class="memory-panel-content">
				{#if $memoryEntries.length === 0}
					<div class="memory-empty">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; opacity: 0.3;">
							<path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
							<path d="M12 6v6l4 2" />
						</svg>
						<p>暂无记忆</p>
						<p style="font-size: 12px; color: var(--dbx-text-quaternary); margin-top: 4px;">
							AI 会在对话中自动记住关于你的重要信息
						</p>
					</div>
				{:else}
					<div class="memory-list">
						{#each $memoryEntries as entry}
							<div class="memory-item">
								<div class="memory-item-header">
									<span class="memory-item-category" style="color: {getCategoryColor(entry.category)};">
										{getCategoryLabel(entry.category)}
									</span>
									<span class="memory-item-importance">
										{'★'.repeat(entry.importance)}{'☆'.repeat(10 - entry.importance)}
									</span>
									<button class="memory-item-delete" onclick={() => removeMemory(entry.id)}>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</button>
								</div>
								<div class="memory-item-content">{entry.content}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

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

	/* Memory toggle */
	.sidebar-memory-toggle {
		padding: 8px 12px;
		border-top: 1px solid var(--dbx-line-7);
	}

	.sidebar-memory-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-secondary);
		font-size: 13px;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.sidebar-memory-btn:hover {
		border-color: rgba(0, 102, 255, 0.3);
		background: var(--dbx-fill-trans-10);
	}

	.memory-badge {
		margin-left: auto;
		padding: 1px 6px;
		border-radius: 10px;
		background: var(--dbx-brand-primary);
		color: white;
		font-size: 10px;
		font-weight: 600;
	}

	/* Memory panel */
	.memory-panel-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 45;
	}

	.memory-panel {
		position: fixed;
		bottom: 0;
		left: 280px;
		width: 360px;
		max-height: 60vh;
		background: var(--dbx-bg-body);
		border: 1px solid var(--dbx-line-7);
		border-radius: var(--radius-m) var(--radius-m) 0 0;
		box-shadow: var(--shadow-lg);
		z-index: 46;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.2s ease;
	}

	@media (max-width: 768px) {
		.memory-panel {
			left: 0;
			width: 100%;
		}
	}

	.memory-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--dbx-line-7);
	}

	.memory-panel-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--dbx-text-primary);
		margin: 0;
	}

	.memory-panel-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.memory-toggle-btn {
		padding: 4px 10px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: transparent;
		font-size: 12px;
		cursor: pointer;
	}

	.memory-clear-btn {
		padding: 4px 10px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: transparent;
		color: var(--dbx-function-danger);
		font-size: 12px;
		cursor: pointer;
	}

	.memory-close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-xxs);
		border: none;
		background: transparent;
		color: var(--dbx-text-tertiary);
		cursor: pointer;
	}

	.memory-close-btn:hover {
		background: var(--dbx-fill-trans-10);
	}

	.memory-panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px;
	}

	.memory-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 32px 16px;
		color: var(--dbx-text-quaternary);
		font-size: 13px;
		text-align: center;
	}

	.memory-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.memory-item {
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
	}

	.memory-item-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.memory-item-category {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--dbx-fill-trans-10);
	}

	.memory-item-importance {
		font-size: 10px;
		color: #ff9500;
		margin-left: auto;
	}

	.memory-item-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--dbx-text-quaternary);
		cursor: pointer;
		padding: 0;
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.memory-item:hover .memory-item-delete {
		opacity: 1;
	}

	.memory-item-delete:hover {
		color: var(--dbx-function-danger);
		background: rgba(255, 59, 48, 0.08);
	}

	.memory-item-content {
		font-size: 13px;
		color: var(--dbx-text-secondary);
		line-height: 1.5;
	}

	/* Theme toggle */
	.theme-toggle {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border-radius: var(--radius-xs);
		background: var(--dbx-fill-trans-10);
		margin-bottom: 8px;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-xxs);
		border: none;
		background: transparent;
		color: var(--dbx-text-tertiary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.theme-btn:hover {
		color: var(--dbx-text-secondary);
	}

	.theme-btn-active {
		background: var(--dbx-bg-body);
		color: var(--dbx-brand-primary);
		box-shadow: var(--shadow-xs);
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
