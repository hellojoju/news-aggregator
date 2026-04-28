#!/bin/bash
# 设置定时任务

echo "设置每天早上6点自动抓取资讯..."

# 创建cron任务
CRON_JOB="0 6 * * * /Users/jieson/Documents/news-aggregator/crawler/run.sh"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "news-aggregator"; then
    echo "定时任务已存在"
else
    # 添加新任务
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "定时任务已添加: 每天6:00执行"
fi

echo ""
echo "当前定时任务:"
crontab -l | grep news-aggregator
