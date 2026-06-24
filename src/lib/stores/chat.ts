import { writable, get } from 'svelte/store';
import { streamChatCompletion, generateImage, createVideoTask, getVideoStatus } from '$lib/api/agnes-ai';
import type { AgnesAIConfig } from '$lib/api/agnes-ai';
import { getWeather, getCurrentTime, getNews, webSearch } from '$lib/api/tools';
import { matchKnowledge, SYSTEM_PROMPT } from '$lib/knowledge';

export interface ToolCall {
	type: 'weather' | 'time' | 'news' | 'search';
	parameter: string;
	status: 'calling' | 'success' | 'error';
	result?: string;
}

export interface Citation {
	title: string;
	url: string;
	snippet: string;
}

export interface QuizQuestion {
	question: string;
	options: string[];
	answer: number;
	explanation: string;
}

export interface PipelineStep {
	name: string;
	status: 'pending' | 'running' | 'done';
}

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
	multimodalType?: 'text' | 'image' | 'video';
	imageUrl?: string;
	videoUrl?: string;
	generationStatus?: 'generating' | 'polling' | 'ready' | 'error';
	generationError?: string;
	imageAttachments?: string[];
	isRegenerated?: boolean;
	thinkingContent?: string;
	showThinking?: boolean;
	// New fields for tools & features
	toolCalls?: ToolCall[];
	citations?: Citation[];
	quizQuestions?: QuizQuestion[];
	pipelineSteps?: PipelineStep[];
	researchTopic?: string;
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

