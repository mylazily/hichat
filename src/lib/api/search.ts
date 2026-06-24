// Advanced Web Search - SearXNG + Jina AI Summarizer
// Free, no API key required

export interface SearchResult {
	title: string;
	url: string;
	content: string;
	engine: string;
	score: number;
}

export interface SummarizedResult {
	title: string;
	url: string;
	summary: string;
	fullContent?: string;
}

const SEARXNG_INSTANCES = [
	'https://search.bus-hit.me',
	'https://searx.be',
	'https://searx.tiekoetter.com',
	'https://searx.prvcy.eu',
];

let currentInstanceIndex = 0;

function getSearXNGUrl(): string {
	return SEARXNG_INSTANCES[currentInstanceIndex];
}

function rotateInstance() {
	currentInstanceIndex = (currentInstanceIndex + 1) % SEARXNG_INSTANCES.length;
}

/**
 * Search the web using SearXNG (free, no key)
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
	const errors: string[] = [];

	for (let attempt = 0; attempt < SEARXNG_INSTANCES.length; attempt++) {
		const baseUrl = getSearXNGUrl();
		try {
			const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&language=zh-CN&safesearch=0&categories=general`;
			const res = await fetch(url, {
				headers: { 'Accept': 'application/json' },
				// Cloudflare Workers may need mode: 'cors'
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			const data = await res.json();
			const results: SearchResult[] = [];

			if (data.results && Array.isArray(data.results)) {
				for (const r of data.results.slice(0, maxResults)) {
					results.push({
						title: r.title || '',
						url: r.url || '',
						content: r.content || r.abstract || '',
						engine: r.engine || 'searxng',
						score: r.score || 0
					});
				}
			}

			if (results.length > 0) {
				return results;
			}
		} catch (err) {
			errors.push(`${baseUrl}: ${err instanceof Error ? err.message : 'unknown'}`);
			rotateInstance();
		}
	}

	// Fallback: return empty results with error info
	return [];
}

/**
 * Fetch and summarize a webpage using Jina AI Reader (free, no key)
 * https://r.jina.ai/http://example.com
 */
export async function fetchWebpage(url: string): Promise<string> {
	try {
		const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
		const res = await fetch(jinaUrl, {
			headers: { 'Accept': 'text/plain' }
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} catch (err) {
		return `无法获取页面内容: ${err instanceof Error ? err.message : '未知错误'}`;
	}
}

/**
 * Deep search: search + fetch top results + summarize
 */
export async function deepSearch(query: string): Promise<{ results: SearchResult[]; summaries: SummarizedResult[] }> {
	const results = await searchWeb(query, 5);
	const summaries: SummarizedResult[] = [];

	// Fetch content for top 3 results in parallel
	const topResults = results.slice(0, 3);
	const fetchPromises = topResults.map(async (r) => {
		const content = await fetchWebpage(r.url);
		return {
			title: r.title,
			url: r.url,
			summary: content.slice(0, 2000), // Truncate for token efficiency
			fullContent: content
		};
	});

	summaries.push(...await Promise.all(fetchPromises));
	return { results, summaries };
}

/**
 * Format search results for AI context
 */
export function formatSearchContext(results: SearchResult[], summaries: SummarizedResult[]): string {
	let context = `## 网络搜索结果\n\n`;

	for (let i = 0; i < summaries.length; i++) {
		const s = summaries[i];
		context += `### [${i + 1}] ${s.title}\n`;
		context += `来源: ${s.url}\n`;
		context += `内容摘要: ${s.summary.slice(0, 1500)}\n\n`;
	}

	if (summaries.length === 0 && results.length > 0) {
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			context += `### [${i + 1}] ${r.title}\n`;
			context += `来源: ${r.url}\n`;
			context += `摘要: ${r.content}\n\n`;
		}
	}

	return context;
}
