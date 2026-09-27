import type { NextConfig } from "next";

// One .env for the whole monorepo (repo root); Next only auto-loads its own directory.
try {
  process.loadEnvFile("../../.env");
} catch {}

const API_URL = process.env.API_URL ?? "http://localhost:8787";

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@dastaras/api", "@dastaras/shared"],
  // Same-origin API: the browser talks to /api on this host, so auth cookies stay first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default config;