// Parse ALL markers from AI response
function parseAllMarkers(content: string): {
	cleanContent: string;
	imagePrompts: string[];
	videoPrompts: string[];
	thinkingContent: string;
	toolCalls: ToolCall[];
	citations: Citation[];
	quizQuestions: QuizQuestion[];
	pipelineSteps: PipelineStep[];
	researchTopic: string;
} {
	const imagePrompts: string[] = [];
	const videoPrompts: string[] = [];
	const toolCalls: ToolCall[] = [];
	const citations: Citation[] = [];
	const quizQuestions: QuizQuestion[] = [];
	let pipelineSteps: PipelineStep[] = [];
	let researchTopic = '';

	// Extract image prompts
	const imageRegex = /\[GENERATE_IMAGE:(.*?)\]/g;
	let match;
	while ((match = imageRegex.exec(content)) !== null) {
		imagePrompts.push(match[1].trim());
	}

	// Extract video prompts
	const videoRegex = /\[GENERATE_VIDEO:(.*?)\]/g;
	while ((match = videoRegex.exec(content)) !== null) {
		videoPrompts.push(match[1].trim());
	}

	// Extract thinking content
	let thinkingContent = '';
	const thinkingRegex = /\[THINKING:(.*?)\]/gs;
	const thinkingMatch = thinkingRegex.exec(content);
	if (thinkingMatch) {
		thinkingContent = thinkingMatch[1].trim();
	}

	// Extract tool calls
	const toolWeatherRegex = /\[TOOL_WEATHER:(.*?)\]/g;
	while ((match = toolWeatherRegex.exec(content)) !== null) {
		toolCalls.push({ type: 'weather', parameter: match[1].trim(), status: 'calling' });
	}

	const toolTimeRegex = /\[TOOL_TIME:(.*?)\]/g;
	while ((match = toolTimeRegex.exec(content)) !== null) {
		toolCalls.push({ type: 'time', parameter: match[1].trim(), status: 'calling' });
	}

	const toolNewsRegex = /\[TOOL_NEWS:(.*?)\]/g;
	while ((match = toolNewsRegex.exec(content)) !== null) {
		toolCalls.push({ type: 'news', parameter: match[1].trim(), status: 'calling' });
	}

	const toolSearchRegex = /\[TOOL_SEARCH:(.*?)\]/g;
	while ((match = toolSearchRegex.exec(content)) !== null) {
		toolCalls.push({ type: 'search', parameter: match[1].trim(), status: 'calling' });
	}

	// Extract citations
	const citationRegex = /\[CITATION:(\{.*?\})\]/g;
	while ((match = citationRegex.exec(content)) !== null) {
		try {
			const citation = JSON.parse(match[1]);
			if (citation.title && citation.url) {
				citations.push(citation);
			}
		} catch { /* ignore parse errors */ }
	}

	// Extract quiz questions
	const quizRegex = /\[QUIZ:(\{.*?\})\]/g;
	while ((match = quizRegex.exec(content)) !== null) {
		try {
			const quiz = JSON.parse(match[1]);
			if (quiz.question && quiz.options && typeof quiz.answer === 'number') {
				quizQuestions.push(quiz);
			}
		} catch { /* ignore parse errors */ }
	}

	// Extract pipeline steps
	const pipelineRegex = /\[PIPELINE:(.*?)\]/g;
	while ((match = pipelineRegex.exec(content)) !== null) {
		const steps = match[1].split(',').map((s: string) => s.trim());
		pipelineSteps = steps.map((name: string) => ({ name, status: 'pending' as const }));
	}

	// Extract research topic
	const researchRegex = /\[RESEARCH:(.*?)\]/g;
	const researchMatch = researchRegex.exec(content);
	if (researchMatch) {
		researchTopic = researchMatch[1].trim();
	}

	// Clean content - remove all markers
	const cleanContent = content
		.replace(/\[GENERATE_IMAGE:.*?\]/g, '')
		.replace(/\[GENERATE_VIDEO:.*?\]/g, '')
		.replace(/\[THINKING:.*?\]/gs, '')
		.replace(/\[TOOL_WEATHER:.*?\]/g, '')
		.replace(/\[TOOL_TIME:.*?\]/g, '')
		.replace(/\[TOOL_NEWS:.*?\]/g, '')
		.replace(/\[TOOL_SEARCH:.*?\]/g, '')
		.replace(/\[CITATION:\{.*?\}\]/g, '')
		.replace(/\[QUIZ:\{.*?\}\]/g, '')
		.replace(/\[PIPELINE:.*?\]/g, '')
		.replace(/\[RESEARCH:.*?\]/g, '')
		.trim();

	return { cleanContent, imagePrompts, videoPrompts, thinkingContent, toolCalls, citations, quizQuestions, pipelineSteps, researchTopic };
}

