const API_BASE = 'https://apihub.agnes-ai.com';

export interface AgnesAIConfig {
	apiKey: string;
	model?: string;
	baseUrl?: string;
}

export interface StreamChunk {
	content?: string;
	done?: boolean;
	error?: string;
}

export async function* streamChatCompletion(
	messages: { role: string; content: string }[],
	config: AgnesAIConfig
): AsyncGenerator<StreamChunk> {
	const baseUrl = config.baseUrl || API_BASE;
	const model = config.model || 'agnes-2.0-flash';

	const response = await fetch(`${baseUrl}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${config.apiKey}`
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true
		})
	});

	if (!response.ok) {
		const error = await response.text();
		yield { error: `API 错误: ${response.status} - ${error}` };
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		yield { error: '无法读取响应流' };
		return;
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !trimmed.startsWith('data: ')) continue;

				const data = trimmed.slice(6);
				if (data === '[DONE]') {
					yield { done: true };
					return;
				}

				try {
					const parsed = JSON.parse(data);
					const content = parsed.choices?.[0]?.delta?.content;
					if (content) {
						yield { content };
					}
				} catch {
					// 忽略解析错误的行
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	yield { done: true };
}

export async function fetchModels(config: AgnesAIConfig): Promise<string[]> {
	const baseUrl = config.baseUrl || API_BASE;

	try {
		const response = await fetch(`${baseUrl}/v1/models`, {
			headers: {
				Authorization: `Bearer ${config.apiKey}`
			}
		});

		if (!response.ok) return [];

		const data = await response.json();
		return data.data?.map((m: { id: string }) => m.id) || [];
	} catch {
		return [];
	}
}

// ADD: Image generation
export async function generateImage(prompt: string, size: string = '1024x1024', config: AgnesAIConfig): Promise<{ url: string; revised_prompt?: string }> {
	const baseUrl = config.baseUrl || API_BASE;
	const response = await fetch(`${baseUrl}/v1/images/generations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${config.apiKey}`
		},
		body: JSON.stringify({
			model: 'agnes-image-2.1-flash',
			prompt,
			size,
			n: 1
		})
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Image generation failed: ${response.status} - ${error}`);
	}
	const data = await response.json();
	return data.data?.[0] || { url: '', revised_prompt: prompt };
}

// ADD: Video generation (async)
export async function createVideoTask(prompt: string, config: AgnesAIConfig): Promise<string> {
	const baseUrl = config.baseUrl || API_BASE;
	const response = await fetch(`${baseUrl}/v1/videos`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${config.apiKey}`
		},
		body: JSON.stringify({
			model: 'agnes-video-v2.0',
			prompt,
			width: 768,
			height: 1152,
			num_frames: 121,
			frame_rate: 24
		})
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Video creation failed: ${response.status} - ${error}`);
	}
	const data = await response.json();
	return data.taskId || data.id || data.video_id || '';
}

export async function getVideoStatus(taskId: string, config: AgnesAIConfig): Promise<{ status: string; url?: string }> {
	const baseUrl = config.baseUrl || API_BASE;
	const response = await fetch(`${baseUrl}/agnesapi?video_id=${taskId}`, {
		headers: {
			Authorization: `Bearer ${config.apiKey}`
		}
	});
	if (!response.ok) throw new Error(`Video status check failed: ${response.status}`);
	return await response.json();
}

// Image editing (img2img) - uses agnes-image-2.0-flash
export async function editImage(prompt: string, imageBase64: string, config: AgnesAIConfig): Promise<{ url: string; revised_prompt?: string }> {
	const baseUrl = config.baseUrl || API_BASE;
	const response = await fetch(`${baseUrl}/v1/images/generations`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
		body: JSON.stringify({
			model: 'agnes-image-2.0-flash',
			prompt,
			image: imageBase64,
			n: 1,
			size: '1024x1024',
			extra_body: { tags: ['img2img'] }
		})
	});
	if (!response.ok) throw new Error(`Image edit failed: ${response.status}`);
	const data = await response.json();
	return data.data?.[0] || { url: '' };
}
