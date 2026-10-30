import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone-Output für das Container-Image (Dockerfile, Railway).
  output: "standalone",
  serverExternalPackages: ['pdf-parse'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
