// File upload and document parsing
// Supports: PDF (text extraction), TXT, images (OCR via AI vision)

export interface ParsedFile {
	name: string;
	type: string;
	size: number;
	content: string;
	isImage: boolean;
	imageDataUrl?: string;
}

/**
 * Parse a file to text content
 */
export async function parseFile(file: File): Promise<ParsedFile> {
	const name = file.name;
	const type = file.type;
	const size = file.size;

	// Image files - return as base64 for vision input
	if (type.startsWith('image/')) {
		const imageDataUrl = await fileToDataUrl(file);
		return {
			name,
			type,
			size,
			content: `[图片: ${name}]`,
			isImage: true,
			imageDataUrl
		};
	}

	// Text files
	if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
		const text = await file.text();
		return {
			name,
			type,
			size,
			content: text.slice(0, 10000), // Limit to 10KB
			isImage: false
		};
	}

	// PDF files - basic text extraction
	if (type === 'application/pdf' || name.endsWith('.pdf')) {
		try {
			const text = await extractPdfText(file);
			return {
				name,
				type,
				size,
				content: text.slice(0, 10000),
				isImage: false
			};
		} catch {
			return {
				name,
				type,
				size,
				content: `[PDF文件: ${name}，无法提取文本内容。请描述文件内容或上传文本版本。]`,
				isImage: false
			};
		}
	}

	// Code files
	if (isCodeFile(name)) {
		const text = await file.text();
		return {
			name,
			type,
			size,
			content: `\`\`\`${getLanguageFromFilename(name)}\n${text.slice(0, 10000)}\n\`\`\``,
			isImage: false
		};
	}

	// Unsupported
	return {
		name,
		type,
		size,
		content: `[文件: ${name} (${formatFileSize(size)})，暂不支持此格式解析。]`,
		isImage: false
	};
}

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Basic PDF text extraction using pdf.js (if available) or fallback
 */
async function extractPdfText(file: File): Promise<string> {
	// Try to use pdf.js if available in global scope
	const pdfjsLib = (globalThis as unknown as Record<string, unknown>).pdfjsLib;
	if (pdfjsLib) {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const pdf = await (pdfjsLib as { getDocument: (data: ArrayBuffer) => { promise: Promise<{ getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>; numPages: number }> } }).getDocument(arrayBuffer).promise;
			let text = '';
			for (let i = 1; i <= pdf.numPages; i++) {
				const page = await pdf.getPage(i);
				const content = await page.getTextContent();
				text += content.items.map((item: { str: string }) => item.str).join(' ') + '\n';
			}
			return text;
		} catch {
			// Fallback
		}
	}

	// Simple fallback: read as text (may get garbled but sometimes works for simple PDFs)
	const text = await file.text();
	// Try to extract text between stream/endstream
	const matches = text.match(/stream\s*\r?\n?([\s\S]*?)\s*endstream/g);
	if (matches) {
		return matches.map(m => m.replace(/stream\s*\r?\n?/, '').replace(/\s*endstream/, '')).join(' ').slice(0, 10000);
	}
	return text.slice(0, 10000);
}

function isCodeFile(filename: string): boolean {
	const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.r', '.sql', '.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml', '.yml', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.vue', '.svelte'];
	return codeExts.some(ext => filename.toLowerCase().endsWith(ext));
}

function getLanguageFromFilename(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() || '';
	const langMap: Record<string, string> = {
		js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
		py: 'python', java: 'java', cpp: 'cpp', c: 'c',
		go: 'go', rs: 'rust', php: 'php', rb: 'ruby',
		swift: 'swift', kt: 'kotlin', scala: 'scala', r: 'r',
		sql: 'sql', html: 'html', css: 'css', scss: 'scss',
		less: 'less', json: 'json', xml: 'xml', yaml: 'yaml',
		yml: 'yaml', sh: 'bash', bash: 'bash', zsh: 'zsh',
		ps1: 'powershell', bat: 'batch', cmd: 'batch',
		vue: 'vue', svelte: 'svelte'
	};
	return langMap[ext] || ext;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
