'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Layers, RefreshCw } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceCount: number;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const categories = ['全部', 'AI', '产品', '创业', '硬件', '其他'];

  useEffect(() => {
    fetchArticles(true);
  }, []);

  const fetchArticles = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/articles');
      const data = await response.json();
      setArticles(data);
      setLastUpdated(
        new Date().toLocaleString('zh-CN', {
          hour12: false,
        })
      );
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('正在联网抓取并翻译，请稍候...');

      const response = await fetch('/api/refresh', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || '刷新失败');
      }

      await fetchArticles(false);
      setRefreshMessage(`刷新完成：当前 ${data.afterCount || 0} 条资讯`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新失败';
      setRefreshMessage(`${message}（请检查 API Key 或网络）`);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredArticles = selectedCategory === '全部' 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'AI': 'bg-blue-100 text-blue-700',
      '产品': 'bg-green-100 text-green-700',
      '创业': 'bg-orange-100 text-orange-700',
      '硬件': 'bg-purple-100 text-purple-700',
      '其他': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors['其他'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">今日资讯</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '抓取中...' : '刷新抓取'}
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {lastUpdated ? `上次更新：${lastUpdated}` : '尚未更新'}
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {refreshMessage && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {refreshMessage}
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Article List */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              href={`/article/${article.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-2">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className={`px-2 py-1 rounded-full font-medium ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.publishedAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {article.sourceCount} 个来源
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            暂无数据
          </div>
        )}
      </main>
    </div>
  );
}
