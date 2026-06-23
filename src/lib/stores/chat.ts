import { writable, get } from 'svelte/store';
import { streamChatCompletion, generateImage, createVideoTask, getVideoStatus } from '$lib/api/agnes-ai';
import type { AgnesAIConfig } from '$lib/api/agnes-ai';
import { matchKnowledge, SYSTEM_PROMPT } from '$lib/knowledge';

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
	multimodalType?: 'text' | 'image' | 'video';
	imageUrl?: string;
	videoUrl?: string;
	generationStatus?: 'generating' | 'polling' | 'ready' | 'error';
	generationError?: string;
}

export interface StoredConversation {
	id: string;
	title: string;
	messages: Message[];
	timestamp: number;
}

// Core state
export const messages = writable<Message[]>([]);
export const isStreaming = writable(false);

// Hidden API key - hardcoded, no settings UI
const DEFAULT_API_KEY = 'sk-1fl1DqnHZ29eMviDFAJTY6nnLVlpdst3j9ybnJcvXuWVKbu8';
export const apiKey = writable<string>(DEFAULT_API_KEY);

// Load API key from localStorage if saved
if (typeof window !== 'undefined') {
	const savedKey = localStorage.getItem('agnes-api-key');
	if (savedKey) apiKey.set(savedKey);
}

// Generate unique ID
function generateId(): string {
	return crypto.randomUUID();
}

// Conversation storage
const CONVERSATIONS_KEY = 'hichat-conversations';

