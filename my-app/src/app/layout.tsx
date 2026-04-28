import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "今日资讯 - 科技聚合",
  description: "自动抓取多平台科技资讯，每天早上6点更新",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
