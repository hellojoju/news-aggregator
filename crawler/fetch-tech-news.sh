#!/bin/bash
set -e

DATE_STR=$(date +%Y-%m-%d)
BASE_DIR="/Users/jieson/Documents/news-aggregator/$DATE_STR"
ARTICLES_DIR="$BASE_DIR/articles"

mkdir -p "$ARTICLES_DIR"

echo "开始抓取 $DATE_STR 的科技资讯..."
echo ""

# 科技文章URL列表
TECH_URLS=(
  "https://www.huxiu.com/article/4841208.html"
  "https://www.huxiu.com/article/4841224.html"
  "https://www.huxiu.com/article/4841069.html"
  "https://www.huxiu.com/article/4841333.html"
  "https://www.huxiu.com/article/4841178.html"
)

INDEX=3  # 从3开始，前面已有3篇
JSON_ENTRIES=()

for URL in "${TECH_URLS[@]}"; do
  INDEX=$((INDEX + 1))
  ID="${DATE_STR//-/}-${INDEX}"
  
  echo "[$((INDEX-3))/${#TECH_URLS[@]}] 抓取: $URL"
  
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
    echo "  ✗ 内容太短"
    continue
  fi
  
  # 智能分类
  CATEGORY="其他"
  if echo "$TITLE $CONTENT" | grep -qiE "(AI|人工智能|ChatGPT|Claude|大模型|芯片|科技|技术)"; then
    CATEGORY="AI"
  elif echo "$TITLE $CONTENT" | grep -qiE "(手机|iPhone|电脑|硬件|设备|汽车)"; then
    CATEGORY="硬件"
  elif echo "$TITLE $CONTENT" | grep -qiE "(创业|融资|投资|上市|公司)"; then
    CATEGORY="创业"
  elif echo "$TITLE $CONTENT" | grep -qiE "(产品|设计|用户体验|发布)"; then
    CATEGORY="产品"
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

- [虎嗅]($URL)
EOF

  echo "  ✓ 已保存 (${#CONTENT} 字符) - 分类: $CATEGORY"
  
  # 构建JSON
  JSON_ENTRIES+=("{\"id\":\"$ID\",\"title\":\"$TITLE\",\"summary\":\"$SUMMARY...\",\"category\":\"$CATEGORY\",\"publishedAt\":\"$DATE_STR\",\"sourceCount\":1,\"contentFile\":\"articles/article-$ID.md\"}")
  
  sleep 2
done

# 读取现有JSON并追加
EXISTING_JSON=$(cat "$BASE_DIR/articles.json" 2>/dev/null || echo "[]")

# 保存新的JSON
echo "[" > "$BASE_DIR/articles.json"
FIRST=true

# 先写入已有条目（去掉末尾的]）
echo "$EXISTING_JSON" | sed 's/^\[//' | sed 's/\]$//' | sed 's/^,//' >> "$BASE_DIR/articles.json"

# 追加新条目
for entry in "${JSON_ENTRIES[@]}"; do
  echo ",$entry" >> "$BASE_DIR/articles.json"
done

echo "" >> "$BASE_DIR/articles.json"
echo "]" >> "$BASE_DIR/articles.json"

echo ""
echo "✅ 完成！新增 ${#JSON_ENTRIES[@]} 篇科技文章"
echo "数据保存: $BASE_DIR"

# 关闭浏览器
agent-browser close > /dev/null 2>&1 || true
