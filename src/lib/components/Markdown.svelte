<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';

	let {
		content,
		className = ''
	}: {
		content: string;
		className?: string;
	} = $props();

	function normalizeMarkdown(raw: string): string {
		return raw
			.replace(/([^\n])(\n?)(#{1,6}\s)/g, '$1\n\n$3')
			.replace(/\n{3,}/g, '\n\n');
	}

	let renderedHtml = $derived.by(() => {
		const normalized = normalizeMarkdown(content);
		return marked(normalized, { breaks: true, gfm: true }) as string;
	});
</script>

<div class="markdown-content {className}">
	{@html renderedHtml}
</div>

<style>
	.markdown-content {
		font-size: 15px;
		line-height: 1.7;
		color: var(--dbx-text-primary);
		word-break: break-word;
	}

	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3) {
		font-weight: 600;
		margin-top: 1.25em;
		margin-bottom: 0.5em;
		line-height: 1.4;
		color: var(--dbx-text-primary);
	}

	.markdown-content :global(h1) { font-size: 1.5em; }
	.markdown-content :global(h2) { font-size: 1.25em; }
	.markdown-content :global(h3) { font-size: 1.1em; }

	.markdown-content :global(p) {
		margin: 0.5em 0;
	}

	.markdown-content :global(strong) {
		font-weight: 600;
		color: var(--dbx-text-primary);
	}

	.markdown-content :global(em) {
		font-style: italic;
	}

	.markdown-content :global(a) {
		color: var(--dbx-fill-primary);
		text-decoration: none;
	}

	.markdown-content :global(a:hover) {
		text-decoration: underline;
	}

	.markdown-content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
		background: var(--dbx-fill-trans-10);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
	}

	.markdown-content :global(pre) {
		margin: 0.75em 0;
		border-radius: var(--radius-lg);
		background: var(--dbx-bg-elevated);
		border: 1px solid var(--dbx-line-7);
		overflow-x: auto;
	}

	.markdown-content :global(pre code) {
		display: block;
		padding: 12px 16px;
		font-size: 13px;
		line-height: 1.5;
		background: transparent;
		border-radius: 0;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0.5em 0;
		padding-left: 1.5em;
	}

	.markdown-content :global(li) {
		margin: 0.25em 0;
	}

	.markdown-content :global(blockquote) {
		margin: 0.75em 0;
		padding: 0.5em 1em;
		border-left: 3px solid var(--dbx-line-7);
		color: var(--dbx-text-tertiary);
	}

	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75em 0;
		font-size: 14px;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		padding: 8px 12px;
		border: 1px solid var(--dbx-line-7);
		text-align: left;
	}

	.markdown-content :global(th) {
		background: var(--dbx-fill-trans-10);
		font-weight: 600;
	}

	.markdown-content :global(hr) {
		border: none;
		border-top: 1px solid var(--dbx-line-7);
		margin: 1em 0;
	}

	.markdown-content :global(img) {
		max-width: 100%;
		border-radius: var(--radius-lg);
	}
</style>
