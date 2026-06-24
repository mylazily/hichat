<script lang="ts">
	let { onResult, isRecording }: { onResult: (text: string) => void; isRecording: boolean } = $props();
	let recognition: any;

	function startVoice() {
		if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		recognition = new SpeechRecognition();
		recognition.lang = 'zh-CN';
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.onresult = (event: any) => {
			const text = event.results[0][0].transcript;
			onResult(text);
		};
		recognition.start();
	}
</script>

<button
	type="button"
	class="voice-btn {isRecording ? 'recording' : ''}"
	onclick={startVoice}
	title="语音输入"
>
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
		<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
		<line x1="12" y1="19" x2="12" y2="23" />
		<line x1="8" y1="23" x2="16" y2="23" />
	</svg>
</button>
