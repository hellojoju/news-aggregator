# 资讯聚合器

自动抓取多平台 AI 科技资讯，整合展示在本地网页上。

## 功能特点

- **多源采集**：支持 RSS、百度搜索、直接抓取等多种采集方式
- **AI 内容处理**：LLM 辅助清洗和提炼文章内容
- **定时更新**：每日自动抓取和更新
- **本地展示**：Next.js 构建的现代化阅读界面

## 快速开始

```bash
npm install
./start-web.sh
```

打开 http://localhost:3005 访问资讯网站。

### 手动抓取

```bash
./update-news.sh
```

## 技术栈

- **前端**：Next.js，TypeScript
- **爬虫**：Node.js，RSS 解析，网页抓取
- **定时任务**：cron / shell 脚本

## 数据来源

资讯源配置在 `crawler/config.js`，默认聚焦 AI、大模型、Agent 等科技领域。

## License

MIT
