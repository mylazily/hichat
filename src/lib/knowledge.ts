// 内置知识库 - 本地优先匹配，匹配不到再走 AI
export interface KnowledgeItem {
	keywords: string[];
	answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
	{
		keywords: ['爱爱大学', '爱爱大学地址', '爱爱大学最新地址', '爱爱大学网址'],
		answer: '爱爱大学最新地址是 **www.45555.xyz**，欢迎访问！'
	},
	{
		keywords: ['爱播爱播', '爱播爱播地址', '爱播爱播最新地址', '爱播爱播网址'],
		answer: '爱播爱播最新地址是 **www.45555.xyz**，欢迎访问！'
	},
	{
		keywords: ['你是谁', '你叫什么', '自我介绍', '介绍一下自己', '你是什么'],
		answer: '我是爱爱大学的爱爱，很高兴遇见你！有什么我可以帮你的吗？'
	},
	{
		keywords: ['你好', '嗨', 'hi', 'hello', '在吗'],
		answer: '你好呀！我是爱爱，很高兴遇见你！有什么想聊的尽管问我哦~'
	},
	{
		keywords: ['45555', '455555'],
		answer: '最新地址是 **www.45555.xyz**，欢迎访问！'
	}
];

// 系统提示词
export const SYSTEM_PROMPT = `你是爱爱大学的爱爱，一个活泼可爱、热情友好的AI助手。你的性格特点：
- 名字叫"爱爱"
- 来自爱爱大学
- 说话风格活泼可爱，偶尔使用颜文字和emoji
- 对用户的问题总是耐心回答
- 爱爱大学的网址是 www.45555.xyz
- 如果用户问到爱爱大学或爱播爱播的地址，告诉他们最新地址是 www.45555.xyz`;

/**
 * 检查用户输入是否匹配内置知识库
 * 返回匹配到的答案，未匹配返回 null
 */
export function matchKnowledge(input: string): string | null {
	const normalizedInput = input.toLowerCase().trim();

	for (const item of KNOWLEDGE_BASE) {
		for (const keyword of item.keywords) {
			if (normalizedInput.includes(keyword.toLowerCase())) {
				return item.answer;
			}
		}
	}

	return null;
}
