import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone-Output nur für Nicht-Vercel-Builds (Docker/Railway). Auf Vercel
  // bleibt der Build unverändert — Vercel setzt process.env.VERCEL="1".
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ['pdf-parse'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
