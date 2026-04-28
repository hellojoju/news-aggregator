const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 使用 jina.ai/reader 抓取网页
async function fetchWithJina(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const result = execSync(
      `curl -sL --max-time 20 -A "Mozilla/5.0" "${jinaUrl}"`,
      { encoding: "utf8", timeout: 25000 }
    );
    return parseJinaResponse(result);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// 解析 jina.ai 返回的内容
function parseJinaResponse(content) {
  const lines = content.split('\n');
  const result = {
    title: '',
    url: '',
    publishedTime: '',
    description: '',
    content: '',
  };
  
  let inContent = false;
  
  for (const line of lines) {
    if (line.startsWith('Title:')) {
      result.title = line.replace('Title:', '').trim();
    } else if (line.startsWith('URL Source:')) {
      result.url = line.replace('URL Source:', '').trim();
    } else if (line.startsWith('Published Time:')) {
      result.publishedTime = line.replace('Published Time:', '').trim();
    } else if (line.startsWith('Description:')) {
      result.description = line.replace('Description:', '').trim();
    } else if (line === '---') {
      inContent = true;
    } else if (inContent) {
      result.content += line + '\n';
    }
  }
  
  result.content = result.content.trim();
  return result;
}

// 搜索并获取文章（使用 Tavily 或百度搜索）
async function searchArticles(query, maxResults = 5) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  
  if (tavilyKey) {
    return await searchWithTavily(query, maxResults);
  } else {
    return await searchWithBaidu(query, maxResults);
  }
}

// 使用 Tavily 搜索
async function searchWithTavily(query, maxResults) {
  try {
    const payload = JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      time_range: "day",
    });
    const response = execSync(
      `curl -s --max-time 20 -X POST https://api.tavily.com/search \
        -H "Content-Type: application/json" \
        -d '${payload}'`,
      { encoding: "utf8", timeout: 30000 }
    );
    
    const data = JSON.parse(response);
    return data.results || [];
  } catch (error) {
    console.error('Tavily search error:', error.message);
    return [];
  }
}

// 使用百度搜索（备用）
async function searchWithBaidu(query, maxResults) {
  // 简化版：返回空，实际实现需要解析百度页面
  console.log('Baidu search not implemented, using fallback');
  return [];
}

// 获取RSS内容
async function fetchRSS(rssUrl) {
  try {
    const response = execSync(
      `curl -sL --max-time 20 -A "Mozilla/5.0" "${rssUrl}"`,
      { encoding: "utf8", timeout: 30000 }
    );
    return parseRSS(response);
  } catch (error) {
    console.error(`Error fetching RSS ${rssUrl}:`, error.message);
    return [];
  }
}

// 简单RSS解析
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const entryRegex = /<entry>(.*?)<\/entry>/gs;
  const titleRegex = /<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const hrefLinkRegex = /<link[^>]*href="([^"]+)"/;
  const descRegex = /<description>(.*?)<\/description>/;
  const summaryRegex = /<summary[^>]*>(.*?)<\/summary>/s;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const updatedRegex = /<updated>(.*?)<\/updated>/;
  const clean = (text) => (text || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
  
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const title = (titleRegex.exec(itemContent) || [])[1] || "";
    const link = (linkRegex.exec(itemContent) || [])[1] || "";
    const description = (descRegex.exec(itemContent) || [])[1] || "";
    const pubDate = (pubDateRegex.exec(itemContent) || [])[1] || "";
    
    if (title && link && /^https?:\/\//i.test(clean(link))) {
      items.push({
        title: clean(title),
        url: clean(link),
        description: clean(description),
        publishedTime: pubDate,
      });
    }
  }

  // 支持 Atom feed（例如部分国际科技媒体）
  while ((match = entryRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const title = (titleRegex.exec(itemContent) || [])[1] || "";
    const link = (hrefLinkRegex.exec(itemContent) || [])[1] || "";
    const description =
      (summaryRegex.exec(itemContent) || [])[1] ||
      (descRegex.exec(itemContent) || [])[1] ||
      "";
    const pubDate = (updatedRegex.exec(itemContent) || [])[1] || "";
    if (title && link && /^https?:\/\//i.test(clean(link))) {
      items.push({
        title: clean(title),
        url: clean(link),
        description: clean(description),
        publishedTime: pubDate,
      });
    }
  }
  
  return items.slice(0, 10); // 只取前10条
}

// 保存原始数据
function saveRawData(source, data, dateStr) {
  const dir = path.join('/Users/jieson/Documents/news-aggregator', dateStr, 'cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `${source}-${Date.now()}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

module.exports = {
  fetchWithJina,
  searchArticles,
  fetchRSS,
  saveRawData,
};
