import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
