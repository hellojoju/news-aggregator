#!/bin/bash

# 抓取AI科技资讯 - 针对Jieson的偏好

DATE_STR=$(date +%Y-%m-%d)
BASE_DIR="/Users/jieson/Documents/news-aggregator/$DATE_STR"
ARTICLES_DIR="$BASE_DIR/articles"

# 清空旧数据
rm -rf "$BASE_DIR"
mkdir -p "$ARTICLES_DIR"

echo "开始抓取AI科技资讯..."
echo "日期: $DATE_STR"
echo ""

# AI科技文章URL列表（精选）
AI_URLS=(
  # OpenAI/ChatGPT相关
  "https://www.huxiu.com/article/4841080.html|AI战争|AI技术"
  
  # 可以添加更多AI相关文章URL
)

INDEX=0
echo "[" > "$BASE_DIR/articles.json"
FIRST=true

# 抓取函数
fetch_article() {
  local URL=$1
  local DEFAULT_TITLE=$2
  local CATEGORY=$3
  
  INDEX=$((INDEX + 1))
  local ID="${DATE_STR//-/}-${INDEX}"
  
  echo "[$INDEX] 抓取: $DEFAULT_TITLE"
  
  # 打开页面
  if ! agent-browser open "$URL" > /dev/null 2>&1; then
    echo "  ✗ 无法打开页面"
    return 1
  fi
  
  # 获取标题
  local RAW_TITLE=$(agent-browser get title 2>/dev/null | sed 's/ - .*$//' | head -1)
  local TITLE=$(echo "$RAW_TITLE" | sed 's/["'"'"']//g' | head -c 80)
  
  if [ -z "$TITLE" ] || [ "$TITLE" = "Done" ]; then
    TITLE="$DEFAULT_TITLE"
  fi
  
  echo "  标题: ${TITLE:0:50}..."
  
  # 获取正文 - 优先提取文章正文
  local CONTENT=$(agent-browser eval "
    // 尝试多种选择器提取文章正文
    const selectors = [
      '.article-content',
      '.article-detail',
      'article .content',
      '[class*=\"article\"] p',
      'main p'
    ];
    
    let text = '';
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        text = Array.from(els)
          .map(el => el.innerText)
          .filter(t => t.length > 30)
          .join('\n\n');
        if (text.length > 500) break;
      }
    }
    
    // 清理内容
    text = text
      .replace(/Pause\s*\d{2}:\d{2}/g, '')
      .replace(/Unmute/g, '')
      .replace(/设置/g, '')
      .replace(/Enter fullscreen/g, '')
      .replace(/#\w+/g, '')
      .replace(/关注\s*\w+/g, '')
      .replace(/频道:\s*\w+/g, '')
      .replace(/认证作者/g, '')
      .replace(/已在虎嗅发表.*篇文章/g, '')
      .replace(/本内容由作者授权发布.*/g, '')
      .replace(/如对本稿件有异议.*/g, '')
      .replace(/正在改变与想要改变世界的人.*/g, '')
      .replace(/虎嗅APP/g, '')
      .replace(/赞赏/g, '')
      .replace(/支持一下/g, '')
      .replace(/读过本文，Ta们还读了.*/g, '')
      .replace(/评论.*/g, '')
      .replace(/登录.*/g, '')
      .replace(/后参与评论.*/g, '')
      .replace(/虎嗅用户社区交流公约.*/g, '')
      .replace(/最新评论.*/g, '')
      .replace(/这里空空如也.*/g, '')
      .replace(/期待你的发声.*/g, '')
      .replace(/\d{1,2}\s*\d*$/g, '')
      .trim();
    
    text.substring(0, 6000);
  " 2>/dev/null | tail -1)
  
  if [ -z "$CONTENT" ] || [ ${#CONTENT} -lt 200 ]; then
    echo "  ✗ 内容太短，跳过"
    return 1
  fi
  
  # 智能判断分类
  local FINAL_CATEGORY="$CATEGORY"
  local CONTENT_LOWER=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')
  
  if echo "$CONTENT_LOWER" | grep -qE "(gpt|claude|llm|大模型|模型训练|算法|推理)"; then
    FINAL_CATEGORY="AI技术"
  elif echo "$CONTENT_LOWER" | grep -qE "(cursor|编程|代码|开发工具|openclaw|mcp)"; then
    FINAL_CATEGORY="AI编程"
  elif echo "$CONTENT_LOWER" | grep -qE "(agent|智能体|rag|知识库|ai写作|ai绘画)"; then
    FINAL_CATEGORY="AI应用"
  elif echo "$CONTENT_LOWER" | grep -qE "(nvidia|gpu|芯片|算力)"; then
    FINAL_CATEGORY="AI硬件"
  elif echo "$CONTENT_LOWER" | grep -qE "(融资|创业|商业化|落地|产品)"; then
    FINAL_CATEGORY="AI商业"
  fi
  
  # 生成摘要
  local SUMMARY=$(echo "$CONTENT" | head -c 200 | sed 's/["'"'"']//g' | tr '\n' ' ')
  
  # 保存Markdown
  cat > "$ARTICLES_DIR/article-$ID.md" << EOF
# $TITLE

**分类**: $FINAL_CATEGORY  
**发布时间**: $DATE_STR  
**来源数量**: 1  

## 摘要

$SUMMARY...

## 正文

$CONTENT

## 相关链接

- [虎嗅 - 阅读原文]($URL)
EOF

  echo "  ✓ 已保存 (${#CONTENT} 字符) - 分类: $FINAL_CATEGORY"
  
  # JSON条目
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$BASE_DIR/articles.json"
  fi
  
  cat >> "$BASE_DIR/articles.json" << EOF
{"id":"$ID","title":"$TITLE","summary":"$SUMMARY...","category":"$FINAL_CATEGORY","publishedAt":"$DATE_STR","sourceCount":1,"contentFile":"articles/article-$ID.md"}
EOF

  sleep 2
  return 0
}

# 抓取现有文章
for item in "${AI_URLS[@]}"; do
  IFS='|' read -r URL TITLE CATEGORY <<< "$item"
  fetch_article "$URL" "$TITLE" "$CATEGORY"
done

# 关闭JSON
echo "" >> "$BASE_DIR/articles.json"
echo "]" >> "$BASE_DIR/articles.json"

# 关闭浏览器
agent-browser close > /dev/null 2>&1 || true

echo ""
echo "✅ 完成！共抓取 $INDEX 篇AI科技文章"
echo ""
echo "分类统计:"
cat "$BASE_DIR/articles.json" | grep -o '"category":"[^"]*"' | sed 's/"category":"//;s/"$//' | sort | uniq -c | sed 's/^/  /'
