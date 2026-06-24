<script lang="ts">
	import { onMount } from 'svelte';

	let { message, onDone }: { message: string; onDone: () => void } = $props();
	onMount(() => {
		const timer = setTimeout(onDone, 2000);
		return () => clearTimeout(timer);
	});
</script>

<div class="toast">{message}</div>
