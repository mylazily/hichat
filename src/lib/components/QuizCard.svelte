<script lang="ts">
	import type { QuizQuestion } from '$lib/stores/chat';
	import { t } from '$lib/stores/language';

	let { questions }: { questions: QuizQuestion[] } = $props();

	let currentIndex = $state(0);
	let selectedAnswer = $state(-1);
	let showResult = $state(false);
	let score = $state(0);
	let quizStarted = $state(false);
	let quizFinished = $state(false);

	function startQuiz() {
		quizStarted = true;
		currentIndex = 0;
		selectedAnswer = -1;
		showResult = false;
		score = 0;
		quizFinished = false;
	}

	function submitAnswer() {
		if (selectedAnswer < 0) return;
		showResult = true;
		if (selectedAnswer === questions[currentIndex].answer) {
			score++;
		}
	}

	function nextQuestion() {
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			selectedAnswer = -1;
			showResult = false;
		} else {
			quizFinished = true;
		}
	}

	function restartQuiz() {
		startQuiz();
	}
</script>

<div class="quiz-container">
	{#if !quizStarted}
		<div class="quiz-start">
			<div class="quiz-start-icon">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 11l3 3L22 4" />
					<path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
				</svg>
			</div>
			<div class="quiz-start-info">
				<span class="quiz-start-count">{questions.length} 道题目</span>
			</div>
			<button class="quiz-start-btn" onclick={startQuiz}>
				{$t.quizStart}
			</button>
		</div>
	{:else if quizFinished}
		<div class="quiz-result">
			<div class="quiz-result-score">
				<span class="quiz-result-number">{score}</span>
				<span class="quiz-result-total">/ {questions.length}</span>
			</div>
			<div class="quiz-result-label">{$t.quizScore}</div>
			<button class="quiz-restart-btn" onclick={restartQuiz}>
				重新开始
			</button>
		</div>
	{:else}
		{#if questions[currentIndex]}
			<div class="quiz-question">
				<div class="quiz-question-header">
					{$t.quizQuestion.replace('{n}', String(currentIndex + 1))}
				</div>
				<div class="quiz-question-text">{questions[currentIndex].question}</div>
				<div class="quiz-options">
					{#each questions[currentIndex].options as option, i}
						<button
							class="quiz-option {selectedAnswer === i ? 'quiz-option-selected' : ''} {showResult && i === questions[currentIndex].answer ? 'quiz-option-correct' : ''} {showResult && selectedAnswer === i && i !== questions[currentIndex].answer ? 'quiz-option-wrong' : ''}"
							onclick={() => { if (!showResult) selectedAnswer = i; }}
							disabled={showResult}
						>
							<span class="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
							<span class="quiz-option-text">{option}</span>
							{#if showResult && i === questions[currentIndex].answer}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dbx-function-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="quiz-option-icon">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
							{#if showResult && selectedAnswer === i && i !== questions[currentIndex].answer}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dbx-function-danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="quiz-option-icon">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>

				{#if showResult && questions[currentIndex].explanation}
					<div class="quiz-explanation">
						<div class="quiz-explanation-label">解析</div>
						<div class="quiz-explanation-text">{questions[currentIndex].explanation}</div>
					</div>
				{/if}

				<div class="quiz-actions">
					{#if !showResult}
						<button
							class="quiz-submit-btn"
							onclick={submitAnswer}
							disabled={selectedAnswer < 0}
						>
							{$t.quizSubmit}
						</button>
					{:else}
						<button class="quiz-next-btn" onclick={nextQuestion}>
							{currentIndex < questions.length - 1 ? $t.quizNext : '查看结果'}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.quiz-container {
		margin-top: 12px;
		border-radius: var(--radius-m);
		border: 1px solid var(--dbx-line-7);
		overflow: hidden;
		background: var(--dbx-bg-body);
	}

	.quiz-start {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.quiz-start-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(0, 102, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--dbx-brand-primary);
	}

	.quiz-start-count {
		font-size: 14px;
		color: var(--dbx-text-secondary);
	}

	.quiz-start-btn {
		padding: 8px 24px;
		border-radius: var(--radius-xs);
		border: none;
		background: var(--dbx-brand-primary);
		color: white;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.quiz-start-btn:hover {
		background: var(--dbx-brand-primary-deep);
	}

	.quiz-result {
		padding: 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.quiz-result-score {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.quiz-result-number {
		font-size: 32px;
		font-weight: 700;
		color: var(--dbx-brand-primary);
	}

	.quiz-result-total {
		font-size: 16px;
		color: var(--dbx-text-tertiary);
	}

	.quiz-result-label {
		font-size: 13px;
		color: var(--dbx-text-tertiary);
	}

	.quiz-restart-btn {
		margin-top: 8px;
		padding: 6px 16px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: transparent;
		color: var(--dbx-text-secondary);
		font-size: 13px;
		cursor: pointer;
	}

	.quiz-question {
		padding: 16px;
	}

	.quiz-question-header {
		font-size: 12px;
		font-weight: 600;
		color: var(--dbx-text-tertiary);
		margin-bottom: 8px;
	}

	.quiz-question-text {
		font-size: 15px;
		color: var(--dbx-text-primary);
		line-height: 1.6;
		margin-bottom: 12px;
	}

	.quiz-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.quiz-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--dbx-line-7);
		background: var(--dbx-bg-body);
		color: var(--dbx-text-secondary);
		font-size: 14px;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
		width: 100%;
	}

	.quiz-option:hover:not(:disabled) {
		border-color: rgba(0, 102, 255, 0.3);
		background: var(--dbx-fill-trans-10);
	}

	.quiz-option-selected {
		border-color: var(--dbx-brand-primary);
		background: rgba(0, 102, 255, 0.04);
	}

	.quiz-option-correct {
		border-color: var(--dbx-function-success);
		background: rgba(52, 199, 89, 0.04);
	}

	.quiz-option-wrong {
		border-color: var(--dbx-function-danger);
		background: rgba(255, 59, 48, 0.04);
	}

	.quiz-option-letter {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--dbx-neutral-200);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.quiz-option-text {
		flex: 1;
	}

	.quiz-option-icon {
		margin-left: auto;
		flex-shrink: 0;
	}

	.quiz-explanation {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-xs);
		background: rgba(0, 102, 255, 0.04);
		border-left: 3px solid var(--dbx-brand-primary);
	}

	.quiz-explanation-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--dbx-brand-primary);
		margin-bottom: 4px;
	}

	.quiz-explanation-text {
		font-size: 13px;
		color: var(--dbx-text-secondary);
		line-height: 1.5;
	}

	.quiz-actions {
		margin-top: 16px;
		display: flex;
		justify-content: flex-end;
	}

	.quiz-submit-btn,
	.quiz-next-btn {
		padding: 8px 20px;
		border-radius: var(--radius-xs);
		border: none;
		background: var(--dbx-brand-primary);
		color: white;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.quiz-submit-btn:disabled {
		background: var(--dbx-neutral-200);
		color: var(--dbx-text-quaternary);
		cursor: default;
	}

	.quiz-submit-btn:hover:not(:disabled),
	.quiz-next-btn:hover {
		background: var(--dbx-brand-primary-deep);
	}
</style>
