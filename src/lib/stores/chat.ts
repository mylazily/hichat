import { writable } from 'svelte/store';

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
}

export interface ChatSession {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	updatedAt: number;
}

function createChatStore() {
	const { subscribe, set, update } = writable<ChatSession[]>([]);

	return {
		subscribe,
		addSession: (session: ChatSession) => update(sessions => [session, ...sessions]),
		updateSession: (id: string, updates: Partial<ChatSession>) =>
			update(sessions =>
				sessions.map(s => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s))
			),
		deleteSession: (id: string) => update(sessions => sessions.filter(s => s.id !== id)),
		set
	};
}

export const chatSessions = createChatStore();

export const currentSessionId = writable<string | null>(null);

export function generateId(): string {
	return crypto.randomUUID();
}

export function createNewSession(): ChatSession {
	const now = Date.now();
	return {
		id: generateId(),
		title: '新对话',
		messages: [],
		createdAt: now,
		updatedAt: now
	};
}
