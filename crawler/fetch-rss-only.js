#!/usr/bin/env node

// 简化版：只抓取RSS源，快速测试

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// RSS源配置
const RSS_SOURCES = [
  { name: '36Kr', rss: 'https://36kr.com/feed' },
  { name: '虎嗅', rss: 'https://www.huxiu.com/rss/0.xml' },
  { name: '极客公园', rss: 'https://www.geekpark.net/rss' },
  { name: 'TechCrunch', rss: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', rss: 'https://www.theverge.com/rss/index.xml' },
];

// 分类关键词
const CATEGORIES = {
  AI: ['AI', '人工智能', 'ChatGPT', 'Claude', '大模型', 'LLM', 'OpenAI', 'Anthropic', '机器学习', '深度学习', '神经网络', 'GPT', 'Agent', '智能体'],
  产品: ['产品', '设计', '用户体验', 'UX', 'UI', 'Apple', 'Google', '微软', '发布', '新品', '评测', '体验'],
  创业: ['创业', '融资', '投资', ' startup', 'VC', 'PE', 'IPO', '上市', '独角兽', '创始人', 'CEO'],
  硬件: ['芯片', '半导体', 'GPU', 'CPU', 'iPhone', '手机', '电脑', '笔记本', '硬件', '设备', '特斯拉', '汽车', '机器人'],
};

// 获取今天的日期字符串
function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// 抓取RSS
async function fetchRSS(rssUrl) {
  try {
    console.log(`  抓取: ${rssUrl}`);
    const response = execSync(`curl -s --max-time 10 "${rssUrl}"`, { 
      encoding: 'utf8', 
      timeout: 15000 
    });
    return parseRSS(response);
  } catch (error) {
    console.error(`  错误: ${error.message}`);
    return [];
  }
}

// 解析RSS
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const titleRegex = /<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const descRegex = /<description>(.*?)<\/description>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const title = (titleRegex.exec(itemContent) || [])[1] || '';
    const link = (linkRegex.exec(itemContent) || [])[1] || '';
    const description = (descRegex.exec(itemContent) || [])[1] || '';
    const pubDate = (pubDateRegex.exec(itemContent) || [])[1] || '';
    
    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, ''),
        url: link.replace(/<[^>]+>/g, ''),
        description: description.replace(/<[^>]+>/g, '').substring(0, 200),
        publishedTime: pubDate,
      });
    }
  }
  
  return items.slice(0, 5);
}

// 抓取文章内容
async function fetchArticleContent(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const result = execSync(`curl -s --max-time 10 "${jinaUrl}"`, { 
      encoding: 'utf8', 
      timeout: 15000 
    });
    return parseJinaResponse(result);
  } catch (error) {
    console.error(`  抓取内容失败: ${error.message}`);
    return null;
  }
}

// 解析jina响应
function parseJinaResponse(content) {
  const lines = content.split('\n');
  const result = { title: '', url: '', publishedTime: '', description: '', content: '' };
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

// 智能分类
function categorizeArticle(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  const scores = {};
  
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    scores[category] = keywords.reduce((score, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = text.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }
  
  let bestCategory = '其他';
  let maxScore = 0;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  
  return maxScore > 0 ? bestCategory : '其他';
}

// 生成摘要
function generateSummary(content, maxLength = 200) {
  const cleanContent = content
    .replace(/[#*`\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  
  return cleanContent.substring(0, maxLength) + '...';
}

// 主函数
async function main() {
  const dateStr = getTodayString();
  console.log(`\n🚀 开始抓取 ${dateStr} 的RSS资讯...\n`);
  
  // 创建目录
  const baseDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
  const articlesDir = path.join(baseDir, 'articles');
  
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }
  
  const articles = [];
  let articleIndex = 0;
  
  // 抓取每个RSS源
  for (const source of RSS_SOURCES) {
    console.log(`📰 ${source.name}`);
    
    const items = await fetchRSS(source.rss);
    console.log(`  获取 ${items.length} 条`);
    
    for (const item of items) {
      // 抓取完整内容
      const content = await fetchArticleContent(item.url);
      
      if (content && content.title) {
        articleIndex++;
        const id = `${dateStr.replace(/-/g, '')}-${String(articleIndex).padStart(3, '0')}`;
        const category = categorizeArticle(content.title, content.content);
        
        const article = {
          id,
          title: content.title,
          summary: generateSummary(content.content),
          category,
          publishedAt: dateStr,
          sourceCount: 1,
          contentFile: `articles/article-${id}.md`,
        };
        
        // 保存文章详情
        const contentMd = `# ${content.title}\n\n` +
          `**分类**: ${category}  \n` +
          `**发布时间**: ${dateStr}  \n` +
          `**来源数量**: 1  \n\n` +
          `## 摘要\n\n${article.summary}\n\n` +
          `## 正文\n\n${content.content}\n\n` +
          `## 相关链接\n\n` +
          `- [${source.name} - ${item.title}](${item.url})\n`;
        
        fs.writeFileSync(path.join(articlesDir, `article-${id}.md`), contentMd);
        
        articles.push(article);
        console.log(`  ✓ ${content.title.substring(0, 50)}...`);
      }
      
      // 延迟
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('');
  }
  
  // 保存索引
  fs.writeFileSync(path.join(baseDir, 'articles.json'), JSON.stringify(articles, null, 2));
  
  // 统计
  const categoryCount = articles.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});
  
  console.log('✅ 完成！');
  console.log(`   总计: ${articles.length} 篇文章`);
  console.log('   分类:');
  for (const [cat, count] of Object.entries(categoryCount)) {
    console.log(`     - ${cat}: ${count}篇`);
  }
  console.log(`\n   数据保存: ${baseDir}`);
}

main().catch(console.error);
