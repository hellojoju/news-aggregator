#!/bin/bash
# 资讯抓取定时任务脚本
# 每天早上6点执行

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/Users/jieson/Documents/news-aggregator/crawler/cron.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始抓取资讯..." >> "$LOG_FILE"

cd "$SCRIPT_DIR"

# 运行抓取脚本
node main.js >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 抓取完成" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
