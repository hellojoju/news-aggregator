#!/usr/bin/env node

// 生成示例数据，模拟今日资讯

const fs = require('fs');
const path = require('path');

const dateStr = new Date().toISOString().split('T')[0];

// 示例文章数据
const demoArticles = [
  {
    id: `${dateStr.replace(/-/g, '')}-001`,
    title: 'OpenAI发布GPT-5预览版，多模态能力大幅提升',
    summary: 'OpenAI今日发布了GPT-5的预览版本，新版本在图像理解、视频分析和代码生成方面都有显著提升。据官方介绍，GPT-5的参数规模达到10万亿级别，支持更长的上下文窗口，最高可达200万token。',
    category: 'AI',
    sources: [
      { name: '36Kr', url: 'https://36kr.com/p/123456', title: 'OpenAI发布GPT-5预览版' },
      { name: 'TechCrunch', url: 'https://techcrunch.com/2026/03/13/openai-gpt5', title: 'OpenAI GPT-5 Preview Released' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-002`,
    title: '苹果WWDC 2026定档6月，AI功能成最大看点',
    summary: '苹果公司正式宣布WWDC 2026将于6月8日至12日举行。据知情人士透露，本届大会将重点展示iOS 20中的AI功能，包括Siri的全面升级、智能相册、以及设备端大模型等。',
    category: '产品',
    sources: [
      { name: '虎嗅', url: 'https://www.huxiu.com/article/484000', title: '苹果WWDC 2026定档6月' },
      { name: 'The Verge', url: 'https://www.theverge.com/2026/03/13/apple-wwdc-2026', title: 'Apple WWDC 2026 announced' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-003`,
    title: '某AI创业公司完成10亿美元融资，估值超百亿美元',
    summary: '一家专注于企业级AI解决方案的创业公司今日宣布完成10亿美元C轮融资，由红杉资本领投。该公司成立于2024年，主打AI Agent平台，目前已服务超过500家企业客户。',
    category: '创业',
    sources: [
      { name: '36Kr', url: 'https://36kr.com/p/789012', title: 'AI创业公司完成10亿美元融资' },
      { name: '极客公园', url: 'https://www.geekpark.net/news/345678', title: 'AI Agent公司获巨额融资' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-004`,
    title: '英伟达发布新一代AI芯片，性能提升3倍',
    summary: '英伟达在GTC 2026大会上发布了新一代AI加速芯片H200，采用全新架构，在推理性能上相比H100提升3倍，能效比提升2倍。该芯片预计将于2026年Q3开始出货。',
    category: '硬件',
    sources: [
      { name: '虎嗅', url: 'https://www.huxiu.com/article/484111', title: '英伟达发布H200芯片' },
      { name: 'TechCrunch', url: 'https://techcrunch.com/2026/03/13/nvidia-h200', title: 'Nvidia announces H200 AI chip' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-005`,
    title: 'Claude 4即将发布，Anthropic称将超越GPT-5',
    summary: 'Anthropic CEO在最新采访中透露，Claude 4将于下月发布，新模型在推理能力和安全性上都有重大突破。公司表示Claude 4在多项基准测试中已经超越了GPT-5预览版。',
    category: 'AI',
    sources: [
      { name: '数字生命卡兹克', url: 'https://mp.weixin.qq.com/s/xxxxx', title: 'Claude 4即将发布' },
      { name: 'The Verge', url: 'https://www.theverge.com/2026/03/13/claude-4-anthropic', title: 'Claude 4 announcement' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-006`,
    title: '小米汽车SU8发布，定价25万起',
    summary: '小米今日正式发布第二款电动车SU8，定位中大型SUV，续航里程达800公里，支持800V高压快充。标准版售价25.99万元，Pro版29.99万元，Max版35.99万元。',
    category: '硬件',
    sources: [
      { name: '36Kr', url: 'https://36kr.com/p/345678', title: '小米SU8正式发布' },
      { name: '虎嗅', url: 'https://www.huxiu.com/article/484222', title: '小米汽车SU8定价25万起' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-007`,
    title: '字节跳动发布豆包大模型Pro版，API价格大降',
    summary: '字节跳动今日发布豆包大模型Pro版本，在中文理解和生成能力上达到业界领先水平。同时宣布API价格大幅下调，输入token价格降至0.0005元/千token，输出token降至0.002元/千token。',
    category: 'AI',
    sources: [
      { name: '极客公园', url: 'https://www.geekpark.net/news/456789', title: '豆包大模型Pro发布' },
      { name: '虎嗅', url: 'https://www.huxiu.com/article/484333', title: '字节豆包API大降价' },
    ],
  },
  {
    id: `${dateStr.replace(/-/g, '')}-008`,
    title: 'AI编程助手Cursor获5000万美元融资',
    summary: 'AI编程工具Cursor开发商Anysphere宣布完成5000万美元A轮融资。Cursor基于Claude和GPT-4，提供智能代码补全、重构建议和自然语言编程功能，目前已有超过100万开发者使用。',
    category: '创业',
    sources: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/2026/03/13/cursor-funding', title: 'Cursor raises $50M' },
      { name: '36Kr', url: 'https://36kr.com/p/567890', title: 'Cursor完成5000万美元融资' },
    ],
  },
];

// 创建目录
const baseDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr);
const articlesDir = path.join(baseDir, 'articles');

if (!fs.existsSync(articlesDir)) {
  fs.mkdirSync(articlesDir, { recursive: true });
}

// 生成文章详情和索引
const articles = [];

for (const article of demoArticles) {
  // 生成详细内容
  const contentMd = `# ${article.title}\n\n` +
    `**分类**: ${article.category}  \n` +
    `**发布时间**: ${dateStr}  \n` +
    `**来源数量**: ${article.sources.length}  \n\n` +
    `## 摘要\n\n${article.summary}\n\n` +
    `## 正文\n\n${article.summary}\n\n` +
    `这是今日科技资讯的详细内容。文章整合了来自多个来源的信息，为你提供全面的视角。\n\n` +
    `### 关键要点\n\n` +
    `- 该事件对行业有重要影响\n` +
    `- 多家媒体进行了报道\n` +
    `- 值得关注后续发展\n\n` +
    `### 背景信息\n\n` +
    `随着AI技术的快速发展，相关新闻层出不穷。本文整合了多个权威来源的报道，帮助你快速了解今日重要资讯。\n\n` +
    `## 相关链接\n\n` +
    article.sources.map(s => `- [${s.name} - ${s.title}](${s.url})`).join('\n') + '\n';
  
  // 保存文章
  fs.writeFileSync(path.join(articlesDir, `article-${article.id}.md`), contentMd);
  
  // 添加到索引
  articles.push({
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    publishedAt: dateStr,
    sourceCount: article.sources.length,
    contentFile: `articles/article-${article.id}.md`,
  });
  
  console.log(`✓ ${article.title.substring(0, 40)}...`);
}

// 保存索引
fs.writeFileSync(path.join(baseDir, 'articles.json'), JSON.stringify(articles, null, 2));

// 统计
const categoryCount = articles.reduce((acc, a) => {
  acc[a.category] = (acc[a.category] || 0) + 1;
  return acc;
}, {});

console.log('\n✅ 示例数据生成完成！');
console.log(`   总计: ${articles.length} 篇文章`);
console.log('   分类统计:');
for (const [cat, count] of Object.entries(categoryCount)) {
  console.log(`     - ${cat}: ${count}篇`);
}
console.log(`\n   数据保存: ${baseDir}`);
