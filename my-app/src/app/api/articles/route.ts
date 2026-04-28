import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 获取今天的日期（本地时区）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const articlesPath = path.join('/Users/jieson/Documents/news-aggregator', today, 'articles.json');
    
    // 如果今天没有数据，尝试找最近的一天
    let articlesData = null;
    
    if (fs.existsSync(articlesPath)) {
      articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    } else {
      // 查找最近的数据
      const baseDir = '/Users/jieson/Documents/news-aggregator';
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir)
          .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
          .sort()
          .reverse();
        
        for (const dir of dirs) {
          const testPath = path.join(baseDir, dir, 'articles.json');
          if (fs.existsSync(testPath)) {
            articlesData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
            break;
          }
        }
      }
    }
    
    if (!articlesData) {
      // 返回示例数据
      return NextResponse.json([
        {
          id: 'demo-001',
          title: '欢迎使用资讯聚合器',
          summary: '这是一个自动抓取多平台科技资讯的工具，每天早上6点自动更新。',
          category: '其他',
          publishedAt: today,
          sourceCount: 1,
        }
      ]);
    }
    
    return NextResponse.json(articlesData);
  } catch (error) {
    console.error('Error reading articles:', error);
    return NextResponse.json([], { status: 500 });
  }
}
