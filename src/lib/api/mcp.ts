// MCP (Model Context Protocol) - Lightweight implementation
// Provides standardized tool definitions for AI agents

export interface MCPTool {
	name: string;
	description: string;
	parameters: {
		type: string;
		properties: Record<string, {
			type: string;
			description: string;
			enum?: string[];
		}>;
		required: string[];
	};
}

export interface MCPResource {
	uri: string;
	name: string;
	mimeType?: string;
	description?: string;
}

export interface MCPPrompt {
	name: string;
	description: string;
	arguments?: Array<{
		name: string;
		description: string;
		required?: boolean;
	}>;
}

// Built-in MCP tools
export const BUILT_IN_TOOLS: MCPTool[] = [
	{
		name: 'calculator',
		description: '执行数学计算，支持基本运算、三角函数、对数等',
		parameters: {
			type: 'object',
			properties: {
				expression: {
					type: 'string',
					description: '数学表达式，如 "2 + 2", "sin(30)", "log(100)"'
				}
			},
			required: ['expression']
		}
	},
	{
		name: 'code_runner',
		description: '执行简单的 JavaScript/TypeScript 代码片段',
		parameters: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description: 'JavaScript 代码片段'
				},
				language: {
					type: 'string',
					description: '编程语言',
					enum: ['javascript', 'typescript']
				}
			},
			required: ['code']
		}
	},
	{
		name: 'json_formatter',
		description: '格式化 JSON 数据，支持美化、压缩、验证',
		parameters: {
			type: 'object',
			properties: {
				json: {
					type: 'string',
					description: 'JSON 字符串'
				},
				action: {
					type: 'string',
					description: '操作类型',
					enum: ['format', 'minify', 'validate']
				}
			},
			required: ['json', 'action']
		}
	},
	{
		name: 'text_transform',
		description: '文本转换工具，支持大小写转换、Base64 编解码、URL 编解码等',
		parameters: {
			type: 'object',
			properties: {
				text: {
					type: 'string',
					description: '输入文本'
				},
				action: {
					type: 'string',
					description: '转换操作',
					enum: ['uppercase', 'lowercase', 'base64_encode', 'base64_decode', 'url_encode', 'url_decode', 'md5', 'sha256']
				}
			},
			required: ['text', 'action']
		}
	},
	{
		name: 'datetime',
		description: '日期时间工具，支持格式转换、时区转换、时间差计算',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					description: '操作类型',
					enum: ['now', 'format', 'diff', 'convert_timezone']
				},
				value: {
					type: 'string',
					description: '日期时间值或格式字符串'
				},
				fromTimezone: {
					type: 'string',
					description: '源时区'
				},
				toTimezone: {
					type: 'string',
					description: '目标时区'
				}
			},
			required: ['action']
		}
	}
];

// Execute MCP tool
export async function executeMCPTool(name: string, params: Record<string, unknown>): Promise<string> {
	try {
		switch (name) {
			case 'calculator':
				return executeCalculator(params.expression as string);
			case 'code_runner':
				return executeCodeRunner(params.code as string);
			case 'json_formatter':
				return executeJSONFormatter(params.json as string, params.action as string);
			case 'text_transform':
				return executeTextTransform(params.text as string, params.action as string);
			case 'datetime':
				return executeDateTime(params.action as string, params.value as string | undefined, params.fromTimezone as string | undefined, params.toTimezone as string | undefined);
			default:
				return `未知工具: ${name}`;
		}
	} catch (err) {
		return `工具执行错误: ${err instanceof Error ? err.message : '未知错误'}`;
	}
}

