'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Layers, ExternalLink } from 'lucide-react';
import { useParams } from 'next/navigation';

interface ArticleDetail {
  id: string;
  title: string;
  originalTitle: string;
  category: string;
  publishedAt: string;
  translatedBy: string;
  content: string;
  sources: Array<{
    name: string;
    url: string;
    title: string;
  }>;
}

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchArticle(params.id as string);
    }
  }, [params.id]);

  const fetchArticle = async (id: string) => {
    try {
      const response = await fetch(`/api/articles/${id}`);
      const data = await response.json();
      setArticle(data);
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">文章不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回列表</span>
          </Link>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <article className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(article.category)}`}>
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              {article.publishedAt}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>

          {article.originalTitle && article.originalTitle !== article.title && (
            <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <span className="font-medium text-gray-700">原文标题：</span>
              {article.originalTitle}
            </div>
          )}

          {article.translatedBy && (
            <div className="mb-6 text-xs text-gray-500">
              翻译引擎：{article.translatedBy}
            </div>
          )}

          {article.sources.length > 0 && (
            <a
              href={article.sources[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              查看原文链接
            </a>
          )}

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
          />

          {/* Sources */}
          <div className="mt-10 pt-6 border-t border-gray-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
              <Layers className="w-4 h-4" />
              相关链接
            </h3>
            <div className="space-y-3">
              {article.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-red-500 transition-colors">
                      {source.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {source.title}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

// 简单格式化Markdown内容为HTML
function formatContent(content: string): string {
  if (!content) return '';
  
  return content
    // 标题
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-red-500 hover:underline">$1</a>')
    // 段落
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // 列表
    .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
    // 包裹
    .replace(/<li/g, '</p><ul class="mb-4"><li')
    .replace(/<\/li>\n(?!<li)/g, '</li></ul><p class="mb-4">')
    // 初始包裹
    .replace(/^(.)/, '<p class="mb-4">$1')
    .replace(/$/, '</p>');
}
