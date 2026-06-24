<script lang="ts">
	import type { Citation } from '$lib/stores/chat';
	import { t } from '$lib/stores/language';

	let { citations }: { citations: Citation[] } = $props();
</script>

{#if citations && citations.length > 0}
	<div class="citation-container">
		<div class="citation-header">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
			</svg>
			<span>{$t.citationSource}</span>
		</div>
		{#each citations as citation}
			<a href={citation.url} target="_blank" rel="noopener noreferrer" class="citation-card">
				<div class="citation-card-title">{citation.title}</div>
				{#if citation.snippet}
					<div class="citation-card-snippet">{citation.snippet}</div>
				{/if}
				<div class="citation-card-link">
					{$t.citationVisit}
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
				</div>
			</a>
		{/each}
	</div>
{/if}

<style>
	.citation-container {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.citation-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--dbx-text-tertiary);
	}

	.citation-card {
		display: block;
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		text-decoration: none;
		color: var(--dbx-text-secondary);
		transition: all var(--transition-fast);
	}

	.citation-card:hover {
		border-color: rgba(0, 102, 255, 0.3);
		box-shadow: var(--shadow-xs);
	}

	.citation-card-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--dbx-text-primary);
		margin-bottom: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.citation-card-snippet {
		font-size: 12px;
		color: var(--dbx-text-tertiary);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 6px;
	}

	.citation-card-link {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: var(--dbx-brand-primary);
		font-weight: 500;
	}
</style>
