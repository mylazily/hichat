<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();

	let command = $state('');
	let history: Array<{ type: 'input' | 'output' | 'error'; text: string }> = $state([
		{ type: 'output', text: '爱爱 SSH 终端 v1.0' },
		{ type: 'output', text: '注意：这是一个模拟终端，用于演示目的。' },
		{ type: 'output', text: '支持的命令: help, echo, date, pwd, ls, clear, whoami, calc' },
		{ type: 'output', text: '' }
	]);
	let terminalEl: HTMLDivElement = $state(undefined!);
	let inputEl: HTMLInputElement = $state(undefined!);

	function scrollToBottom() {
		if (terminalEl) {
			terminalEl.scrollTop = terminalEl.scrollHeight;
		}
	}

	function executeCommand(cmd: string) {
		const trimmed = cmd.trim();
		if (!trimmed) return;

		history = [...history, { type: 'input', text: `$ ${trimmed}` }];

		const parts = trimmed.split(/\s+/);
		const commandName = parts[0].toLowerCase();
		const args = parts.slice(1);

		switch (commandName) {
			case 'help':
				history = [...history,
					{ type: 'output', text: '可用命令:' },
					{ type: 'output', text: '  help     - 显示帮助' },
					{ type: 'output', text: '  echo     - 输出文本' },
					{ type: 'output', text: '  date     - 显示当前时间' },
					{ type: 'output', text: '  pwd      - 显示当前路径' },
					{ type: 'output', text: '  ls       - 列出文件' },
					{ type: 'output', text: '  clear    - 清屏' },
					{ type: 'output', text: '  whoami   - 显示当前用户' },
					{ type: 'output', text: '  calc     - 计算器' },
					{ type: 'output', text: '  cat      - 查看文件内容' },
					{ type: 'output', text: '  uname    - 系统信息' }
				];
				break;
			case 'echo':
				history = [...history, { type: 'output', text: args.join(' ') }];
				break;
			case 'date':
				history = [...history, { type: 'output', text: new Date().toLocaleString('zh-CN') }];
				break;
			case 'pwd':
				history = [...history, { type: 'output', text: '/home/aiai' }];
				break;
			case 'ls':
				history = [...history,
					{ type: 'output', text: 'documents/  downloads/  projects/  .config  .bashrc' }
				];
				break;
			case 'clear':
				history = [];
				break;
			case 'whoami':
				history = [...history, { type: 'output', text: 'aiai' }];
				break;
			case 'calc': {
				const expr = args.join(' ');
				try {
					const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
					// eslint-disable-next-line no-new-func
					const result = new Function(`return (${sanitized})`)();
					history = [...history, { type: 'output', text: String(result) }];
				} catch {
					history = [...history, { type: 'error', text: '计算错误' }];
				}
				break;
			}
			case 'cat':
				if (args[0] === '.bashrc') {
					history = [...history,
						{ type: 'output', text: '#!/bin/bash' },
						{ type: 'output', text: 'export PATH=$PATH:/usr/local/bin' },
						{ type: 'output', text: 'alias ll="ls -la"' },
						{ type: 'output', text: 'echo "Welcome to 爱爱 Terminal!"' }
					];
				} else {
					history = [...history, { type: 'error', text: `cat: ${args[0] || ''}: 没有那个文件或目录` }];
				}
				break;
			case 'uname':
				history = [...history, { type: 'output', text: 'Linux aiai-server 5.15.0-generic #1 SMP x86_64 GNU/Linux' }];
				break;
			default:
				history = [...history, { type: 'error', text: `命令未找到: ${commandName}` }];
		}

		setTimeout(scrollToBottom, 10);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		executeCommand(command);
		command = '';
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			handleSubmit(e);
		}
	}

	$effect(() => {
		scrollToBottom();
	});
</script>

<div class="ssh-terminal-overlay">
	<div class="ssh-terminal">
		<div class="ssh-terminal-header">
			<div class="ssh-terminal-title">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="4 17 10 11 4 5" />
					<line x1="12" y1="19" x2="20" y2="19" />
				</svg>
				SSH 终端
			</div>
			<button class="ssh-terminal-close" onclick={onClose}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</div>
		<div class="ssh-terminal-body" bind:this={terminalEl}>
			{#each history as line}
				<div class="ssh-line ssh-line-{line.type}">
					{#if line.type === 'input'}
						<span class="ssh-prompt">$</span>
					{/if}
					<span>{line.text}</span>
				</div>
			{/each}
		</div>
		<form class="ssh-terminal-input" onsubmit={handleSubmit}>
			<span class="ssh-prompt">$</span>
			<input
				bind:this={inputEl}
				bind:value={command}
				onkeydown={handleKeyDown}
				placeholder="输入命令..."
				autocomplete="off"
				spellcheck="false"
			/>
		</form>
	</div>
</div>

<style>
	.ssh-terminal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.ssh-terminal {
		width: 100%;
		max-width: 700px;
		height: 450px;
		max-height: 80vh;
		background: #1e1e1e;
		border-radius: var(--radius-m);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		animation: fade-in-up 0.2s ease;
	}

	.ssh-terminal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #2d2d2d;
		border-bottom: 1px solid #3d3d3d;
	}

	.ssh-terminal-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 500;
		color: #d4d4d4;
	}

	.ssh-terminal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xxs);
		border: none;
		background: transparent;
		color: #888;
		cursor: pointer;
	}

	.ssh-terminal-close:hover {
		background: rgba(255, 59, 48, 0.2);
		color: #ff6b6b;
	}

	.ssh-terminal-body {
		flex: 1;
		overflow-y: auto;
		padding: 12px 14px;
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
	}

	.ssh-line {
		margin: 2px 0;
		word-break: break-all;
	}

	.ssh-line-input {
		color: #d4d4d4;
	}

	.ssh-line-output {
		color: #9cdcfe;
	}

	.ssh-line-error {
		color: #f48771;
	}

	.ssh-prompt {
		color: #4ec9b0;
		margin-right: 8px;
		font-weight: 600;
	}

	.ssh-terminal-input {
		display: flex;
		align-items: center;
		padding: 8px 14px;
		background: #2d2d2d;
		border-top: 1px solid #3d3d3d;
	}

	.ssh-terminal-input input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: #d4d4d4;
		font-family: var(--font-mono);
		font-size: 13px;
		padding: 4px 0;
	}

	.ssh-terminal-input input::placeholder {
		color: #666;
	}
</style>
