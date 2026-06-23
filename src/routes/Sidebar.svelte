<script lang="ts">
	import type { ChatSession } from '$lib/stores/chat';

	interface Props {
		sessions: ChatSession[];
		activeSessionId: string | null;
		sidebarOpen: boolean;
		onNewChat: () => void;
		onSelectSession: (id: string) => void;
		onDeleteSession: (id: string) => void;
		onToggleSidebar: () => void;
		onOpenSettings: () => void;
	}

	let {
		sessions,
		activeSessionId,
		sidebarOpen,
		onNewChat,
		onSelectSession,
		onDeleteSession,
		onToggleSidebar,
		onOpenSettings
	}: Props = $props();

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		if (isToday) {
			return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
	}
</script>

{#if sidebarOpen}
	<aside class="w-72 flex-shrink-0 bg-[#111111] border-r border-[#2a2a2a] flex flex-col h-full transition-all duration-300">
		<!-- Logo Area -->
		<div class="flex items-center gap-3 px-4 py-4 border-b border-[#2a2a2a]">
			<div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
				</svg>
			</div>
			<span class="font-semibold text-[#e8e8e8]">LobeChat</span>
		</div>

		<!-- New Chat Button -->
		<div class="px-3 py-3">
			<button
				onclick={onNewChat}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-medium transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
				</svg>
				新建对话
			</button>
		</div>

		<!-- Session List -->
		<div class="flex-1 overflow-y-auto px-3 space-y-1">
			<div class="text-xs font-medium text-[#666] uppercase tracking-wider px-2 py-2">历史对话</div>
			{#each sessions as session (session.id)}
				<div class="group relative">
					<button
						onclick={() => onSelectSession(session.id)}
						class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 {activeSessionId === session.id ? 'bg-[#1a1a1a] text-[#e8e8e8]' : 'text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#e8e8e8]' }"
					>
						<svg class="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
						</svg>
						<div class="flex-1 min-w-0">
							<div class="truncate">{session.title}</div>
							<div class="text-xs text-[#666] mt-0.5">{formatDate(session.updatedAt)}</div>
						</div>
					</button>
					<button
						onclick={() => onDeleteSession(session.id)}
						class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#2a2a2a] text-[#888] hover:text-red-400 transition-all"
						aria-label="删除对话"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
						</svg>
					</button>
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="border-t border-[#2a2a2a] px-3 py-3 space-y-1">
			<button
				onclick={onOpenSettings}
				class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#e8e8e8] transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
				</svg>
				设置
			</button>
		</div>
	</aside>
{:else}
	<button
		onclick={onToggleSidebar}
		class="fixed left-4 top-4 z-50 p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
		aria-label="打开侧边栏"
	>
		<svg class="w-5 h-5 text-[#a0a0a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
		</svg>
	</button>
{/if}