export function getStoredConversations(): StoredConversation[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(CONVERSATIONS_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function saveConversations(conversations: StoredConversation[]) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function addConversationToStorage(id: string, title: string, msgs: Message[]) {
	const conversations = getStoredConversations();
	const existing = conversations.findIndex(c => c.id === id);
	const conv: StoredConversation = {
		id,
		title,
		messages: msgs,
		timestamp: Date.now()
	};
	if (existing >= 0) {
		conversations[existing] = conv;
	} else {
		conversations.unshift(conv);
	}
	saveConversations(conversations);
}

export function removeConversationFromStorage(id: string) {
	const conversations = getStoredConversations().filter(c => c.id !== id);
	saveConversations(conversations);
}

export function loadConversation(id: string) {
	const conversations = getStoredConversations();
	const conv = conversations.find(c => c.id === id);
	if (conv) {
		messages.set(conv.messages);
	}
}

// Current conversation ID
let currentConversationId = generateId();

// Abort controller for stopping streaming
let abortController: AbortController | null = null;

// Parse multimodal markers from AI response
function parseMultimodalMarkers(content: string): {
	cleanContent: string;
	imagePrompts: string[];
	videoPrompts: string[];
} {
	const imagePrompts: string[] = [];
	const videoPrompts: string[] = [];

	const imageRegex = /\[GENERATE_IMAGE:(.*?)\]/g;
	const videoRegex = /\[GENERATE_VIDEO:(.*?)\]/g;

	let match;
	while ((match = imageRegex.exec(content)) !== null) {
		imagePrompts.push(match[1].trim());
	}
	while ((match = videoRegex.exec(content)) !== null) {
		videoPrompts.push(match[1].trim());
	}

	const cleanContent = content
		.replace(/\[GENERATE_IMAGE:.*?\]/g, '')
		.replace(/\[GENERATE_VIDEO:.*?\]/g, '')
		.trim();

	return { cleanContent, imagePrompts, videoPrompts };
}

// Handle image generation
async function handleImageGeneration(prompt: string) {
	const key = get(apiKey);
	const config: AgnesAIConfig = { apiKey: key };

	const imageMsgId = generateId();
	const imageMsg: Message = {
		id: imageMsgId,
		role: 'assistant',
		content: '',
		timestamp: Date.now(),
		multimodalType: 'image',
		generationStatus: 'generating'
	};
	messages.update(msgs => [...msgs, imageMsg]);

	try {
		const result = await generateImage(prompt, '1024x1024', config);
		messages.update(msgs =>
			msgs.map(m =>
				m.id === imageMsgId
					? { ...m, generationStatus: 'ready' as const, imageUrl: result.url, content: result.revised_prompt || prompt }
					: m
			)
		);
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : '未知错误';
		messages.update(msgs =>
			msgs.map(m =>
				m.id === imageMsgId
					? { ...m, generationStatus: 'error' as const, generationError: errorMsg }
					: m
			)
		);
	}

	// Save to storage after image generation completes
	const allMsgs = [...get(messages)];
	addConversationToStorage(currentConversationId, '', allMsgs);
}

// Handle video generation
async function handleVideoGeneration(prompt: string) {
	const key = get(apiKey);
	const config: AgnesAIConfig = { apiKey: key };

	const videoMsgId = generateId();
	const videoMsg: Message = {
		id: videoMsgId,
		role: 'assistant',
		content: '',
		timestamp: Date.now(),
		multimodalType: 'video',
		generationStatus: 'generating'
	};
	messages.update(msgs => [...msgs, videoMsg]);

	try {
		const taskId = await createVideoTask(prompt, config);
		if (!taskId) {
			messages.update(msgs =>
				msgs.map(m =>
					m.id === videoMsgId
						? { ...m, generationStatus: 'error' as const, generationError: '无法创建视频任务' }
						: m
				)
			);
			return;
		}

		// Switch to polling status
		messages.update(msgs =>
			msgs.map(m =>
				m.id === videoMsgId
					? { ...m, generationStatus: 'polling' as const }
					: m
			)
		);

		// Poll for video status every 5 seconds
		const pollInterval = setInterval(async () => {
			try {
				const status = await getVideoStatus(taskId, config);
				if (status.status === 'completed' || status.status === 'ready' || status.status === 'success') {
					clearInterval(pollInterval);
					messages.update(msgs =>
						msgs.map(m =>
							m.id === videoMsgId
								? { ...m, generationStatus: 'ready' as const, videoUrl: status.url || '', content: prompt }
								: m
						)
					);
					// Save to storage after video generation completes
					const allMsgs = [...get(messages)];
					addConversationToStorage(currentConversationId, '', allMsgs);
				} else if (status.status === 'failed' || status.status === 'error') {
					clearInterval(pollInterval);
					messages.update(msgs =>
						msgs.map(m =>
							m.id === videoMsgId
								? { ...m, generationStatus: 'error' as const, generationError: '视频生成失败' }
								: m
						)
					);
				}
			} catch {
				// Continue polling on error
			}
		}, 5000);

		// Timeout after 5 minutes
		setTimeout(() => {
			clearInterval(pollInterval);
			messages.update(msgs => {
				const msg = msgs.find(m => m.id === videoMsgId);
				if (msg && msg.generationStatus === 'polling') {
					return msgs.map(m =>
						m.id === videoMsgId
							? { ...m, generationStatus: 'error' as const, generationError: '视频生成超时' }
							: m
					);
				}
				return msgs;
			});
		}, 5 * 60 * 1000);
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : '未知错误';
		messages.update(msgs =>
			msgs.map(m =>
				m.id === videoMsgId
					? { ...m, generationStatus: 'error' as const, generationError: errorMsg }
					: m
			)
		);
	}
}

// Send message
export async function sendMessage(text: string) {
	if (get(isStreaming)) return;

	const userMessage: Message = {
		id: generateId(),
		role: 'user',
		content: text,
		timestamp: Date.now()
	};

	// Update messages
	messages.update(msgs => [...msgs, userMessage]);

	// Check knowledge base first
	const knowledgeAnswer = matchKnowledge(text);
	if (knowledgeAnswer) {
		const assistantMessage: Message = {
			id: generateId(),
			role: 'assistant',
			content: knowledgeAnswer,
			timestamp: Date.now(),
			isStreaming: false,
			multimodalType: 'text'
		};
		messages.update(msgs => [...msgs, assistantMessage]);
		// Save to storage
		const allMsgs = [...get(messages)];
		addConversationToStorage(currentConversationId, text.slice(0, 30), allMsgs);
		return;
	}

	// Check API key
	const key = get(apiKey);
	if (!key) {
		const errorMsg: Message = {
			id: generateId(),
			role: 'assistant',
			content: '请先配置 API Key 才能使用 AI 对话功能哦~',
			timestamp: Date.now(),
			isStreaming: false,
			multimodalType: 'text'
		};
		messages.update(msgs => [...msgs, errorMsg]);
		return;
	}

	// Start streaming
	isStreaming.set(true);
	const assistantId = generateId();
	const assistantMessage: Message = {
		id: assistantId,
		role: 'assistant',
		content: '',
		timestamp: Date.now(),
		isStreaming: true,
		multimodalType: 'text'
	};
	messages.update(msgs => [...msgs, assistantMessage]);

	const apiMessages = [
		{ role: 'system', content: SYSTEM_PROMPT },
		...get(messages).filter(m => m.role !== 'system').map(m => ({
			role: m.role,
			content: m.content
		}))
	].filter(m => m.role !== 'assistant' || m.content !== '');

	try {
		const stream = streamChatCompletion(apiMessages, {
			apiKey: key,
			model: 'agnes-2.0-flash'
		});
		let fullContent = '';
		for await (const chunk of stream) {
			if (chunk.error) {
				fullContent += `\n\n[错误: ${chunk.error}]`;
				break;
			}
			if (chunk.content) {
				fullContent += chunk.content;
				messages.update(msgs =>
					msgs.map(m =>
						m.id === assistantId
							? { ...m, content: fullContent }
							: m
					)
				);
			}
			if (chunk.done) break;
		}

		// Parse multimodal markers from the completed response
		const { cleanContent, imagePrompts, videoPrompts } = parseMultimodalMarkers(fullContent);

		// Update the text message with cleaned content
		messages.update(msgs =>
			msgs.map(m =>
				m.id === assistantId
					? { ...m, content: cleanContent, isStreaming: false }
					: m
			)
		);

		// Trigger multimodal generations (don't await - let them run in background)
		for (const prompt of imagePrompts) {
			handleImageGeneration(prompt);
		}
		for (const prompt of videoPrompts) {
			handleVideoGeneration(prompt);
		}
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : '未知错误';
		messages.update(msgs =>
			msgs.map(m =>
				m.id === assistantId
					? { ...m, content: `[错误: ${errorMsg}]`, isStreaming: false }
					: m
			)
		);
	} finally {
		isStreaming.set(false);
		// Save to storage
		const allMsgs = [...get(messages)];
		addConversationToStorage(currentConversationId, text.slice(0, 30), allMsgs);
	}
}

// Stop streaming
export function stopStreaming() {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}
	isStreaming.set(false);
	messages.update(msgs =>
		msgs.map(m =>
			m.isStreaming ? { ...m, isStreaming: false } : m
		)
	);
}

// Reset chat
export function resetChat() {
	currentConversationId = generateId();
	messages.set([]);
}

// Auto-restore
export function autoRestore() {
	const conversations = getStoredConversations();
	if (conversations.length > 0) {
		loadConversation(conversations[0].id);
		currentConversationId = conversations[0].id;
	}
}
