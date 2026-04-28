#!/bin/bash
set -e

DATE_STR=$(date +%Y-%m-%d)
BASE_DIR="/Users/jieson/Documents/news-aggregator/$DATE_STR"
ARTICLES_DIR="$BASE_DIR/articles"

mkdir -p "$ARTICLES_DIR"

echo "开始抓取 $DATE_STR 的真实科技文章..."
echo ""

# 文章列表: URL|来源名称|分类
ARTICLES=(
  "https://www.huxiu.com/article/4841080.html|虎嗅|AI"
  "https://www.huxiu.com/article/4841529.html|虎嗅|其他"
  "https://www.huxiu.com/article/4840077.html|虎嗅|其他"
)

INDEX=0
JSON_ENTRIES=()

for item in "${ARTICLES[@]}"; do
  IFS='|' read -r URL SOURCE CATEGORY <<< "$item"
  INDEX=$((INDEX + 1))
  ID="${DATE_STR//-/}-${INDEX}"
  
  echo "[$INDEX/${#ARTICLES[@]}] 抓取: $URL"
  
  # 打开页面
  if ! agent-browser open "$URL" > /dev/null 2>&1; then
    echo "  ✗ 无法打开页面"
    continue
  fi
  
  # 获取标题
  TITLE=$(agent-browser get title 2>/dev/null | sed 's/ - .*$//' | head -1)
  
  if [ -z "$TITLE" ] || [ "$TITLE" = "Done" ]; then
    echo "  ✗ 无法获取标题"
    continue
  fi
  
  # 清理标题
  TITLE=$(echo "$TITLE" | sed 's/["\\]//g' | head -c 100)
  
  echo "  标题: ${TITLE:0:60}..."
  
  # 获取正文
  CONTENT=$(agent-browser eval "
    const article = document.querySelector('article');
    const content = document.querySelector('.article-content');
    const main = document.querySelector('main');
    const text = article?.innerText || content?.innerText || main?.innerText || document.body.innerText;
    text.substring(0, 5000).replace(/\\s+/g, ' ').trim();
  " 2>/dev/null | tail -1)
  
  if [ -z "$CONTENT" ] || [ ${#CONTENT} -lt 200 ]; then
    echo "  ✗ 内容太短或无法获取"
    continue
  fi
  
  # 生成摘要
  SUMMARY=$(echo "$CONTENT" | sed 's/["\\]//g' | head -c 200)
  
  # 清理内容
  CONTENT_CLEAN=$(echo "$CONTENT" | sed 's/["\\]//g' | sed 's/  */ /g')
  
  # 保存Markdown
  cat > "$ARTICLES_DIR/article-$ID.md" << EOF
# $TITLE

**分类**: $CATEGORY  
**发布时间**: $DATE_STR  
**来源数量**: 1  

## 摘要

$SUMMARY...

## 正文

$CONTENT_CLEAN

## 相关链接

- [$SOURCE]($URL)
EOF

  echo "  ✓ 已保存 (${#CONTENT} 字符)"
  
  # 构建JSON条目
  JSON_ENTRIES+=("{\"id\":\"$ID\",\"title\":\"$TITLE\",\"summary\":\"$SUMMARY...\",\"category\":\"$CATEGORY\",\"publishedAt\":\"$DATE_STR\",\"sourceCount\":1,\"contentFile\":\"articles/article-$ID.md\"}")
  
  # 延迟
  sleep 2
done

# 保存JSON索引
echo "[" > "$BASE_DIR/articles.json"
FIRST=true
for entry in "${JSON_ENTRIES[@]}"; do
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$BASE_DIR/articles.json"
  fi
  echo "$entry" >> "$BASE_DIR/articles.json"
done
echo "" >> "$BASE_DIR/articles.json"
echo "]" >> "$BASE_DIR/articles.json"

echo ""
echo "✅ 完成！共抓取 ${#JSON_ENTRIES[@]} 篇真实文章"
echo "数据保存: $BASE_DIR"

# 关闭浏览器
agent-browser close > /dev/null 2>&1 || true
