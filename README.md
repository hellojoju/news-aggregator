# 资讯聚合器

自动抓取多平台科技资讯，每天早上6点更新，整合展示在本地网页上。

## 功能特点

- **多源抓取**：微信公众号、科技媒体RSS、Twitter、百度热搜
- **智能整合**：同主题内容自动合并，去重分类
- **分类展示**：AI、产品、创业、硬件四大类别
- **今日头条风格**：简洁的列表+详情页设计
- **本地存储**：无需数据库，文件形式存储在Documents目录

## 支持的数据源

### 微信公众号（13个）
- 数字生命卡兹克、agent橘、卡尔的ai沃茨
- 赛博禅心、通往agi之路、虎嗅app
- founder park、程序员鱼皮、仓何
- 歸藏的ai工具箱、花叔、datawhale、程序猿玩ai

### 国内科技媒体
- 36Kr、虎嗅、极客公园

### 国外科技媒体
- TechCrunch、The Verge、Ars Technica

### 其他
- Twitter/X 热门科技推文
- 百度热搜科技类话题

## 项目结构

```
~/Documents/news-aggregator/
├── my-app/              # Next.js前端
│   ├── src/app/         # 页面和API
│   └── ...
├── crawler/             # 抓取脚本
│   ├── main.js          # 主抓取程序
│   ├── config.js        # 数据源配置
│   ├── fetcher.js       # 抓取逻辑
│   ├── aggregator.js    # 内容整合
│   └── run.sh           # 定时执行脚本
├── setup-cron.sh        # 设置定时任务
├── start-web.sh         # 启动网站
└── 2026-03-13/          # 每日数据目录
    ├── articles.json    # 文章索引
    └── articles/        # 文章详情
        └── article-xxx.md
```

## 使用方法

### 1. 启动网站

```bash
cd ~/Documents/news-aggregator
./start-web.sh
```

访问 http://localhost:3005

### 1.1 联网抓取并更新资讯

```bash
cd ~/Documents/news-aggregator
./update-news.sh
```

说明：
- 已配置 `TAVILY_API_KEY`：会抓取微信/Twitter 搜索 + RSS。
- 未配置 `TAVILY_API_KEY`：会自动退化为 RSS 抓取，仍可更新站点内容。

### 2. 手动抓取今日资讯

```bash
cd ~/Documents/news-aggregator/crawler
node main.js
```

### 3. 设置定时任务（每天早上6点自动抓取）

```bash
cd ~/Documents/news-aggregator
./setup-cron.sh
```

## 技术栈

- **前端**: Next.js 16 + Tailwind CSS + TypeScript
- **后端**: Next.js API Routes
- **数据**: JSON文件 + Markdown
- **抓取**: Node.js + jina.ai/reader + Tavily API
- **调度**: macOS cron

## 环境要求

- Node.js 18+
- macOS（已配置cron）
- 可选：TAVILY_API_KEY（用于搜索，没有则用备用方案）

## 注意事项

1. 首次运行需要安装依赖：`cd my-app && npm install`
2. 抓取频率不宜过高，避免被封
3. 部分网站可能需要登录才能获取完整内容
4. 数据存储在本地Documents目录，不会上传到云端

## 更新计划

- [ ] 添加更多数据源（知乎、B站等）
- [ ] 支持全文搜索
- [ ] 添加收藏功能
- [ ] 邮件推送摘要
