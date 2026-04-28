const fs = require('fs');
const path = require('path');

let envLoaded = false;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnvIfNeeded() {
  if (envLoaded) return;
  envLoaded = true;

  const candidates = [
    '/Users/jieson/.openclaw/.env',
    '/Users/jieson/Documents/news-aggregator/.env',
    path.join(process.cwd(), '.env'),
  ];

  for (const file of candidates) {
    loadEnvFile(file);
  }
}

function getProvider() {
  loadEnvIfNeeded();

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      extraHeaders: {
        'HTTP-Referer': 'https://localhost',
        'X-Title': 'news-aggregator',
      },
    };
  }

  return null;
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const body = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(body);
      } catch (_err2) {
        return null;
      }
    }
    return null;
  }
}

async function callChat(provider, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...(provider.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text || '');
}

async function translateByPublicAPI(text) {
  const raw = (text || '').trim();
  if (!raw) return '';

  const chunks = [];
  const chunkSize = 500;
  for (let i = 0; i < raw.length; i += chunkSize) {
    chunks.push(raw.slice(i, i + chunkSize));
  }

  const out = [];
  for (const chunk of chunks.slice(0, 4)) {
    try {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' +
        encodeURIComponent(chunk);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      if (!response.ok) {
        throw new Error(`translate http ${response.status}`);
      }
      const data = await response.json();
      const translated = (data?.[0] || []).map((item) => item?.[0] || '').join('');
      out.push(translated || chunk);
    } catch (_err) {
      out.push(chunk);
    }
  }

  return out.join('');
}

async function buildFallback(article) {
  const originalTitle = article.title || '未命名资讯';
  const originalBody = (article.content || '').trim();
  const originalSummary = generateShortSummary(originalBody, 300);

  const titleZh = hasChinese(originalTitle) ? originalTitle : `【英文资讯】${originalTitle}`;
  const summaryZh = hasChinese(originalSummary)
    ? originalSummary
    : `原文摘要（待大模型翻译）：${originalSummary}`;

  return {
    translatedTitle: titleZh,
    translatedSummary: summaryZh,
    translatedContent: [
      '## 新闻详译（待大模型）',
      '',
      '当前未检测到可用的大模型密钥，暂无法生成高质量中文详译。你可以配置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY 后重新点“刷新抓取”。',
      '',
      '## 原文内容',
      '',
      originalBody || '暂无正文抓取内容。',
      '',
      '## 翻译说明',
      '',
      '已完成抓取和详情页结构化，翻译链路已接好；配置大模型密钥后会自动输出完整中文译文。',
    ].join('\n'),
    translatedBy: 'fallback',
  };
}

function generateShortSummary(content, maxLength = 200) {
  const clean = (content || '')
    .replace(/[#*`\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength) + '...';
}

async function translateArticleWithLLM(article) {
  const provider = getProvider();
  if (!provider) {
    return await buildFallback(article);
  }

  const sourceUrl = article?.sources?.[0]?.url || '';
  const sourceName = article?.sources?.[0]?.name || '未知来源';
  const body = (article.content || '').slice(0, 8000);

  const messages = [
    {
      role: 'system',
      content:
        '你是科技新闻编译助手。请把输入新闻翻译并整理成高质量中文。必须仅返回 JSON，不要额外解释。',
    },
    {
      role: 'user',
      content: [
        '请按以下字段返回 JSON：',
        '{"title_zh":"","summary_zh":"","content_zh_md":""}',
        '',
        '要求：',
        '1) title_zh：简洁中文标题。',
        '2) summary_zh：120-180字中文摘要。',
        '3) content_zh_md：中文详细内容（Markdown），包括：',
        '   - 事件背景',
        '   - 核心信息与细节',
        '   - 影响分析',
        '   - 关键词解读（如有）',
        '   - 结论',
        '4) 不要编造信息，信息不足时明确说明。',
        '',
        `来源：${sourceName}`,
        `原文链接：${sourceUrl}`,
        `原文标题：${article.title || ''}`,
        '原文内容：',
        body,
      ].join('\n'),
    },
  ];

  try {
    const content = await callChat(provider, messages);
    const parsed = extractJson(content);
    if (!parsed) {
      throw new Error('LLM response is not valid JSON');
    }

    const translatedTitle = (parsed.title_zh || '').trim();
    const translatedSummary = (parsed.summary_zh || '').trim();
    const translatedContent = (parsed.content_zh_md || '').trim();

    if (!translatedTitle || !translatedSummary || !translatedContent) {
      throw new Error('Missing required translation fields');
    }

    return {
      translatedTitle,
      translatedSummary,
      translatedContent,
      translatedBy: provider.name,
    };
  } catch (error) {
    console.error('LLM translate error:', error.message);
    return await buildFallback(article);
  }
}

function getLLMProviderName() {
  const p = getProvider();
  return p ? `${p.name}:${p.model}` : 'fallback';
}

module.exports = {
  translateArticleWithLLM,
  getLLMProviderName,
};
