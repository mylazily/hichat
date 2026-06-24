// Tool API layer - Weather, Time, News, Web Search
// All free APIs, no keys required

// ============ WEATHER (Open-Meteo) ============
interface WeatherData {
	temperature: number;
	apparentTemperature: number;
	humidity: number;
	windSpeed: number;
	weatherCode: number;
	weatherDescription: string;
	weatherIcon: string;
	isDay: boolean;
}

function getWeatherDescription(code: number): string {
	const descriptions: Record<number, string> = {
		0: '晴朗', 1: '大部晴朗', 2: '局部多云', 3: '多云',
		45: '雾', 48: '冻雾',
		51: '小毛毛雨', 53: '中毛毛雨', 55: '大毛毛雨',
		56: '冻毛毛雨', 57: '冻毛毛雨',
		61: '小雨', 63: '中雨', 65: '大雨',
		66: '冻雨', 67: '大冻雨',
		71: '小雪', 73: '中雪', 75: '大雪',
		77: '雪粒',
		80: '小阵雨', 81: '中阵雨', 82: '大阵雨',
		85: '小阵雪', 86: '大阵雪',
		95: '雷暴', 96: '雷暴伴小冰雹', 99: '雷暴伴大冰雹'
	};
	return descriptions[code] || '未知天气';
}

function getWeatherEmoji(code: number, isDay: boolean): string {
	if (code === 0 || code === 1) return isDay ? '☀️' : '🌙';
	if (code === 2 || code === 3) return '⛅';
	if (code >= 45 && code <= 48) return '🌫️';
	if (code >= 51 && code <= 67) return '🌧️';
	if (code >= 71 && code <= 77) return '🌨️';
	if (code >= 80 && code <= 82) return '🌦️';
	if (code >= 85 && code <= 86) return '🌨️';
	if (code >= 95) return '⛈️';
	return '🌡️';
}

export async function getWeather(city?: string, lat?: number, lon?: number): Promise<string> {
	try {
		// If city provided, geocode it first
		let latitude = lat || 39.9042;
		let longitude = lon || 116.4074;
		let locationName = city || '北京';

		if (city && !lat && !lon) {
			const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`);
			const geoData = await geoRes.json();
			if (geoData.results && geoData.results.length > 0) {
				latitude = geoData.results[0].latitude;
				longitude = geoData.results[0].longitude;
				locationName = geoData.results[0].name;
				if (geoData.results[0].admin1) {
					locationName += `, ${geoData.results[0].admin1}`;
				}
			}
		}

		const res = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
			`&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
			`&timezone=auto&forecast_days=1`
		);
		const data = await res.json();
		const current = data.current;

		if (!current) return '无法获取天气数据';

		const weather: WeatherData = {
			temperature: Math.round(current.temperature_2m),
			apparentTemperature: Math.round(current.apparent_temperature),
			humidity: current.relative_humidity_2m,
			windSpeed: Math.round(current.wind_speed_10m),
			weatherCode: current.weather_code,
			weatherDescription: getWeatherDescription(current.weather_code),
			weatherIcon: getWeatherEmoji(current.weather_code, current.is_day),
			isDay: current.is_day
		};

		return JSON.stringify({
			location: locationName,
			...weather
		});
	} catch (err) {
		return `获取天气失败: ${err instanceof Error ? err.message : '未知错误'}`;
	}
}

