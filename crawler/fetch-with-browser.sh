#!/bin/bash

# 使用agent-browser抓取真实科技文章

DATE_STR=$(date +%Y-%m-%d)
BASE_DIR="/Users/jieson/Documents/news-aggregator/$DATE_STR"
ARTICLES_DIR="$BASE_DIR/articles"

mkdir -p "$ARTICLES_DIR"

echo "开始抓取 $DATE_STR 的真实文章..."

# 文章列表（真实的科技文章URL）
declare -a ARTICLES=(
  "https://www.huxiu.com/article/4841529.html|虎嗅|其他"
  "https://www.huxiu.com/article/4841080.html|虎嗅|AI"
  "https://36kr.com/p/123456|36Kr|创业"
)

INDEX=0

for item in "${ARTICLES[@]}"; do
  IFS='|' read -r URL SOURCE CATEGORY <<< "$item"
  INDEX=$((INDEX + 1))
  ID="${DATE_STR//-/}-${INDEX}"
  
  echo ""
  echo "[$INDEX] 抓取: $URL"
  
  # 打开页面
  agent-browser open "$URL" > /dev/null 2>&1
  
  # 获取标题
  TITLE=$(agent-browser get title 2>/dev/null | head -1)
  
  if [ -z "$TITLE" ]; then
    echo "  无法获取标题，跳过"
    continue
  fi
  
  echo "  标题: $TITLE"
  
  # 获取正文内容（通过JavaScript）
  CONTENT=$(agent-browser eval "document.querySelector('article')?.innerText || document.querySelector('.article-content')?.innerText || document.body.innerText.substring(0, 3000)" 2>/dev/null)
  
  if [ -z "$CONTENT" ]; then
    echo "  无法获取内容，跳过"
    continue
  fi
  
  # 生成摘要（前200字）
  SUMMARY=$(echo "$CONTENT" | head -c 200)
  
  # 保存Markdown文件
  cat > "$ARTICLES_DIR/article-$ID.md" << EOF
# $TITLE

**分类**: $CATEGORY  
**发布时间**: $DATE_STR  
**来源数量**: 1  

## 摘要

$SUMMARY...

## 正文

$CONTENT

## 相关链接

- [$SOURCE - $TITLE]($URL)
EOF

  echo "  ✓ 已保存"
  
  # 添加到索引JSON
  if [ $INDEX -eq 1 ]; then
    echo "[" > "$BASE_DIR/articles.json"
  else
    echo "," >> "$BASE_DIR/articles.json"
  fi
  
  cat >> "$BASE_DIR/articles.json" << EOF
{
  "id": "$ID",
  "title": "$TITLE",
  "summary": "$SUMMARY...",
  "category": "$CATEGORY",
  "publishedAt": "$DATE_STR",
  "sourceCount": 1,
  "contentFile": "articles/article-$ID.md"
}
EOF

done

# 关闭JSON数组
echo "" >> "$BASE_DIR/articles.json"
echo "]" >> "$BASE_DIR/articles.json"

echo ""
echo "完成！共抓取 $INDEX 篇文章"
echo "数据保存: $BASE_DIR"

# 关闭浏览器
agent-browser close > /dev/null 2>&1
