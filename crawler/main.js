#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SOURCES } = require('./config');
const { fetchWithJina, searchArticles, fetchRSS, saveRawData } = require('./fetcher');
const { categorizeArticle, generateSummary, deduplicateArticles, generateArticleId, saveArticleContent, saveArticleIndex } = require('./aggregator');
const { translateArticleWithLLM, getLLMProviderName } = require('./llm');

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
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  loadEnvFile('/Users/jieson/.openclaw/.env');
  loadEnvFile('/Users/jieson/Documents/news-aggregator/.env');
  loadEnvFile(path.join('/Users/jieson/Documents/news-aggregator', '.env'));
}

// 获取今天的日期字符串
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 抓取微信公众号文章
async function fetchWechatArticles() {
  console.log('📱 抓取微信公众号...');
  const articles = [];
  
  for (const source of SOURCES.wechat) {
    try {
      console.log(`  - ${source.name}`);
      
      // 搜索该公众号的最新文章
      const searchResults = await searchArticles(source.query, 3);
      
      for (const result of searchResults) {
        // 抓取文章内容
        const content = await fetchWithJina(result.url);
        if (content && content.title) {
          articles.push({
            title: content.title,
            content: content.content,
            summary: generateSummary(content.content),
            sources: [{
              name: source.name,
              url: result.url,
              title: content.title,
            }],
            publishedTime: content.publishedTime || new Date().toISOString(),
          });
        }
        
        // 延迟避免请求过快
        await sleep(1000);
      }
    } catch (error) {
      console.error(`  Error fetching ${source.name}:`, error.message);
    }
  }
  
  console.log(`  ✓ 获取 ${articles.length} 篇文章`);
  return articles;
}

// 抓取RSS源
async function fetchRSSArticles() {
  console.log('📰 抓取科技媒体RSS...');
  const articles = [];
  
  const allRSS = [...SOURCES.domestic, ...SOURCES.international];
  
  for (const source of allRSS) {
    try {
      console.log(`  - ${source.name}`);
      
      const items = await fetchRSS(source.rss);
      
      for (const item of items.slice(0, 5)) { // 每个源取前5条
        if (!item.url) {
          continue;
        }

        // 抓取完整内容
        const content = await fetchWithJina(item.url);
        if (content && content.title && content.content) {
          articles.push({
            title: content.title,
            content: content.content,
            summary: generateSummary(content.content),
            sources: [{
              name: source.name,
              url: item.url,
              title: item.title,
            }],
            publishedTime: item.publishedTime || new Date().toISOString(),
          });
        } else if (item.title) {
          // r.jina.ai 失败时，回退到 RSS 摘要，避免当天数据为空
          const fallbackContent = [item.title, item.description]
            .filter(Boolean)
            .join('\n\n');
          articles.push({
            title: item.title,
            content: fallbackContent,
            summary: generateSummary(fallbackContent),
            sources: [{
              name: source.name,
              url: item.url,
              title: item.title,
            }],
            publishedTime: item.publishedTime || new Date().toISOString(),
          });
        }
        
        await sleep(1000);
      }
    } catch (error) {
      console.error(`  Error fetching ${source.name}:`, error.message);
    }
  }
  
  console.log(`  ✓ 获取 ${articles.length} 篇文章`);
  return articles;
}

// 抓取Twitter热门
async function fetchTwitterArticles() {
  console.log('🐦 抓取Twitter科技热门...');
  const articles = [];
  
  try {
    // 使用搜索获取Twitter热门
    const searchResults = await searchArticles('AI artificial intelligence ChatGPT Claude site:twitter.com OR site:x.com', 10);
    
    for (const result of searchResults) {
      if (result.url.includes('twitter.com') || result.url.includes('x.com')) {
        const content = await fetchWithJina(result.url);
        if (content && content.title) {
          articles.push({
            title: content.title,
            content: content.content,
            summary: generateSummary(content.content),
            sources: [{
              name: 'Twitter',
              url: result.url,
              title: content.title,
            }],
            publishedTime: new Date().toISOString(),
          });
        }
        
        await sleep(1000);
      }
    }
  } catch (error) {
    console.error('  Error fetching Twitter:', error.message);
  }
  
  console.log(`  ✓ 获取 ${articles.length} 篇文章`);
  return articles;
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主函数
async function main() {
  loadRuntimeEnv();
  const dateStr = getTodayString();
  const hasTavily = Boolean(process.env.TAVILY_API_KEY);
  const llmProvider = getLLMProviderName();
  console.log(`\n🚀 开始抓取 ${dateStr} 的资讯...\n`);
  console.log(`🤖 翻译引擎: ${llmProvider}`);
  
  // 创建今日目录
  const todayDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
  if (!fs.existsSync(todayDir)) {
    fs.mkdirSync(todayDir, { recursive: true });
  }
  
  // 抓取所有来源
  let wechatArticles = [];
  let twitterArticles = [];
  if (hasTavily) {
    wechatArticles = await fetchWechatArticles();
    twitterArticles = await fetchTwitterArticles();
  } else {
    console.log("⚠️ 未设置 TAVILY_API_KEY，跳过微信公众号/Twitter 搜索抓取，仅抓取 RSS 源。");
  }
  const rssArticles = await fetchRSSArticles();
  
  // 合并所有文章
  let allArticles = [...wechatArticles, ...rssArticles, ...twitterArticles];
  console.log(`\n📊 共抓取 ${allArticles.length} 篇原始文章`);
  
  if (allArticles.length === 0) {
    console.log("\n⚠️ 未抓取到任何文章，已保留现有数据，不覆盖 articles.json");
    return;
  }

  // 保存原始数据
  saveRawData('all', allArticles, dateStr);
  
  // 去重
  console.log('\n🔍 去重处理...');
  allArticles = deduplicateArticles(allArticles);
  console.log(`  ✓ 去重后剩余 ${allArticles.length} 篇`);
  
  // 分类并生成最终文章
  console.log('\n🏷️ 分类处理...');
  const finalArticles = [];
  for (let index = 0; index < allArticles.length; index++) {
    const article = allArticles[index];
    const category = categorizeArticle(article.title, article.content);
    const id = generateArticleId(dateStr, index);

    const baseArticle = {
      ...article,
      id,
      category,
      publishedAt: dateStr,
      originalTitle: article.title,
    };

    const translated = await translateArticleWithLLM(baseArticle);

    finalArticles.push({
      ...baseArticle,
      title: translated.translatedTitle,
      summary: translated.translatedSummary,
      content: translated.translatedContent,
      translatedBy: translated.translatedBy,
    });
  }
  
  // 保存每篇文章的详情
  console.log('\n💾 保存文章...');
  for (const article of finalArticles) {
    saveArticleContent(article, dateStr);
  }
  
  // 保存索引
  saveArticleIndex(finalArticles, dateStr);
  
  // 输出统计
  const categoryCount = finalArticles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n✅ 完成！');
  console.log(`   总计: ${finalArticles.length} 篇文章`);
  console.log('   分类统计:');
  for (const [cat, count] of Object.entries(categoryCount)) {
    console.log(`     - ${cat}: ${count}篇`);
  }
  console.log(`\n   数据保存位置: ${todayDir}\n`);
}

// 运行
main().catch(console.error);