function executeCalculator(expression: string): string {
	try {
		// Sanitize expression - only allow safe math operations
		const sanitized = expression
			.replace(/[^0-9+\-*/().\s^sinocstalgqrtpiePIE]/g, '')
			.replace(/\^/g, '**')
			.replace(/sin\(/g, 'Math.sin(')
			.replace(/cos\(/g, 'Math.cos(')
			.replace(/tan\(/g, 'Math.tan(')
			.replace(/log\(/g, 'Math.log10(')
			.replace(/ln\(/g, 'Math.log(')
			.replace(/sqrt\(/g, 'Math.sqrt(')
			.replace(/abs\(/g, 'Math.abs(')
			.replace(/pow\(/g, 'Math.pow(')
			.replace(/pi/gi, 'Math.PI')
			.replace(/e\b/gi, 'Math.E');

		// eslint-disable-next-line no-new-func
		const result = new Function(`return (${sanitized})`)();
		return JSON.stringify({ result: Number(result).toFixed(6).replace(/\.?0+$/, '') });
	} catch {
		return JSON.stringify({ error: '计算表达式无效' });
	}
}

function executeCodeRunner(code: string): string {
	try {
		// Only allow simple console.log outputs
		let output = '';
		const mockConsole = {
			log: (...args: unknown[]) => { output += args.map(a => String(a)).join(' ') + '\n'; },
			error: (...args: unknown[]) => { output += 'ERROR: ' + args.map(a => String(a)).join(' ') + '\n'; }
		};

		// Create safe function with limited globals
		const safeCode = code
			.replace(/console\./g, 'mockConsole.')
			.replace(/eval\(/g, 'throw new Error("eval not allowed")')
			.replace(/Function\(/g, 'throw new Error("Function not allowed")');

		// eslint-disable-next-line no-new-func
		const fn = new Function('mockConsole', safeCode);
		fn(mockConsole);

		return JSON.stringify({ output: output || '(无输出)' });
	} catch (err) {
		return JSON.stringify({ error: err instanceof Error ? err.message : '代码执行错误' });
	}
}

function executeJSONFormatter(json: string, action: string): string {
	try {
		switch (action) {
			case 'format': {
				const obj = JSON.parse(json);
				return JSON.stringify({ result: JSON.stringify(obj, null, 2) });
			}
			case 'minify': {
				const obj = JSON.parse(json);
				return JSON.stringify({ result: JSON.stringify(obj) });
			}
			case 'validate': {
				JSON.parse(json);
				return JSON.stringify({ result: 'JSON 格式有效' });
			}
			default:
				return JSON.stringify({ error: '未知操作' });
		}
	} catch (err) {
		return JSON.stringify({ error: `JSON 处理错误: ${err instanceof Error ? err.message : '未知错误'}` });
	}
}

function executeTextTransform(text: string, action: string): string {
	try {
		switch (action) {
			case 'uppercase':
				return JSON.stringify({ result: text.toUpperCase() });
			case 'lowercase':
				return JSON.stringify({ result: text.toLowerCase() });
			case 'base64_encode':
				return JSON.stringify({ result: btoa(text) });
			case 'base64_decode':
				return JSON.stringify({ result: atob(text) });
			case 'url_encode':
				return JSON.stringify({ result: encodeURIComponent(text) });
			case 'url_decode':
				return JSON.stringify({ result: decodeURIComponent(text) });
			case 'md5':
				return JSON.stringify({ result: simpleHash(text, 'md5') });
			case 'sha256':
				return JSON.stringify({ result: simpleHash(text, 'sha256') });
			default:
				return JSON.stringify({ error: '未知操作' });
		}
	} catch (err) {
		return JSON.stringify({ error: `转换错误: ${err instanceof Error ? err.message : '未知错误'}` });
	}
}

// Simple hash function (not cryptographically secure, for demo only)
function simpleHash(str: string, _algo: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, '0');
}

function executeDateTime(
	action: string,
	value?: string,
	fromTimezone?: string,
	toTimezone?: string
): string {
	try {
		switch (action) {
			case 'now': {
				return JSON.stringify({ result: new Date().toISOString() });
			}
			case 'format': {
				const date = value ? new Date(value) : new Date();
				return JSON.stringify({
					result: date.toLocaleString('zh-CN', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					})
				});
			}
			case 'diff': {
				const d1 = value ? new Date(value) : new Date();
				const d2 = new Date();
				const diffMs = Math.abs(d2.getTime() - d1.getTime());
				const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
				const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				return JSON.stringify({ result: `${diffDays}天 ${diffHours}小时` });
			}
			case 'convert_timezone': {
				if (!value || !fromTimezone || !toTimezone) {
					return JSON.stringify({ error: '缺少时区参数' });
				}
				const date = new Date(value);
				const formatter = new Intl.DateTimeFormat('zh-CN', {
					timeZone: toTimezone,
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				});
				return JSON.stringify({ result: formatter.format(date) });
			}
			default:
				return JSON.stringify({ error: '未知操作' });
		}
	} catch (err) {
		return JSON.stringify({ error: `日期时间错误: ${err instanceof Error ? err.message : '未知错误'}` });
	}
}

// MCP Tool definitions for AI system prompt
export function getMCPToolDefinitions(): string {
	return `
## MCP 工具

你可以调用以下内置 MCP 工具来执行特定任务。当用户需要这些功能时，在回复中使用 [MCP:工具名|参数JSON] 格式：

### 1. calculator - 计算器
[MCP:calculator|{"expression":"2+2"}]
支持：加减乘除、幂运算(^)、三角函数(sin/cos/tan)、对数(log/ln)、平方根(sqrt)

### 2. code_runner - 代码执行
[MCP:code_runner|{"code":"console.log('Hello')"}]
支持 JavaScript，可以执行简单的代码片段

### 3. json_formatter - JSON 处理
[MCP:json_formatter|{"json":"{\"a\":1}","action":"format"}]
action 可选：format(美化)、minify(压缩)、validate(验证)

### 4. text_transform - 文本转换
[MCP:text_transform|{"text":"hello","action":"uppercase"}]
action 可选：uppercase、lowercase、base64_encode、base64_decode、url_encode、url_decode

### 5. datetime - 日期时间
[MCP:datetime|{"action":"now"}]
action 可选：now(当前时间)、format(格式化)、diff(时间差)、convert_timezone(时区转换)

规则：
- 每次最多调用 2 个 MCP 工具
- 工具标记放在回复开头
- 工具执行结果会自动返回给你`;
}

// Parse MCP tool calls from AI response
export function parseMCPToolCalls(content: string): Array<{ name: string; params: Record<string, unknown> }> {
	const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
	const regex = /\[MCP:([^|]+)\|(\{.*?\})\]/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		try {
			const name = match[1].trim();
			const params = JSON.parse(match[2]);
			calls.push({ name, params });
		} catch { /* ignore parse errors */ }
	}
	return calls;
}

// Remove MCP tool calls from content
export function cleanMCPMarkers(content: string): string {
	return content.replace(/\[MCP:[^\]]+\]/g, '').trim();
}
