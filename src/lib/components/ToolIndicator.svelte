<script lang="ts">
	import type { ToolCall } from '$lib/stores/chat';
	import { t } from '$lib/stores/language';

	let { toolCalls }: { toolCalls: ToolCall[] } = $props();

	function getToolLabel(type: string): string {
		switch (type) {
			case 'weather': return $t.toolWeather;
			case 'time': return $t.toolTime;
			case 'news': return $t.toolNews;
			case 'search': return $t.toolSearch;
			default: return $t.toolCalling;
		}
	}

	function getToolIcon(type: string): string {
		switch (type) {
			case 'weather': return '🌤️';
			case 'time': return '🕐';
			case 'news': return '📰';
			case 'search': return '🔍';
			default: return '⚙️';
		}
	}
</script>

<div class="tool-indicator-container">
	{#each toolCalls as tc (tc.type + tc.parameter)}
		<div class="tool-indicator">
			<div class="tool-indicator-icon">
				{#if tc.status === 'calling'}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tool-spinner">
						<path d="M21 12a9 9 0 11-6.219-8.56" />
					</svg>
				{:else if tc.status === 'success'}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dbx-function-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dbx-function-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10" />
						<line x1="15" y1="9" x2="9" y2="15" />
						<line x1="9" y1="9" x2="15" y2="15" />
					</svg>
				{/if}
			</div>
			<span class="tool-indicator-label">
				{getToolIcon(tc.type)}
				{#if tc.status === 'calling'}
					{getToolLabel(tc.type)}
				{:else if tc.status === 'success'}
					{tc.type === 'weather' ? '天气' : tc.type === 'time' ? '时间' : tc.type === 'news' ? '新闻' : '搜索'}完成
				{:else}
					{$t.toolError}
				{/if}
			</span>
		</div>
	{/each}
</div>

<style>
	.tool-indicator-container {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 8px;
	}

	.tool-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		background: var(--dbx-fill-trans-10);
		border: 1px solid var(--dbx-line-7);
		font-size: 13px;
		color: var(--dbx-text-secondary);
		animation: fadeIn 0.2s ease;
	}

	.tool-indicator-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.tool-indicator-label {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tool-spinner {
		animation: spin 1s linear infinite;
	}
</style>
