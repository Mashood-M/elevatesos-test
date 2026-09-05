import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /[\\/]\.playwright-mcp[\\/]/,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.WEB_ORIGIN ?? "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, x-elevates-client, x-elevates-token, Authorization",
          },
        ],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
