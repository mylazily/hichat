// i18n types
export type Locale = 'zh' | 'en';

export interface Translations {
	appTitle: string;
	welcomeTitle: string;
	welcomeSubtitle: string;
	inputPlaceholder: string;
	sendButton: string;
	newChatButton: string;
	chatHistory: string;
	noConversations: string;
	settings: string;
	apiSource: string;
	builtIn: string;
	custom: string;
	builtInDesc: string;
	customKeyPlaceholder: string;
	customKeyHint: string;
	model: string;
	refreshModels: string;
	modelPlaceholder: string;
	cancel: string;
	save: string;
	delete: string;
	whoAreYou: string;
	aiUniversityAddress: string;
	aiBroadcastAddress: string;
	hello: string;
	presetQuestions: string[];
	loadingHistory: string;
	loadHistoryEmpty: string;
	loadHistoryFailed: string;
	streamingThinking: string;
}
