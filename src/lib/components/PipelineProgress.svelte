<script lang="ts">
	import type { PipelineStep } from '$lib/stores/chat';
	import { t } from '$lib/stores/language';

	let { steps }: { steps: PipelineStep[] } = $props();

	let completedCount = $derived(steps.filter(s => s.status === 'done').length);
	let progress = $derived(steps.length > 0 ? (completedCount / steps.length) * 100 : 0);
</script>

{#if steps && steps.length > 0}
	<div class="pipeline-container">
		<div class="pipeline-header">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
			</svg>
			<span>{$t.pipelineProgress}</span>
			<span class="pipeline-progress-text">{completedCount}/{steps.length}</span>
		</div>
		<div class="pipeline-bar">
			<div class="pipeline-bar-fill" style="width: {progress}%"></div>
		</div>
		<div class="pipeline-steps">
			{#each steps as step, i}
				<div class="pipeline-step {step.status}">
					<div class="pipeline-step-dot">
						{#if step.status === 'done'}
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--dbx-function-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{:else if step.status === 'running'}
							<div class="pipeline-step-pulse"></div>
						{:else}
							<div class="pipeline-step-empty"></div>
						{/if}
					</div>
					<span class="pipeline-step-name">{step.name}</span>
					{#if i < steps.length - 1}
						<div class="pipeline-step-line {step.status === 'done' ? 'done' : ''}"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.pipeline-container {
		margin-top: 12px;
		padding: 12px;
		border-radius: var(--radius-m);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
	}

	.pipeline-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--dbx-text-tertiary);
		margin-bottom: 8px;
	}

	.pipeline-progress-text {
		margin-left: auto;
		color: var(--dbx-brand-primary);
	}

	.pipeline-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--dbx-fill-trans-10);
		overflow: hidden;
		margin-bottom: 12px;
	}

	.pipeline-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--dbx-brand-primary);
		transition: width 0.5s ease;
	}

	.pipeline-steps {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.pipeline-step {
		display: flex;
		align-items: center;
		gap: 8px;
		position: relative;
	}

	.pipeline-step-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--dbx-fill-trans-10);
	}

	.pipeline-step-pulse {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--dbx-brand-primary);
		animation: pulse 1.5s infinite;
	}

	.pipeline-step-empty {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--dbx-neutral-200);
	}

	.pipeline-step-name {
		font-size: 13px;
		color: var(--dbx-text-secondary);
		padding: 4px 0;
	}

	.pipeline-step-line {
		position: absolute;
		left: 9px;
		top: 20px;
		width: 2px;
		height: 20px;
		background: var(--dbx-neutral-200);
	}

	.pipeline-step-line.done {
		background: var(--dbx-function-success);
	}
</style>
