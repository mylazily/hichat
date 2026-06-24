// Persistent Memory System - User preferences, facts, cross-session memory
import { writable, get } from 'svelte/store';

export interface MemoryEntry {
	id: string;
	content: string;
	category: 'preference' | 'fact' | 'context' | 'goal';
	timestamp: number;
	importance: number; // 1-10, higher = more important
}

export interface MemoryState {
	entries: MemoryEntry[];
	enabled: boolean;
	maxEntries: number;
}

const MEMORY_KEY = 'hichat-memory';
const MEMORY_ENABLED_KEY = 'hichat-memory-enabled';

function loadMemory(): MemoryEntry[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(MEMORY_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function saveMemory(entries: MemoryEntry[]) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(MEMORY_KEY, JSON.stringify(entries));
}

function generateId(): string {
	return crypto.randomUUID();
}

// Core stores
export const memoryEntries = writable<MemoryEntry[]>(loadMemory());
export const memoryEnabled = writable<boolean>(
	typeof window !== 'undefined'
		? localStorage.getItem(MEMORY_ENABLED_KEY) !== 'false'
		: true
);

// Subscribe to save changes
memoryEntries.subscribe(entries => saveMemory(entries));
memoryEnabled.subscribe(enabled => {
	if (typeof window !== 'undefined') {
		localStorage.setItem(MEMORY_ENABLED_KEY, String(enabled));
	}
});

/**
 * Add a memory entry
 */
export function addMemory(content: string, category: MemoryEntry['category'] = 'fact', importance: number = 5): MemoryEntry {
	const entry: MemoryEntry = {
		id: generateId(),
		content,
		category,
		timestamp: Date.now(),
		importance: Math.min(10, Math.max(1, importance))
	};

	memoryEntries.update(entries => {
		// Remove duplicates (same content)
		const filtered = entries.filter(e => e.content !== content);
		// Add new entry at the beginning
		const updated = [entry, ...filtered];
		// Keep max 50 entries
		return updated.slice(0, 50);
	});

	return entry;
}

/**
 * Remove a memory entry
 */
export function removeMemory(id: string) {
	memoryEntries.update(entries => entries.filter(e => e.id !== id));
}

/**
 * Clear all memories
 */
export function clearMemory() {
	memoryEntries.set([]);
}

/**
 * Get memories formatted for system prompt context
 */
export function getMemoryContext(): string {
	const entries = get(memoryEntries);
	if (entries.length === 0) return '';

	const enabled = get(memoryEnabled);
	if (!enabled) return '';

	// Sort by importance desc, then timestamp desc
	const sorted = [...entries].sort((a, b) => {
		if (b.importance !== a.importance) return b.importance - a.importance;
		return b.timestamp - a.timestamp;
	});

	// Take top 15 most important/recent
	const topEntries = sorted.slice(0, 15);

	let context = '\n\n## 关于用户的记忆\n\n';
	context += '以下是你记住的关于用户的信息，请在回答时参考：\n\n';

	for (const entry of topEntries) {
		const categoryLabel = {
			preference: '偏好',
			fact: '事实',
			context: '上下文',
			goal: '目标'
		}[entry.category];
		context += `- [${categoryLabel}] ${entry.content}\n`;
	}

	return context;
}

/**
 * Extract memories from AI response
 * AI can use [REMEMBER:内容|类别|重要性] to store memories
 */
export function extractMemoriesFromResponse(response: string): string {
	const regex = /\[REMEMBER:([^|]+)(?:\|([^|]+))?(?:\|(\d+))?\]/g;
	let match;
	let cleanResponse = response;

	while ((match = regex.exec(response)) !== null) {
		const content = match[1].trim();
		const category = (match[2]?.trim() as MemoryEntry['category']) || 'fact';
		const importance = parseInt(match[3] || '5', 10);

		if (content) {
			addMemory(content, category, importance);
		}
		cleanResponse = cleanResponse.replace(match[0], '');
	}

	return cleanResponse.trim();
}

/**
 * Toggle memory system on/off
 */
export function toggleMemory() {
	memoryEnabled.update(v => !v);
}
