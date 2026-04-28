#!/bin/bash

# 重新抓取并清理内容

DATE_STR=$(date +%Y-%m-%d)
BASE_DIR="/Users/jieson/Documents/news-aggregator/$DATE_STR"
ARTICLES_DIR="$BASE_DIR/articles"

mkdir -p "$ARTICLES_DIR"

echo "重新抓取并清理内容..."
echo ""

# 文章列表
URLS=(
  "https://www.huxiu.com/article/4841080.html|AI战争|AI"
  "https://www.huxiu.com/article/4841529.html|伊朗经济|其他"
  "https://www.huxiu.com/article/4840077.html|伊朗变局|其他"
  "https://www.huxiu.com/article/4841208.html|龙虾爆雷|创业"
  "https://www.huxiu.com/article/4841224.html|国产鸟|创业"
  "https://www.huxiu.com/article/4841069.html|泡泡玛特|创业"
  "https://www.huxiu.com/article/4841333.html|跨海大桥|创业"
  "https://www.huxiu.com/article/4841178.html|贸易逆差|创业"
)

INDEX=0

echo "[" > "$BASE_DIR/articles.json"
FIRST=true

for item in "${URLS[@]}"; do
  IFS='|' read -r URL TITLE CATEGORY <<< "$item"
  INDEX=$((INDEX + 1))
  ID="${DATE_STR//-/}-${INDEX}"
  
  echo "[$INDEX/${#URLS[@]}] 抓取: $TITLE"
  
  # 打开页面
  if ! agent-browser open "$URL" > /dev/null 2>&1; then
    echo "  ✗ 无法打开"
    continue
  fi
  
  # 获取标题
  RAW_TITLE=$(agent-browser get title 2>/dev/null | sed 's/ - .*$//' | head -1)
  TITLE_CLEAN=$(echo "$RAW_TITLE" | sed 's/["'"'"']//g' | head -c 80)
  
  # 获取正文 - 使用更精确的选择器
  CONTENT=$(agent-browser eval "
    // 尝试多种选择器找到文章正文
    const selectors = [
      '.article-content',
      'article .content',
      '[class*="content"] p',
      'article p',
      '.post-content',
      'main p'
    ];
    
    let text = '';
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        text = Array.from(els)
          .map(el => el.innerText)
          .filter(t => t.length > 20 && !t.includes('评论') && !t.includes('登录'))
          .join('\n\n');
        if (text.length > 500) break;
      }
    }
    
    // 如果还是没找到，尝试获取文章区域
    if (text.length < 500) {
      const article = document.querySelector('article') || document.querySelector('main');
      if (article) {
        text = article.innerText;
      }
    }
    
    text.substring(0, 8000);
  " 2>/dev/null | tail -1)
  
  if [ -z "$CONTENT" ] || [ ${#CONTENT} -lt 200 ]; then
    echo "  ✗ 内容太短"
    continue
  fi
  
  # 清理内容
  CONTENT_CLEAN=$(echo "$CONTENT" | \
    sed 's/Pause [0-9:]*//g' | \
    sed 's/Unmute//g' | \
    sed 's/设置//g' | \
    sed 's/Enter fullscreen//g' | \
    sed 's/#今天介绍谁//g' | \
    sed 's/关注 酷玩实验室coollabs//g' | \
    sed 's/频道: 视频//g' | \
    sed 's/认证作者//g' | \
    sed 's/已在虎嗅发表.*篇文章//g' | \
    sed 's/本内容由作者授权发布.*//g' | \
    sed 's/如对本稿件有异议.*//g' | \
    sed 's/正在改变与想要改变世界的人.*//g' | \
    sed 's/虎嗅APP//g' | \
    sed 's/赞赏//g' | \
    sed 's/支持一下//g' | \
    sed 's/读过本文，Ta们还读了.*//g' | \
    sed 's/评论.*//g' | \
    sed 's/登录.*//g' | \
    sed 's/后参与评论.*//g' | \
    sed 's/虎嗅用户社区交流公约.*//g' | \
    sed 's/最新评论.*//g' | \
    sed 's/这里空空如也.*//g' | \
    sed 's/期待你的发声.*//g' | \
    sed 's/[0-9]\{1,2\}\s*[0-9]*$//g' | \
    sed 's/^[[:space:]]*//g' | \
    sed '/^$/N;/^\n$/D')
  
  # 生成摘要
  SUMMARY=$(echo "$CONTENT_CLEAN" | head -c 200 | sed 's/["'"'"']//g')
  
  # 保存Markdown
  cat > "$ARTICLES_DIR/article-$ID.md" << EOF
# $TITLE_CLEAN

**分类**: $CATEGORY  
**发布时间**: $DATE_STR  
**来源数量**: 1  

## 摘要

$SUMMARY...

## 正文

$CONTENT_CLEAN

## 相关链接

- [虎嗅 - 阅读原文]($URL)
EOF

  echo "  ✓ 已保存 (${#CONTENT_CLEAN} 字符)"
  
  # JSON条目
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$BASE_DIR/articles.json"
  fi
  
  cat >> "$BASE_DIR/articles.json" << EOF
{"id":"$ID","title":"$TITLE_CLEAN","summary":"$SUMMARY...","category":"$CATEGORY","publishedAt":"$DATE_STR","sourceCount":1,"contentFile":"articles/article-$ID.md"}
EOF

  sleep 2
done

echo "" >> "$BASE_DIR/articles.json"
echo "]" >> "$BASE_DIR/articles.json"

echo ""
echo "✅ 完成！共抓取 $INDEX 篇文章"

agent-browser close > /dev/null 2>&1 || true
