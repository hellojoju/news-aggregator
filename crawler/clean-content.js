#!/usr/bin/env node

// 清理文章内容，去除无关内容

const fs = require('fs');
const path = require('path');

const dateStr = new Date().toISOString().split('T')[0];
const articlesDir = path.join('/Users/jieson/Documents/news-aggregator', dateStr, 'articles');

// 需要删除的无关内容模式
const REMOVE_PATTERNS = [
  /Pause\s+\d{2}:\d{2}/g,
  /Unmute/g,
  /设置/g,
  /Enter fullscreen/g,
  /#\w+/g,
  /关注\s+\w+/g,
  /频道:\s*\w+/g,
  /认证作者/g,
  /已在虎嗅发表\s*\d+\s*篇文章/g,
  /本内容由作者授权发布[^\n]*/g,
  /如对本稿件有异议[^\n]*/g,
  /正在改变与想要改变世界的人[^\n]*/g,
  /虎嗅APP/g,
  /赞赏/g,
  /支持一下/g,
  /读过本文，Ta们还读了[^\n]*/g,
  /评论\s*登录\s*后参与评论[^\n]*/g,
  /虎嗅用户社区交流公约/g,
  /最新评论[^\n]*/g,
  /这里空空如也[^\n]*/g,
  /期待你的发声/g,
  /\d+\s*\d*$/g,
  /\s{2,}/g,
];

// 清理单篇文章
function cleanArticle(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 应用所有清理规则
  REMOVE_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, ' ');
  });
  
  // 清理多余空行
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // 保存
  fs.writeFileSync(filePath, content);
  console.log(`✓ 已清理: ${path.basename(filePath)}`);
}

// 主函数
function main() {
  if (!fs.existsSync(articlesDir)) {
    console.log('文章目录不存在');
    return;
  }
  
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
  
  console.log(`清理 ${files.length} 篇文章...\n`);
  
  files.forEach(file => {
    cleanArticle(path.join(articlesDir, file));
  });
  
  console.log('\n✅ 清理完成');
}

main();
