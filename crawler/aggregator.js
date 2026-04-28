const fs = require('fs');
const path = require('path');
const { CATEGORIES } = require('./config');

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
  
  // 找出最高分
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

// 生成文章摘要（前200字）
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

// 去重：基于标题相似度
function deduplicateArticles(articles) {
  const unique = [];
  
  for (const article of articles) {
    let isDuplicate = false;
    
    for (const existing of unique) {
      const similarity = calculateSimilarity(article.title, existing.title);
      if (similarity > 0.7) { // 70%相似度认为是重复
        // 合并来源
        existing.sources = [...existing.sources, ...article.sources];
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      unique.push(article);
    }
  }
  
  return unique;
}

// 计算字符串相似度（简化版Jaccard）
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // 提取2-gram
  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  
  const intersection = new Set([...b1].filter(x => b2.has(x)));
  const union = new Set([...b1, ...b2]);
  
  return intersection.size / union.size;
}

// 生成文章ID
function generateArticleId(dateStr, index) {
  return `${dateStr.replace(/-/g, '')}-${String(index + 1).padStart(3, '0')}`;
}

// 保存文章详情
function saveArticleContent(article, dateStr) {
  const dir = path.join('/Users/jieson/Documents/news-aggregator', dateStr, 'articles');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `article-${article.id}.md`;
  const filepath = path.join(dir, filename);
  
  // 生成Markdown内容
  let content = `# ${article.title}\n\n`;
  content += `**分类**: ${article.category}  \n`;
  content += `**发布时间**: ${article.publishedAt}  \n`;
  content += `**来源数量**: ${article.sources.length}  \n\n`;
  if (article.originalTitle && article.originalTitle !== article.title) {
    content += `**原文标题**: ${article.originalTitle}  \n`;
  }
  if (article.translatedBy) {
    content += `**翻译引擎**: ${article.translatedBy}  \n`;
  }
  content += `\n`;
  
  content += `## 摘要\n\n${article.summary}\n\n`;
  content += `## 正文\n\n${article.content}\n\n`;
  
  content += `## 相关链接\n\n`;
  for (const source of article.sources) {
    content += `- [${source.name} - ${source.title}](${source.url})\n`;
  }
  
  fs.writeFileSync(filepath, content);
  return filename;
}

// 保存文章索引
function saveArticleIndex(articles, dateStr) {
  const dir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const indexPath = path.join(dir, 'articles.json');
  
  // 简化后的索引数据
  const index = articles.map(article => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    publishedAt: article.publishedAt,
    sourceCount: article.sources.length,
    contentFile: `articles/article-${article.id}.md`,
  }));
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

module.exports = {
  categorizeArticle,
  generateSummary,
  deduplicateArticles,
  generateArticleId,
  saveArticleContent,
  saveArticleIndex,
};
