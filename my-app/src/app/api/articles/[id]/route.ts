import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 从ID中提取日期
    const dateMatch = id.match(/^(\d{8})/);
    let targetDate: string;
    
    if (dateMatch) {
      const dateStr = dateMatch[1];
      targetDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    } else {
      // 默认今天（本地时区）
      const now = new Date();
      targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    // 读取文章详情
    const articlePath = path.join(
      '/Users/jieson/Documents/news-aggregator',
      targetDate,
      'articles',
      `article-${id}.md`
    );
    
    if (!fs.existsSync(articlePath)) {
      // 尝试查找最近的文章
      const baseDir = '/Users/jieson/Documents/news-aggregator';
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir)
          .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
          .sort()
          .reverse();
        
        for (const dir of dirs) {
          const testPath = path.join(baseDir, dir, 'articles', `article-${id}.md`);
          if (fs.existsSync(testPath)) {
            const content = fs.readFileSync(testPath, 'utf8');
            return NextResponse.json(parseArticleContent(content, id));
          }
        }
      }
      
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    const content = fs.readFileSync(articlePath, 'utf8');
    return NextResponse.json(parseArticleContent(content, id));
    
  } catch (error) {
    console.error('Error reading article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 解析Markdown文章内容
function parseArticleContent(content: string, id: string): {
  id: string;
  title: string;
  originalTitle: string;
  category: string;
  publishedAt: string;
  translatedBy: string;
  content: string;
  sources: Array<{ name: string; url: string; title: string }>;
} {
  const lines = content.split('\n');
  
  let title = '';
  let originalTitle = '';
  let category = '其他';
  let publishedAt = '';
  let translatedBy = '';
  let articleContent = '';
  const sources: Array<{ name: string; url: string; title: string }> = [];
  
  let inContent = false;
  let inSources = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim();
    } else if (line.includes('原文标题**:')) {
      originalTitle = line.split('**:')[1]?.trim() || '';
    } else if (line.includes('分类**:')) {
      category = line.split('**:')[1]?.trim() || '其他';
    } else if (line.includes('发布时间**:')) {
      publishedAt = line.split('**:')[1]?.trim() || '';
    } else if (line.includes('翻译引擎**:')) {
      translatedBy = line.split('**:')[1]?.trim() || '';
    } else if (line === '## 正文') {
      inContent = true;
      inSources = false;
    } else if (line === '## 相关链接') {
      inContent = false;
      inSources = true;
    } else if (inContent && !line.startsWith('##')) {
      articleContent += line + '\n';
    } else if (inSources && line.startsWith('- [')) {
      // 解析来源链接
      const match = line.match(/- \[([^\]]+) - ([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        sources.push({
          name: match[1],
          title: match[2],
          url: match[3],
        });
      }
    }
  }
  
  return {
    id,
    title,
    originalTitle,
    category,
    publishedAt,
    translatedBy,
    content: articleContent.trim(),
    sources,
  };
}
