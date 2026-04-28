import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const BASE_DIR = '/Users/jieson/Documents/news-aggregator';
const CRAWLER_DIR = '/Users/jieson/Documents/news-aggregator/crawler';

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayCount() {
  const file = path.join(BASE_DIR, getToday(), 'articles.json');
  if (!fs.existsSync(file)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export async function POST() {
  try {
    const beforeCount = getTodayCount();

    const { stdout, stderr } = await execFileAsync('node', ['main.js'], {
      cwd: CRAWLER_DIR,
      timeout: 1000 * 60 * 10,
      maxBuffer: 1024 * 1024 * 20,
      env: process.env,
    });

    const afterCount = getTodayCount();
    const logTail = [stdout, stderr].filter(Boolean).join('\n').split('\n').slice(-80).join('\n');

    return NextResponse.json({
      success: true,
      beforeCount,
      afterCount,
      message: `抓取完成：${beforeCount} -> ${afterCount}`,
      logTail,
    });
  } catch (error: unknown) {
    const e = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };

    const logTail = [e.stdout || '', e.stderr || '', e.message || '']
      .filter(Boolean)
      .join('\n')
      .split('\n')
      .slice(-120)
      .join('\n');

    return NextResponse.json(
      {
        success: false,
        message: '抓取失败，请查看日志',
        logTail,
      },
      { status: 500 }
    );
  }
}
