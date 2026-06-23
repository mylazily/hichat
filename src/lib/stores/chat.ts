import { writable, derived, get } from 'svelte/store';
import { streamChatCompletion, fetchModels } from '$lib/api/agnes-ai';
import { matchKnowledge, SYSTEM_PROMPT } from '$lib/knowledge';

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
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

// Settings
const DEFAULT_API_KEY = 'sk-1fl1DqnHZ29eMviDFAJTY6nnLVlpdst3j9ybnJcvXuWVKbu8';
export const apiKey = writable<string>(DEFAULT_API_KEY);
export const selectedModel = writable<string>('agnes-2.0-flash');
export const models = writable<string[]>([]);

// Load settings from localStorage
if (typeof window !== 'undefined') {
	const savedKey = localStorage.getItem('agnes-api-key');
	if (savedKey) apiKey.set(savedKey);
	const savedModel = localStorage.getItem('agnes-model');
	if (savedModel) selectedModel.set(savedModel);
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
			isStreaming: false
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
			content: '请先在设置中配置 API Key 才能使用 AI 对话功能哦~',
			timestamp: Date.now(),
			isStreaming: false
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
		isStreaming: true
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
			model: get(selectedModel)
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
		messages.update(msgs =>
			msgs.map(m =>
				m.id === assistantId
					? { ...m, content: fullContent, isStreaming: false }
					: m
			)
		);
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

// Load models
export async function loadModels() {
	const key = get(apiKey);
	if (!key) return;
	const modelList = await fetchModels({ apiKey: key });
	models.set(modelList);
	if (modelList.length > 0 && !modelList.includes(get(selectedModel))) {
		selectedModel.set(modelList[0]);
	}
}

// Save settings
export function saveSettings(key: string, model: string) {
	apiKey.set(key);
	selectedModel.set(model);
	localStorage.setItem('agnes-api-key', key);
	localStorage.setItem('agnes-model', model);
	loadModels();
}
