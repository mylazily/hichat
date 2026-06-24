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
	import {
		BUILT_IN_ASSISTANTS,
		customAssistants,
		currentAssistantId,
		switchAssistant,
		getCurrentAssistant
	} from '$lib/stores/assistants';
	import type { AssistantRole } from '$lib/stores/assistants';
	import {
		knowledgeDocs,
		addKnowledgeDoc,
		removeKnowledgeDoc,
		searchKnowledgeBase
	} from '$lib/stores/knowledge-base';
	import type { SearchResult } from '$lib/stores/knowledge-base';
	import ChatInterface from './ChatInterface.svelte';
	import SSHTerminal from '$lib/components/SSHTerminal.svelte';
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

	// New state variables
	let sshOpen = $state(false);
	let kbPanelOpen = $state(false);
	let assistantDropdownOpen = $state(false);

	// Knowledge base form state
	let kbTitle = $state('');
	let kbContent = $state('');
	let kbTags = $state('');
	let kbSearchQuery = $state('');
	let kbSearchResults: SearchResult[] = $state([]);

	// Current assistant
	let currentAssistant = $derived(getCurrentAssistant());

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

	// Assistant functions
	function handleSwitchAssistant(id: string) {
		switchAssistant(id);
		assistantDropdownOpen = false;
	}

	function handleAssistantDropdownClick(e: Event | undefined) {
		if (e) e.stopPropagation();
		assistantDropdownOpen = !assistantDropdownOpen;
	}

	function closeAssistantDropdown(e: Event | undefined) {
		if (e) e.stopPropagation();
		assistantDropdownOpen = false;
	}

	// Knowledge base functions
	function handleAddKnowledgeDoc() {
		if (!kbTitle.trim() || !kbContent.trim()) return;
		const tags = kbTags.split(',').map(t => t.trim()).filter(Boolean);
		addKnowledgeDoc(kbTitle.trim(), kbContent.trim(), tags);
		kbTitle = '';
		kbContent = '';
		kbTags = '';
	}

	function handleKbSearch() {
		if (!kbSearchQuery.trim()) {
			kbSearchResults = [];
			return;
		}
		kbSearchResults = searchKnowledgeBase(kbSearchQuery.trim());
	}

	function handleKbSearchKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleKbSearch();
		}
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
		<!-- Logo area with assistant switcher -->
		<div class="sidebar-logo">
			<div class="sidebar-logo-icon" style="background: linear-gradient(135deg, {currentAssistant.color}, {currentAssistant.color}dd);">
				<span class="sidebar-logo-text">{currentAssistant.icon}</span>
			</div>
			<div class="sidebar-logo-info">
				<span class="sidebar-logo-label">{currentAssistant.name}</span>
				<button
					class="assistant-dropdown-toggle"
					onclick={handleAssistantDropdownClick}
					title="切换助手"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>
			</div>

			<!-- Assistant dropdown -->
			{#if assistantDropdownOpen}
				<div class="assistant-dropdown" onclick={(e: Event | undefined) => { if (e) e.stopPropagation(); }}>
					<div class="assistant-dropdown-section">
						<span class="assistant-dropdown-label">内置助手</span>
						{#each BUILT_IN_ASSISTANTS as assistant}
							<button
								class="assistant-dropdown-item {$currentAssistantId === assistant.id ? 'assistant-dropdown-item-active' : ''}"
								onclick={() => handleSwitchAssistant(assistant.id)}
							>
								<span class="assistant-dropdown-icon" style="background: {assistant.color}20; color: {assistant.color};">{assistant.icon}</span>
								<div class="assistant-dropdown-item-info">
									<span class="assistant-dropdown-item-name">{assistant.name}</span>
									<span class="assistant-dropdown-item-desc">{assistant.description}</span>
								</div>
							</button>
						{/each}
					</div>
					{#if $customAssistants.length > 0}
						<div class="assistant-dropdown-section">
							<span class="assistant-dropdown-label">自定义助手</span>
							{#each $customAssistants as assistant}
								<button
									class="assistant-dropdown-item {$currentAssistantId === assistant.id ? 'assistant-dropdown-item-active' : ''}"
									onclick={() => handleSwitchAssistant(assistant.id)}
								>
									<span class="assistant-dropdown-icon" style="background: {assistant.color}20; color: {assistant.color};">{assistant.icon}</span>
									<div class="assistant-dropdown-item-info">
										<span class="assistant-dropdown-item-name">{assistant.name}</span>
										<span class="assistant-dropdown-item-desc">{assistant.description}</span>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
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
							onclick={(e: Event | undefined) => { if (e) e.stopPropagation(); togglePin(conv.id); }}
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
							onclick={(e: Event | undefined) => { if (e) e.stopPropagation(); handleRemoveConversation(conv.id); }}
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
							onclick={(e: Event | undefined) => { if (e) e.stopPropagation(); togglePin(conv.id); }}
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
							onclick={(e: Event | undefined) => { if (e) e.stopPropagation(); handleRemoveConversation(conv.id); }}
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

		<!-- Knowledge base toggle -->
		<div class="sidebar-kb-toggle">
			<button class="sidebar-kb-btn" onclick={() => kbPanelOpen = !kbPanelOpen}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
					<path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
				</svg>
				知识库
				{#if $knowledgeDocs.length > 0}
					<span class="memory-badge">{$knowledgeDocs.length}</span>
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

	<!-- Knowledge base panel overlay -->
	{#if kbPanelOpen}
		<div class="memory-panel-overlay" onclick={() => kbPanelOpen = false} role="presentation"></div>
	{/if}

	<!-- Knowledge base panel -->
	{#if kbPanelOpen}
		<div class="memory-panel kb-panel">
			<div class="memory-panel-header">
				<h3 class="memory-panel-title">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
						<path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
					</svg>
					知识库
				</h3>
				<div class="memory-panel-actions">
					<button class="memory-close-btn" onclick={() => kbPanelOpen = false}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
			<div class="memory-panel-content">
				<!-- Search -->
				<div class="kb-search-box">
					<input
						type="text"
						placeholder="搜索知识库..."
						bind:value={kbSearchQuery}
						onkeydown={handleKbSearchKeyDown}
					/>
					<button class="kb-search-btn" onclick={handleKbSearch}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
					</button>
				</div>

				<!-- Search results -->
				{#if kbSearchResults.length > 0}
					<div class="kb-section">
						<span class="kb-section-label">搜索结果</span>
						{#each kbSearchResults as result}
							<div class="kb-doc-item">
								<div class="kb-doc-header">
									<span class="kb-doc-title">{result.document.title}</span>
									<span class="kb-doc-score">{result.score.toFixed(1)}</span>
								</div>
								<div class="kb-doc-excerpt">{result.excerpt}</div>
								{#if result.document.tags.length > 0}
									<div class="kb-doc-tags">
										{#each result.document.tags as tag}
											<span class="kb-doc-tag">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				<!-- Add document form -->
				<div class="kb-section">
					<span class="kb-section-label">添加文档</span>
					<div class="kb-form">
						<input
							type="text"
							placeholder="文档标题"
							bind:value={kbTitle}
						/>
						<textarea
							placeholder="文档内容..."
							bind:value={kbContent}
							rows="4"
						></textarea>
						<input
							type="text"
							placeholder="标签 (用逗号分隔)"
							bind:value={kbTags}
						/>
						<button class="kb-add-btn" onclick={handleAddKnowledgeDoc}>
							添加文档
						</button>
					</div>
				</div>

				<!-- Document list -->
				<div class="kb-section">
					<span class="kb-section-label">文档列表 ({$knowledgeDocs.length})</span>
					{#if $knowledgeDocs.length === 0}
						<div class="memory-empty">
							<p>暂无文档</p>
							<p style="font-size: 12px; color: var(--dbx-text-quaternary); margin-top: 4px;">
								添加文档以构建你的知识库
							</p>
						</div>
					{:else}
						<div class="kb-doc-list">
							{#each $knowledgeDocs as doc}
								<div class="kb-doc-item">
									<div class="kb-doc-header">
										<span class="kb-doc-title">{doc.title}</span>
										<button
											class="kb-doc-delete"
											onclick={() => removeKnowledgeDoc(doc.id)}
										>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M18 6L6 18M6 6l12 12" />
											</svg>
										</button>
									</div>
									<div class="kb-doc-content">{doc.content.slice(0, 100)}{doc.content.length > 100 ? '...' : ''}</div>
									{#if doc.tags.length > 0}
										<div class="kb-doc-tags">
											{#each doc.tags as tag}
												<span class="kb-doc-tag">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Main content -->
	<main class="main-content">
		<ChatInterface
			onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
			{sidebarOpen}
			{currentAssistant}
			onToggleSSH={() => (sshOpen = !sshOpen)}
		/>
	</main>

	<!-- SSH Terminal -->
	{#if sshOpen}
		<SSHTerminal onClose={() => (sshOpen = false)} />
	{/if}
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
		position: relative;
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

	.sidebar-logo-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.sidebar-logo-label {
		font-size: 15px;
		font-weight: 600;
		color: var(--dbx-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Assistant dropdown toggle */
	.assistant-dropdown-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-xxs);
		border: none;
		background: transparent;
		color: var(--dbx-text-quaternary);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.assistant-dropdown-toggle:hover {
		background: var(--dbx-fill-trans-10);
		color: var(--dbx-text-secondary);
	}

	/* Assistant dropdown */
	.assistant-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 12px;
		right: 12px;
		background: var(--dbx-bg-body);
		border: 1px solid var(--dbx-line-7);
		border-radius: var(--radius-s);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		max-height: 400px;
		overflow-y: auto;
		padding: 8px;
	}

	.assistant-dropdown-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.assistant-dropdown-section + .assistant-dropdown-section {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--dbx-line-7);
	}

	.assistant-dropdown-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--dbx-text-quaternary);
		padding: 4px 8px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.assistant-dropdown-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: var(--radius-xs);
		border: none;
		background: transparent;
		color: var(--dbx-text-secondary);
		font-size: 13px;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
		width: 100%;
	}

	.assistant-dropdown-item:hover {
		background: var(--dbx-fill-trans-10);
	}

	.assistant-dropdown-item-active {
		background: rgba(0, 102, 255, 0.06);
	}

	.assistant-dropdown-icon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		flex-shrink: 0;
	}

	.assistant-dropdown-item-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.assistant-dropdown-item-name {
		font-weight: 500;
		color: var(--dbx-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.assistant-dropdown-item-desc {
		font-size: 11px;
		color: var(--dbx-text-quaternary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* Knowledge base toggle */
	.sidebar-kb-toggle {
		padding: 0 12px 8px;
	}

	.sidebar-kb-btn {
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

	.sidebar-kb-btn:hover {
		border-color: rgba(0, 102, 255, 0.3);
		background: var(--dbx-fill-trans-10);
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

	.kb-panel {
		width: 420px;
		max-height: 70vh;
	}

	@media (max-width: 768px) {
		.memory-panel {
			left: 0;
			width: 100%;
		}
		.kb-panel {
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

	/* Knowledge base panel styles */
	.kb-search-box {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.kb-search-box input {
		flex: 1;
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-primary);
		font-size: 13px;
		outline: none;
		transition: border-color var(--transition-fast);
	}

	.kb-search-box input:focus {
		border-color: var(--dbx-brand-primary);
	}

	.kb-search-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-tertiary);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.kb-search-btn:hover {
		border-color: var(--dbx-brand-primary);
		color: var(--dbx-brand-primary);
	}

	.kb-section {
		margin-bottom: 16px;
	}

	.kb-section-label {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--dbx-text-quaternary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 8px 0;
		margin-bottom: 4px;
	}

	.kb-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.kb-form input,
	.kb-form textarea {
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-primary);
		font-size: 13px;
		outline: none;
		transition: border-color var(--transition-fast);
		font-family: inherit;
		resize: vertical;
	}

	.kb-form input:focus,
	.kb-form textarea:focus {
		border-color: var(--dbx-brand-primary);
	}

	.kb-add-btn {
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-brand-primary);
		background: var(--dbx-brand-primary);
		color: white;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.kb-add-btn:hover {
		background: var(--dbx-brand-primary-deep);
	}

	.kb-doc-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.kb-doc-item {
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		transition: border-color var(--transition-fast);
	}

	.kb-doc-item:hover {
		border-color: rgba(0, 102, 255, 0.2);
	}

	.kb-doc-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.kb-doc-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--dbx-text-primary);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kb-doc-score {
		font-size: 11px;
		color: var(--dbx-brand-primary);
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 10px;
		background: rgba(0, 102, 255, 0.08);
	}

	.kb-doc-content,
	.kb-doc-excerpt {
		font-size: 12px;
		color: var(--dbx-text-tertiary);
		line-height: 1.5;
		margin-bottom: 6px;
	}

	.kb-doc-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.kb-doc-tag {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--dbx-fill-trans-10);
		color: var(--dbx-text-tertiary);
	}

	.kb-doc-delete {
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
		flex-shrink: 0;
	}

	.kb-doc-item:hover .kb-doc-delete {
		opacity: 1;
	}

	.kb-doc-delete:hover {
		color: var(--dbx-function-danger);
		background: rgba(255, 59, 48, 0.08);
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
