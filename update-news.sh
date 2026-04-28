#!/bin/bash
set -e

cd /Users/jieson/Documents/news-aggregator/crawler

echo "开始联网抓取资讯..."
node main.js

echo "完成。已更新今日资讯数据。"
