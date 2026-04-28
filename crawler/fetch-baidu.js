#!/usr/bin/env node

// 使用百度搜索获取真实科技资讯

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dateStr = new Date().toISOString().split('T')[0];

// 搜索关键词
const SEARCH_KEYWORDS = [
  { kw: 'OpenAI ChatGPT 最新', category: 'AI' },
  { kw: 'Claude AI 发布', category: 'AI' },
  { kw: '字节跳动 豆包 AI', category: 'AI' },
  { kw: '苹果 iPhone 新品', category: '产品' },
  { kw: '小米 华为 手机 发布', category: '硬件' },
  { kw: '英伟达 芯片 GPU', category: '硬件' },
  { kw: 'AI 创业公司 融资', category: '创业' },
  { kw: '科技 产品 更新', category: '产品' },
];

// 百度搜索获取结果
async function searchBaidu(keyword) {
  try {
    const encoded = encodeURIComponent(keyword);
    const url = `https://www.baidu.com/s?wd=${encoded}`;
    
    const result = execSync(`curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`, {
      encoding: 'utf8',
      timeout: 15000
    });
    
    // 提取链接和标题
    const links = [];
    const regex = /<a[^>]*href="(http[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    
    while ((match = regex.exec(result)) !== null) {
      const url = match[1];
      const title = match[2].trim();
      
      // 过滤有效链接
      if (url.includes('baidu.com') || url.includes('javascript')) continue;
      if (title.length < 10) continue;
      
      links.push({ url, title });
      if (links.length >= 3) break;
    }
    
    return links;
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
    
    if (!result || result.length < 100) return null;
    
    // 解析
    const lines = result.split('\n');
    const data = { title: '', content: '', url: '' };
    let inContent = false;
    
    for (const line of lines) {
      if (line.startsWith('Title:')) {
        data.title = line.replace('Title:', '').trim();
      } else if (line.startsWith('URL Source:')) {
        data.url = line.replace('URL Source:', '').trim();
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
  
  const baseDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
  const articlesDir = path.join(baseDir, 'articles');
  fs.mkdirSync(articlesDir, { recursive: true });
  
  const articles = [];
  let index = 0;
  
  for (const item of SEARCH_KEYWORDS) {
    console.log(`🔍 ${item.kw}`);
    
    const links = await searchBaidu(item.kw);
    console.log(`  找到 ${links.length} 个链接`);
    
    for (const link of links) {
      console.log(`  📄 ${link.title.substring(0, 40)}...`);
      
      const content = await fetchContent(link.url);
      
      if (content && content.title && content.content.length > 200) {
        // 检查是否已存在相似标题
        const isDuplicate = articles.some(a => 
          a.title.toLowerCase().includes(content.title.toLowerCase().substring(0, 20)) ||
          content.title.toLowerCase().includes(a.title.toLowerCase().substring(0, 20))
        );
        
        if (isDuplicate) {
          console.log(`    跳过重复`);
          continue;
        }
        
        index++;
        const id = `${dateStr.replace(/-/g, '')}-${String(index).padStart(3, '0')}`;
        
        const summary = content.content.substring(0, 200).replace(/\n/g, ' ') + '...';
        
        const article = {
          id,
          title: content.title,
          summary,
          category: item.category,
          publishedAt: dateStr,
          sourceCount: 1,
          contentFile: `articles/article-${id}.md`,
        };
        
        // 保存内容
        const md = `# ${content.title}\n\n` +
          `**分类**: ${item.category}  \n` +
          `**发布时间**: ${dateStr}  \n` +
          `**来源数量**: 1  \n\n` +
          `## 摘要\n\n${summary}\n\n` +
          `## 正文\n\n${content.content}\n\n` +
          `## 相关链接\n\n` +
          `- [百度来源 - ${link.title}](${link.url})\n`;
        
        fs.writeFileSync(path.join(articlesDir, `article-${id}.md`), md);
        articles.push(article);
        
        console.log(`    ✓ 已保存 (${item.category})`);
      } else {
        console.log(`    ✗ 内容无效`);
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('');
  }
  
  // 保存索引
  fs.writeFileSync(path.join(baseDir, 'articles.json'), JSON.stringify(articles, null, 2));
  
  console.log(`✅ 完成！共抓取 ${articles.length} 篇真实文章`);
  
  // 分类统计
  const stats = {};
  articles.forEach(a => {
    stats[a.category] = (stats[a.category] || 0) + 1;
  });
  
  console.log('分类统计:');
  Object.entries(stats).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}篇`);
  });
}

main().catch(console.error);
