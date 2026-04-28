#!/usr/bin/env node

// 真实数据抓取 - 使用Tavily搜索 + jina-reader

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dateStr = new Date().toISOString().split('T')[0];

// 搜索查询列表
const SEARCH_QUERIES = [
  { query: 'OpenAI ChatGPT Claude 最新发布 今天', category: 'AI' },
  { query: '字节跳动 豆包 AI大模型 最新', category: 'AI' },
  { query: 'AI人工智能 创业公司 融资', category: '创业' },
  { query: '苹果 iPhone 新品发布', category: '产品' },
  { query: '小米 华为 手机 新品', category: '硬件' },
  { query: '英伟达 芯片 GPU 最新', category: '硬件' },
];

// Tavily搜索
async function searchWithTavily(query, maxResults = 3) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  
  if (!tavilyKey) {
    console.log('  未设置TAVILY_API_KEY');
    return [];
  }
  
  try {
    const response = execSync(
      `curl -s --max-time 15 -X POST https://api.tavily.com/search \\
        -H "Authorization: Bearer ${tavilyKey}" \\
        -H "Content-Type: application/json" \\
        -d '{"query": "${query}", "max_results": ${maxResults}, "time_range": "day"}'`,
      { encoding: 'utf8', timeout: 20000 }
    );
    
    const data = JSON.parse(response);
    return data.results || [];
  } catch (error) {
    console.error(`  搜索错误: ${error.message}`);
    return [];
  }
}

// 使用jina-reader抓取内容
async function fetchContent(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const result = execSync(`curl -s --max-time 15 "${jinaUrl}"`, { 
      encoding: 'utf8', 
      timeout: 20000 
    });
    
    // 解析
    const lines = result.split('\n');
    const data = { title: '', content: '' };
    let inContent = false;
    
    for (const line of lines) {
      if (line.startsWith('Title:')) {
        data.title = line.replace('Title:', '').trim();
      } else if (line === '---') {
        inContent = true;
      } else if (inContent) {
        data.content += line + '\n';
      }
    }
    
    data.content = data.content.trim();
    return data;
  } catch (error) {
    return null;
  }
}

// 主函数
async function main() {
  console.log(`开始抓取 ${dateStr} 的真实资讯...\n`);
  
  if (!process.env.TAVILY_API_KEY) {
    console.log('错误: 未设置 TAVILY_API_KEY');
    console.log('请在 ~/.openclaw/.env 中添加');
    return;
  }
  
  const baseDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
  const articlesDir = path.join(baseDir, 'articles');
  fs.mkdirSync(articlesDir, { recursive: true });
  
  const articles = [];
  let index = 0;
  
  for (const item of SEARCH_QUERIES) {
    console.log(`搜索: ${item.query}`);
    
    const results = await searchWithTavily(item.query, 2);
    console.log(`  找到 ${results.length} 个结果`);
    
    for (const result of results) {
      if (!result.url) continue;
      
      console.log(`  抓取: ${result.title?.substring(0, 40)}...`);
      
      const content = await fetchContent(result.url);
      
      if (content && content.title && content.content.length > 100) {
        index++;
        const id = `${dateStr.replace(/-/g, '')}-${String(index).padStart(3, '0')}`;
        
        const article = {
          id,
          title: content.title,
          summary: content.content.substring(0, 200) + '...',
          category: item.category,
          publishedAt: dateStr,
          sourceCount: 1,
          contentFile: `articles/article-${id}.md`,
        };
        
        // 保存内容
        const md = `# ${content.title}\n\n**分类**: ${item.category}  \n**发布时间**: ${dateStr}  \n**来源**: 1\n\n## 正文\n\n${content.content}\n\n## 相关链接\n\n- [原文](${result.url})\n`;
        
        fs.writeFileSync(path.join(articlesDir, `article-${id}.md`), md);
        articles.push(article);
        
        console.log(`    ✓ 已保存`);
      }
      
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  // 保存索引
  fs.writeFileSync(path.join(baseDir, 'articles.json'), JSON.stringify(articles, null, 2));
  
  console.log(`\n完成！共抓取 ${articles.length} 篇文章`);
}

main().catch(console.error);
