import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "exceljs-hardened$": "exceljs-hardened/dist/exceljs.min.js",
      };
    }
    return config;
  },
};

export default nextConfig;
