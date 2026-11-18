import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  output: 'standalone',
  experimental: {
    agentUpgrade: 'security',
  },
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'activists-periodic-peninsula-diet.trycloudflare.com',
    '*.loca.lt',
    'sinergi-presisi.loca.lt',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
