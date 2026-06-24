<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { marked } from 'marked';
	import { t } from '$lib/stores/language';

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

	// Add copy buttons to code blocks after render
	function addCopyButtons() {
		const container = document.querySelector('.markdown-content-final');
		if (!container) return;

		const preBlocks = container.querySelectorAll('pre');
		for (const pre of preBlocks) {
			if (pre.querySelector('.code-copy-btn')) continue;

			const wrapper = document.createElement('div');
			wrapper.style.position = 'relative';

			const header = document.createElement('div');
			header.className = 'code-block-header';

			// Detect language from class
			const codeEl = pre.querySelector('code');
			let lang = '';
			if (codeEl) {
				const classes = codeEl.className || '';
				const match = classes.match(/language-(\w+)/);
				if (match) lang = match[1];
			}

			const langLabel = document.createElement('span');
			langLabel.className = 'code-block-lang';
			langLabel.textContent = lang || 'code';
			header.appendChild(langLabel);

			const copyBtn = document.createElement('button');
			copyBtn.className = 'code-copy-btn';
			copyBtn.textContent = '复制';
			copyBtn.onclick = () => {
				const code = pre.querySelector('code');
				if (code) {
					navigator.clipboard.writeText(code.textContent || '').then(() => {
						copyBtn.textContent = '已复制！';
						setTimeout(() => { copyBtn.textContent = '复制'; }, 2000);
					});
				}
			};
			header.appendChild(copyBtn);

			pre.parentNode?.insertBefore(wrapper, pre);
			wrapper.appendChild(header);
			wrapper.appendChild(pre);
		}
	}

	$effect(() => {
		const _ = renderedHtml;
		tick().then(() => {
			addCopyButtons();
		});
	});
</script>

<div class="markdown-content {className} markdown-content-final">
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
		color: var(--dbx-brand-primary);
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
		border-radius: var(--radius-xxs);
	}

	.markdown-content :global(pre) {
		margin: 0.75em 0;
		border-radius: var(--radius-s);
		background: #1e1e1e;
		border: 1px solid rgba(255, 255, 255, 0.08);
		overflow-x: auto;
	}

	.markdown-content :global(pre code) {
		display: block;
		padding: 12px 16px;
		font-size: 13px;
		line-height: 1.5;
		background: transparent;
		border-radius: 0;
		color: #d4d4d4;
	}

	/* Code block header with copy button */
	.markdown-content :global(.code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-s) var(--radius-s) 0 0;
	}

	.markdown-content :global(.code-block-lang) {
		font-size: 11px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
			font-family: var(--font-mono);
	}

	.markdown-content :global(.code-copy-btn) {
		padding: 3px 10px;
		border-radius: var(--radius-xxs);
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		font-size: 11px;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: var(--font-sans);
	}

	.markdown-content :global(.code-copy-btn:hover) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border-color: rgba(255, 255, 255, 0.25);
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
		border-radius: var(--radius-l);
	}
</style>
