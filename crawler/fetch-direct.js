#!/usr/bin/env node

// 直接抓取科技媒体网站

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dateStr = new Date().toISOString().split('T')[0];

// 直接抓取的URL列表
const TARGET_URLS = [
  // 36Kr热门
  { url: 'https://36kr.com/hot-list', name: '36Kr热门', category: '创业' },
  { url: 'https://36kr.com/tech', name: '36Kr科技', category: 'AI' },
  // 虎嗅
  { url: 'https://www.huxiu.com/article', name: '虎嗅最新', category: '创业' },
  // 极客公园
  { url: 'https://www.geekpark.net/', name: '极客公园', category: '产品' },
  // TechCrunch
  { url: 'https://techcrunch.com/latest/', name: 'TechCrunch', category: 'AI' },
  // The Verge
  { url: 'https://www.theverge.com/tech', name: 'The Verge', category: '硬件' },
];

// 使用jina-reader抓取
async function fetchWithJina(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    console.log(`  抓取: ${url.substring(0, 50)}...`);
    
    const result = execSync(`curl -s --max-time 20 "${jinaUrl}"`, { 
      encoding: 'utf8', 
      timeout: 25000 
    });
    
    if (!result || result.length < 200) {
      console.log('    内容太短');
      return null;
    }
    
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
    
    if (data.title && data.content.length > 300) {
      console.log(`    ✓ 成功: ${data.title.substring(0, 40)}...`);
      return data;
    } else {
      console.log(`    ✗ 内容不完整`);
      return null;
    }
  } catch (error) {
    console.error(`    错误: ${error.message}`);
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
  
  for (let i = 0; i < TARGET_URLS.length; i++) {
    const target = TARGET_URLS[i];
    console.log(`\n[${i + 1}/${TARGET_URLS.length}] ${target.name}`);
    
    const content = await fetchWithJina(target.url);
    
    if (content) {
      const id = `${dateStr.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
      const summary = content.content.substring(0, 200).replace(/\n/g, ' ') + '...';
      
      const article = {
        id,
        title: content.title,
        summary,
        category: target.category,
        publishedAt: dateStr,
        sourceCount: 1,
        contentFile: `articles/article-${id}.md`,
      };
      
      // 保存内容
      const md = `# ${content.title}\n\n` +
        `**分类**: ${target.category}  \n` +
        `**发布时间**: ${dateStr}  \n` +
        `**来源数量**: 1  \n\n` +
        `## 摘要\n\n${summary}\n\n` +
        `## 正文\n\n${content.content}\n\n` +
        `## 相关链接\n\n` +
        `- [${target.name}](${target.url})\n`;
      
      fs.writeFileSync(path.join(articlesDir, `article-${id}.md`), md);
      articles.push(article);
    }
    
    // 延迟
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // 保存索引
  fs.writeFileSync(path.join(baseDir, 'articles.json'), JSON.stringify(articles, null, 2));
  
  console.log(`\n✅ 完成！共抓取 ${articles.length} 篇真实文章`);
  
  // 分类统计
  const stats = {};
  articles.forEach(a => {
    stats[a.category] = (stats[a.category] || 0) + 1;
  });
  
  console.log('\n分类统计:');
  Object.entries(stats).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}篇`);
  });
}

main().catch(console.error);
