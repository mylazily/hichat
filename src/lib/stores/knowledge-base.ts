// RAG Knowledge Base - Document storage, vectorization, and semantic search
// Uses simple TF-IDF-like scoring for client-side search (no external vector DB needed)

import { writable, get } from 'svelte/store';

export interface KnowledgeDocument {
	id: string;
	title: string;
	content: string;
	tags: string[];
	timestamp: number;
	source?: string;
}

export interface SearchResult {
	document: KnowledgeDocument;
	score: number;
	excerpt: string;
}

const KB_KEY = 'hichat-knowledge-base';

function loadDocs(): KnowledgeDocument[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(KB_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function saveDocs(docs: KnowledgeDocument[]) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(KB_KEY, JSON.stringify(docs));
}

function generateId(): string {
	return crypto.randomUUID();
}

// Core store
export const knowledgeDocs = writable<KnowledgeDocument[]>(loadDocs());

knowledgeDocs.subscribe(docs => saveDocs(docs));

/**
 * Add a document to the knowledge base
 */
export function addKnowledgeDoc(title: string, content: string, tags: string[] = [], source?: string): KnowledgeDocument {
	const doc: KnowledgeDocument = {
		id: generateId(),
		title,
		content,
		tags,
		timestamp: Date.now(),
		source
	};
	knowledgeDocs.update(docs => [doc, ...docs]);
	return doc;
}

/**
 * Remove a document
 */
export function removeKnowledgeDoc(id: string) {
	knowledgeDocs.update(docs => docs.filter(d => d.id !== id));
}

/**
 * Update a document
 */
export function updateKnowledgeDoc(id: string, updates: Partial<Omit<KnowledgeDocument, 'id' | 'timestamp'>>) {
	knowledgeDocs.update(docs =>
		docs.map(d => d.id === id ? { ...d, ...updates, timestamp: Date.now() } : d)
	);
}

/**
 * Simple TF-IDF-like search
 */
export function searchKnowledgeBase(query: string, maxResults: number = 5): SearchResult[] {
	const docs = get(knowledgeDocs);
	if (!query.trim() || docs.length === 0) return [];

	const queryTerms = tokenize(query);
	const results: SearchResult[] = [];

	for (const doc of docs) {
		const docTerms = tokenize(doc.title + ' ' + doc.content);
		const score = calculateScore(queryTerms, docTerms, doc.title, query);

		if (score > 0) {
			results.push({
				document: doc,
				score,
				excerpt: generateExcerpt(doc.content, queryTerms)
			});
		}
	}

	return results
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults);
}

/**
 * Get knowledge base context for AI
 */
export function getKnowledgeBaseContext(query: string): string {
	const results = searchKnowledgeBase(query, 3);
	if (results.length === 0) return '';

	let context = '\n\n## 知识库相关内容\n\n';
	for (const r of results) {
		context += `### ${r.document.title}\n`;
		context += `${r.excerpt}\n\n`;
	}
	return context;
}

// Tokenize text into terms
function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length > 1);
}

// Calculate relevance score
function calculateScore(queryTerms: string[], docTerms: string[], title: string, query: string): number {
	let score = 0;
	const docTermFreq = new Map<string, number>();

	for (const term of docTerms) {
		docTermFreq.set(term, (docTermFreq.get(term) || 0) + 1);
	}

	for (const term of queryTerms) {
		const freq = docTermFreq.get(term) || 0;
		if (freq > 0) {
			score += freq;
			// Boost for title matches
			if (title.toLowerCase().includes(term)) {
				score += 5;
			}
		}
	}

	// Exact phrase match boost
	if (title.toLowerCase().includes(query.toLowerCase())) {
		score += 10;
	}

	return score;
}

// Generate excerpt around matching terms
function generateExcerpt(content: string, queryTerms: string[]): string {
	const maxLength = 300;
	if (content.length <= maxLength) return content;

	// Find best position
	let bestPos = 0;
	let bestScore = 0;
	for (let i = 0; i < content.length - 100; i += 50) {
		const snippet = content.slice(i, i + 100).toLowerCase();
		let score = 0;
		for (const term of queryTerms) {
			if (snippet.includes(term)) score++;
		}
		if (score > bestScore) {
			bestScore = score;
			bestPos = i;
		}
	}

	let excerpt = content.slice(Math.max(0, bestPos - 50), bestPos + maxLength - 50);
	if (bestPos > 50) excerpt = '...' + excerpt;
	if (bestPos + maxLength - 50 < content.length) excerpt = excerpt + '...';

	return excerpt;
}
