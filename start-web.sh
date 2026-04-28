#!/bin/bash
# 启动资讯聚合网站

echo "启动资讯聚合网站..."
echo ""

cd /Users/jieson/Documents/news-aggregator/my-app
PORT=3005

# 检查是否有示例数据，没有则创建
TODAY=$(date +%Y-%m-%d)
DATA_DIR="/Users/jieson/Documents/news-aggregator/$TODAY"

if [ ! -d "$DATA_DIR" ]; then
    echo "创建示例数据目录..."
    mkdir -p "$DATA_DIR/articles"
    
    # 创建示例文章
    cat > "$DATA_DIR/articles/article-${TODAY//-/}-001.md" << 'EOF'
# 欢迎使用资讯聚合器

**分类**: 其他  
**发布时间**: 2026-03-13  
**来源数量**: 1  

## 摘要

这是一个自动抓取多平台科技资讯的工具，每天早上6点自动更新。

## 正文

资讯聚合器会自动从以下平台抓取最新内容：

- 微信公众号：数字生命卡兹克、agent橘、卡尔的ai沃茨等13个公众号
- 国内科技媒体：36Kr、虎嗅、极客公园
- 国外科技媒体：TechCrunch、The Verge、Ars Technica
- Twitter/X：热门科技推文
- 百度热搜：科技类热门话题

系统会自动整合同类内容，去重分类，生成易读的摘要和详细内容。

## 相关链接

- [项目文档 - 使用说明](https://github.com)
EOF

    # 创建索引
    cat > "$DATA_DIR/articles.json" << EOF
[
  {
    "id": "${TODAY//-/}-001",
    "title": "欢迎使用资讯聚合器",
    "summary": "这是一个自动抓取多平台科技资讯的工具，每天早上6点自动更新。",
    "category": "其他",
    "publishedAt": "$TODAY",
    "sourceCount": 1,
    "contentFile": "articles/article-${TODAY//-/}-001.md"
  }
]
EOF
    
    echo "✓ 示例数据已创建"
fi

echo ""
echo "启动 Next.js 开发服务器..."
echo "访问地址: http://localhost:${PORT}"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev -- -p ${PORT}