// ============ TIME ============
export function getCurrentTime(timezone?: string): string {
	const now = new Date();
	if (timezone) {
		try {
			const formatter = new Intl.DateTimeFormat('zh-CN', {
				timeZone: timezone,
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});
			return JSON.stringify({
				timezone,
				formatted: formatter.format(now),
				timestamp: now.toISOString()
			});
		} catch {
			return `不支持时区: ${timezone}`;
		}
	}

	return JSON.stringify({
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		formatted: now.toLocaleString('zh-CN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}),
		timestamp: now.toISOString()
	});
}

// ============ NEWS (RSS via public CORS proxy) ============
interface NewsItem {
	title: string;
	link: string;
	description: string;
	source: string;
	pubDate: string;
}

const RSS_FEEDS = [
	{ name: 'Hacker News', url: 'https://hnrss.org/frontpage', lang: 'en' },
	{ name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', lang: 'en' },
	{ name: 'TechCrunch', url: 'https://techcrunch.com/feed/', lang: 'en' }
];

export async function getNews(category?: string): Promise<string> {
	try {
		const feed = RSS_FEEDS[0]; // Default to Hacker News
		const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`;

		const res = await fetch(proxyUrl);
		const data = await res.json();

		if (data.status !== 'ok' || !data.items) {
			return '无法获取新闻数据';
		}

		const news: NewsItem[] = data.items.slice(0, 8).map((item: { title: string; link: string; description: string; pubDate: string }) => ({
			title: item.title,
			link: item.link,
			description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
			source: feed.name,
			pubDate: item.pubDate
		}));

		return JSON.stringify({ source: feed.name, count: news.length, news });
	} catch (err) {
		return `获取新闻失败: ${err instanceof Error ? err.message : '未知错误'}`;
	}
}

// ============ WEB SEARCH (DuckDuckGo Instant Answer) ============
export async function webSearch(query: string): Promise<string> {
	try {
		// Use DuckDuckGo instant answer API
		const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
		const data = await res.json();

		const result: Record<string, string> = {};

		if (data.Abstract) {
			result.summary = data.Abstract;
			result.source = data.AbstractSource || '';
			result.url = data.AbstractURL || '';
		}

		if (data.Answer) {
			result.answer = data.Answer;
		}

		if (data.Definition) {
			result.definition = data.Definition;
			result.definitionSource = data.DefinitionSource || '';
		}

		if (data.RelatedTopics && data.RelatedTopics.length > 0) {
			result.related = data.RelatedTopics
				.filter((t: { Text?: string }) => t.Text)
				.slice(0, 5)
				.map((t: { Text?: string; FirstURL?: string }) => ({
					text: t.Text,
					url: t.FirstURL || ''
				}));
		}

		if (Object.keys(result).length === 0) {
			return JSON.stringify({ status: 'no_result', message: '未找到相关信息' });
		}

		return JSON.stringify(result);
	} catch (err) {
		return `搜索失败: ${err instanceof Error ? err.message : '未知错误'}`;
	}
}

// ============ TOOL DEFINITIONS FOR AI ============
export const TOOL_DEFINITIONS = `
你可以使用以下工具来帮助用户。当用户的问题需要这些工具时，在回复中包含对应的工具调用标记：

## 工具列表

### 1. 天气查询 [TOOL_WEATHER:城市名]
当用户问天气、气温、下雨等问题时使用。
示例：用户问"北京天气怎么样" → 回复中包含 [TOOL_WEATHER:北京]
支持中文城市名，也支持英文城市名。

### 2. 时间查询 [TOOL_TIME:时区]
当用户问现在几点、今天几号、某地时间等问题时使用。
示例：用户问"现在几点了" → 回复中包含 [TOOL_TIME:auto]
示例：用户问"纽约现在几点" → 回复中包含 [TOOL_TIME:America/New_York]
常用时区：Asia/Shanghai(北京), Asia/Tokyo(东京), America/New_York(纽约), Europe/London(伦敦), Europe/Paris(巴黎), America/Los_Angeles(洛杉矶)
如果用户没有指定时区，使用 auto 表示用户本地时间。

### 3. 新闻查询 [TOOL_NEWS:类别]
当用户问最新新闻、热点、头条等问题时使用。
示例：用户问"有什么新闻" → 回复中包含 [TOOL_NEWS:general]
示例：用户问"科技新闻" → 回复中包含 [TOOL_NEWS:tech]

### 4. 网页搜索 [TOOL_SEARCH:搜索词]
当用户的问题需要搜索互联网信息时使用。
示例：用户问"Python最新版本是什么" → 回复中包含 [TOOL_SEARCH:Python latest version]

重要规则：
- 每次回复最多使用2个工具
- 工具标记应该放在回复的开头，然后再给出你的回答
- 工具标记格式必须精确匹配 [TOOL_XXX:参数]
- 只有在用户明确需要时才使用工具，普通对话不需要
`;
