<script lang="ts">
	import { onMount } from 'svelte';
	import { chatSessions, currentSessionId, createNewSession, generateId } from '$lib/stores/chat';
	import { streamChatCompletion, fetchModels } from '$lib/api/agnes-ai';
	import type { Message, ChatSession } from '$lib/stores/chat';
	import ChatMessage from './ChatMessage.svelte';
	import Sidebar from './Sidebar.svelte';
	import ChatInput from './ChatInput.svelte';
	import SettingsModal from './SettingsModal.svelte';

	let sessions: ChatSession[] = $state([]);
	let activeSessionId: string | null = $state(null);
	let activeSession: ChatSession | null = $state(null);
	let inputValue = $state('');
	let isStreaming = $state(false);
	let showSettings = $state(false);
	let sidebarOpen = $state(false);
	let apiKey = $state('');
	let selectedModel = $state('agnes-ai-default');
	let models: string[] = $state([]);
	let messagesEnd: HTMLDivElement;
	let isMobile = $state(false);

	chatSessions.subscribe(v => { sessions = v; });
	currentSessionId.subscribe(v => { activeSessionId = v; });

	$effect(() => {
		activeSession = sessions.find(s => s.id === activeSessionId) || null;
	});

	$effect(() => {
		if (messagesEnd && activeSession?.messages) {
			messagesEnd.scrollIntoView({ behavior: 'smooth' });
		}
	});

	onMount(() => {
		checkMobile();
		window.addEventListener('resize', checkMobile);

		const savedKey = localStorage.getItem('agnes-api-key');
		if (savedKey) apiKey = savedKey;

		const savedModel = localStorage.getItem('agnes-model');
		if (savedModel) selectedModel = savedModel;

		const savedSessions = localStorage.getItem('chat-sessions');
		if (savedSessions) {
			try {
				const parsed = JSON.parse(savedSessions);
				chatSessions.set(parsed);
			} catch { /* ignore */ }
		}

		if (sessions.length === 0) {
			const newSession = createNewSession();
			chatSessions.addSession(newSession);
			currentSessionId.set(newSession.id);
		} else {
			currentSessionId.set(sessions[0].id);
		}

		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});

	function checkMobile() {
		isMobile = window.innerWidth < 768;
		if (!isMobile) {
			sidebarOpen = true;
		} else {
			sidebarOpen = false;
		}
	}

	$effect(() => {
		if (sessions.length > 0) {
			localStorage.setItem('chat-sessions', JSON.stringify(sessions));
		}
	});

	async function loadModels() {
		if (!apiKey) return;
		models = await fetchModels({ apiKey });
		if (models.length > 0 && !models.includes(selectedModel)) {
			selectedModel = models[0];
		}
	}

	async function sendMessage() {
		if (!inputValue.trim() || !activeSessionId || !apiKey || isStreaming) return;

		const userContent = inputValue.trim();
		inputValue = '';

		const userMessage: Message = {
			id: generateId(),
			role: 'user',
			content: userContent,
			timestamp: Date.now()
		};

		const updatedMessages = [...(activeSession?.messages || []), userMessage];
		chatSessions.updateSession(activeSessionId, { messages: updatedMessages });

		if (updatedMessages.length === 1) {
			chatSessions.updateSession(activeSessionId, {
				title: userContent.slice(0, 30) + (userContent.length > 30 ? '...' : '')
			});
		}

		isStreaming = true;
		const assistantId = generateId();
		const assistantMessage: Message = {
			id: assistantId,
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			isStreaming: true
		};

		chatSessions.updateSession(activeSessionId, {
			messages: [...updatedMessages, assistantMessage]
		});

		const apiMessages = updatedMessages.map(m => ({
			role: m.role,
			content: m.content
		}));

		try {
			const stream = streamChatCompletion(apiMessages, { apiKey, model: selectedModel });
			let fullContent = '';

			for await (const chunk of stream) {
				if (chunk.error) {
					fullContent += `\n\n[错误: ${chunk.error}]`;
					break;
				}
				if (chunk.content) {
					fullContent += chunk.content;
					chatSessions.updateSession(activeSessionId, {
						messages: [
							...updatedMessages,
							{ ...assistantMessage, content: fullContent }
						]
					});
				}
				if (chunk.done) break;
			}

			chatSessions.updateSession(activeSessionId, {
				messages: [
					...updatedMessages,
					{ ...assistantMessage, content: fullContent, isStreaming: false }
				]
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : '未知错误';
			chatSessions.updateSession(activeSessionId, {
				messages: [
					...updatedMessages,
					{ ...assistantMessage, content: `[错误: ${errorMsg}]`, isStreaming: false }
				]
			});
		} finally {
			isStreaming = false;
		}
	}

	function handleNewChat() {
		const newSession = createNewSession();
		chatSessions.addSession(newSession);
		currentSessionId.set(newSession.id);
		if (isMobile) sidebarOpen = false;
	}

	function handleSelectSession(id: string) {
		currentSessionId.set(id);
		if (isMobile) sidebarOpen = false;
	}

	function handleDeleteSession(id: string) {
		chatSessions.deleteSession(id);
		if (activeSessionId === id) {
			const remaining = sessions.filter(s => s.id !== id);
			currentSessionId.set(remaining.length > 0 ? remaining[0].id : null);
			if (remaining.length === 0) {
				const newSession = createNewSession();
				chatSessions.addSession(newSession);
				currentSessionId.set(newSession.id);
			}
		}
	}

	function handleSaveSettings(key: string, model: string) {
		apiKey = key;
		selectedModel = model;
		localStorage.setItem('agnes-api-key', key);
		localStorage.setItem('agnes-model', model);
		showSettings = false;
		loadModels();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="flex h-[100dvh] w-full bg-[#0d0d0d] text-[#e8e8e8] overflow-hidden">
	<Sidebar
		{sessions}
		{activeSessionId}
		{sidebarOpen}
		{isMobile}
		onNewChat={handleNewChat}
		onSelectSession={handleSelectSession}
		onDeleteSession={handleDeleteSession}
		onToggleSidebar={() => sidebarOpen = !sidebarOpen}
		onOpenSettings={() => showSettings = true}
	/>

	<main class="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
		<!-- Mobile Overlay -->
		{#if sidebarOpen && isMobile}
			<div
				class="absolute inset-0 bg-black/60 z-30"
				onclick={() => sidebarOpen = false}
				role="presentation"
			></div>
		{/if}

		<!-- Header -->
		<header class="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3 border-b border-[#2a2a2a] bg-[#0d0d0d]/90 backdrop-blur-sm flex-shrink-0 z-10">
			<div class="flex items-center gap-2 md:gap-3">
				{#if isMobile}
					<button
						onclick={() => sidebarOpen = !sidebarOpen}
						class="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors no-select"
						aria-label="切换侧边栏"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
						</svg>
					</button>
				{/if}
				<h1 class="text-sm font-medium text-[#a0a0a0] truncate max-w-[150px] md:max-w-md">
					{activeSession?.title || 'HiChat'}
				</h1>
			</div>
			<div class="flex items-center gap-1.5 md:gap-2">
				<span class="hidden md:inline text-xs text-[#666] px-2 py-1 rounded bg-[#1a1a1a] truncate max-w-[120px]">{selectedModel}</span>
				<button
					onclick={() => showSettings = true}
					class="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors no-select"
					aria-label="设置"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
				</button>
			</div>
		</header>

		<!-- Messages Area -->
		<div class="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6 space-y-4 md:space-y-6 scroll-smooth">
			{#if activeSession && activeSession.messages.length > 0}
				{#each activeSession.messages as message (message.id)}
					<ChatMessage {message} />
				{/each}
			{:else}
				<div class="flex flex-col items-center justify-center h-full text-center space-y-3 md:space-y-4 px-4">
					<div class="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center mb-1 md:mb-2">
						<svg class="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
						</svg>
					</div>
					<h2 class="text-lg md:text-xl font-semibold text-[#e8e8e8]">开始对话</h2>
					<p class="text-xs md:text-sm text-[#666] max-w-xs md:max-w-md">
						输入消息开始与 Agnes AI 对话
					</p>
					{#if !apiKey}
						<button
							onclick={() => showSettings = true}
							class="mt-2 px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-sm font-medium no-select"
						>
							配置 API Key
						</button>
					{/if}
				</div>
			{/if}
			<div bind:this={messagesEnd}></div>
		</div>

		<!-- Input Area -->
		<div class="border-t border-[#2a2a2a] px-3 py-3 md:px-4 md:py-4 bg-[#0d0d0d] flex-shrink-0 mobile-safe-bottom">
			<ChatInput
				bind:value={inputValue}
				{isStreaming}
				onSend={sendMessage}
				onKeydown={handleKeydown}
			/>
		</div>
	</main>
</div>

{#if showSettings}
	<SettingsModal
		{apiKey}
		{selectedModel}
		{models}
		onSave={handleSaveSettings}
		onClose={() => showSettings = false}
		onLoadModels={loadModels}
	/>
{/if}
