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