// Execute a tool call and return the result
async function executeToolCall(toolCall: ToolCall): Promise<string> {
	try {
		switch (toolCall.type) {
			case 'weather':
				return await getWeather(toolCall.parameter);
			case 'time':
				return getCurrentTime(toolCall.parameter === 'auto' ? undefined : toolCall.parameter);
			case 'news':
				return await getNews(toolCall.parameter);
			case 'search':
				return await webSearch(toolCall.parameter);
			default:
				return '未知工具类型';
		}
	} catch (err) {
		return `工具调用失败: ${err instanceof Error ? err.message : '未知错误'}`;
	}
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

		messages.update(msgs =>
			msgs.map(m =>
				m.id === videoMsgId
					? { ...m, generationStatus: 'polling' as const }
					: m
			)
		);

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
export async function sendMessage(text: string, imageAttachments?: string[]) {
	if (get(isStreaming)) return;

	const userMessage: Message = {
		id: generateId(),
		role: 'user',
		content: text,
		timestamp: Date.now(),
		imageAttachments: imageAttachments
	};

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

	// Build API messages - support image attachments as vision input
	const allMsgs = get(messages);
	const apiMessages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		...allMsgs.filter(m => m.role !== 'system' && m.role !== 'tool').map(m => {
			if (m.role === 'user' && m.imageAttachments && m.imageAttachments.length > 0) {
				const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
				if (m.content) {
					parts.push({ type: 'text', text: m.content });
				}
				for (const img of m.imageAttachments) {
					parts.push({ type: 'image_url', image_url: { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` } });
				}
				return { role: m.role, content: parts };
			}
			return {
				role: m.role,
				content: m.content
			};
		})
	].filter(m => m.role !== 'assistant' || (typeof m.content === 'string' && m.content !== ''));

	try {
		const stream = streamChatCompletion(apiMessages as { role: string; content: string }[], {
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

		// Parse ALL markers from the completed response
		const parsed = parseAllMarkers(fullContent);

		// Update the text message with cleaned content and all parsed data
		messages.update(msgs =>
			msgs.map(m =>
				m.id === assistantId
					? {
						...m,
						content: parsed.cleanContent,
						isStreaming: false,
						thinkingContent: parsed.thinkingContent || undefined,
						showThinking: !!parsed.thinkingContent,
						toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
						citations: parsed.citations.length > 0 ? parsed.citations : undefined,
						quizQuestions: parsed.quizQuestions.length > 0 ? parsed.quizQuestions : undefined,
						pipelineSteps: parsed.pipelineSteps.length > 0 ? parsed.pipelineSteps : undefined,
						researchTopic: parsed.researchTopic || undefined
					}
					: m
			)
		);

		// Execute tool calls in parallel
		if (parsed.toolCalls.length > 0) {
			const toolResults: string[] = [];

			// Execute all tool calls
			const promises = parsed.toolCalls.map(async (tc) => {
				const result = await executeToolCall(tc);
				// Update tool call status
				messages.update(msgs =>
					msgs.map(m => {
						if (m.id !== assistantId || !m.toolCalls) return m;
						return {
							...m,
							toolCalls: m.toolCalls.map(t =>
								t === tc ? { ...t, status: 'success' as const, result } : t
							)
						};
					})
				);
				return result;
			});

			const results = await Promise.all(promises);

			// Add tool results as context and re-ask AI for a better answer
			if (results.length > 0) {
				const toolContext = results.map((r, i) => {
					const toolName = parsed.toolCalls[i].type;
					return `[工具结果-${toolName}]: ${r}`;
				}).join('\n\n');

				// Stream a follow-up response with tool context
				const followUpId = generateId();
				const followUpMsg: Message = {
					id: followUpId,
					role: 'assistant',
					content: '',
					timestamp: Date.now(),
					isStreaming: true,
					multimodalType: 'text'
				};
				messages.update(msgs => [...msgs, followUpMsg]);

				// Build messages with tool context
				const followUpApiMessages = [
					...apiMessages,
					{ role: 'user', content: text },
					{ role: 'assistant', content: fullContent },
					{ role: 'user', content: `请根据以下工具返回的结果，用自然友好的语言回答用户的问题：\n\n${toolContext}` }
				];

				try {
					const followUpStream = streamChatCompletion(followUpApiMessages as { role: string; content: string }[], {
						apiKey: key,
						model: 'agnes-2.0-flash'
					});
					let followUpContent = '';
					for await (const chunk of followUpStream) {
						if (chunk.error) {
							followUpContent += `\n\n[错误: ${chunk.error}]`;
							break;
						}
						if (chunk.content) {
							followUpContent += chunk.content;
							messages.update(msgs =>
								msgs.map(m =>
									m.id === followUpId
										? { ...m, content: followUpContent }
										: m
								)
							);
						}
						if (chunk.done) break;
					}

					// Parse any additional markers from follow-up
					const followUpParsed = parseAllMarkers(followUpContent);
					messages.update(msgs =>
						msgs.map(m =>
							m.id === followUpId
								? {
									...m,
									content: followUpParsed.cleanContent,
									isStreaming: false,
									citations: followUpParsed.citations.length > 0 ? followUpParsed.citations : undefined
								}
								: m
						)
					);

					// Trigger image/video from follow-up
					for (const prompt of followUpParsed.imagePrompts) {
						handleImageGeneration(prompt);
					}
					for (const prompt of followUpParsed.videoPrompts) {
						handleVideoGeneration(prompt);
					}
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : '未知错误';
					messages.update(msgs =>
						msgs.map(m =>
							m.id === followUpId
								? { ...m, content: `[错误: ${errorMsg}]`, isStreaming: false }
								: m
						)
					);
				}
			}
		}

		// Animate pipeline steps
		if (parsed.pipelineSteps.length > 0) {
			animatePipelineSteps(assistantId, parsed.pipelineSteps);
		}

		// Trigger multimodal generations (don't await - let them run in background)
		for (const prompt of parsed.imagePrompts) {
			handleImageGeneration(prompt);
		}
		for (const prompt of parsed.videoPrompts) {
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
		const allMsgs = [...get(messages)];
		addConversationToStorage(currentConversationId, text.slice(0, 30), allMsgs);
	}
}

// Animate pipeline steps sequentially
function animatePipelineSteps(messageId: string, steps: PipelineStep[]) {
	let currentStep = 0;

	function animateNext() {
		if (currentStep >= steps.length) return;

		messages.update(msgs =>
			msgs.map(m => {
				if (m.id !== messageId || !m.pipelineSteps) return m;
				return {
					...m,
					pipelineSteps: m.pipelineSteps.map((s, i) => {
						if (i < currentStep) return { ...s, status: 'done' as const };
						if (i === currentStep) return { ...s, status: 'running' as const };
						return s;
					})
				};
			})
		);

		setTimeout(() => {
			currentStep++;
			animateNext();
		}, 1500);
	}

	animateNext();
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

export const pinnedConversations = writable<string[]>([]);

export function togglePinConversation(id: string) {
	pinnedConversations.update(pins => {
		if (pins.includes(id)) return pins.filter(p => p !== id);
		return [...pins, id];
	});
	if (typeof window !== 'undefined') {
		localStorage.setItem('hichat-pinned', JSON.stringify(get(pinnedConversations)));
	}
}

export function regenerateLastMessage() {
	const msgs = get(messages);
	const lastAssistantIdx = msgs.findLastIndex(m => m.role === 'assistant' && !m.multimodalType);
	if (lastAssistantIdx < 0) return;
	const lastUserIdx = msgs.findLastIndex(m => m.role === 'user');
	if (lastUserIdx < 0) return;
	const updated = msgs.slice(0, lastAssistantIdx);
	messages.set(updated);
	const userMsg = msgs[lastUserIdx].content;
	sendMessage(userMsg);
}

export function exportConversation(): string {
	const msgs = get(messages);
	let md = `# ${getCurrentTitle()}\n\n`;
	for (const msg of msgs) {
		if (msg.role === 'user') {
			md += `## 用户\n${msg.content}\n\n`;
		} else if (msg.role === 'assistant' && msg.content) {
			md += `## 爱爱\n${msg.content}\n\n`;
			if (msg.imageUrl) md += `![生成的图片](${msg.imageUrl})\n\n`;
			if (msg.videoUrl) md += `[生成的视频](${msg.videoUrl})\n\n`;
		}
	}
	return md;
}

export function getCurrentTitle(): string {
	const convs = getStoredConversations();
	const conv = convs.find(c => c.id === currentConversationId);
	return conv?.title || '新对话';
}

export function searchConversations(query: string): StoredConversation[] {
	const convs = getStoredConversations();
	if (!query.trim()) return convs;
	const q = query.toLowerCase();
	return convs.filter(c =>
		c.title.toLowerCase().includes(q) ||
		c.messages.some(m => m.content.toLowerCase().includes(q))
	);
}

// Load pinned on init
if (typeof window !== 'undefined') {
	const savedPins = localStorage.getItem('hichat-pinned');
	if (savedPins) {
		try { pinnedConversations.set(JSON.parse(savedPins)); } catch {}
	}
}
