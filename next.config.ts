import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pages are statically generated; the interactive workspace is a client component
  // loaded via dynamic import with ssr: false, so Monaco and SQLite WASM stay out of
  // the initial server-rendered payload.
  experimental: {
    // sql.js ships a CommonJS build; interop is handled by the bundler already, but
    // keeping this explicit avoids warnings in newer Next.js versions.
    optimizePackageImports: ["@monaco-editor/react"],
  },
  async headers() {
    return [
      {
        // Versioned build assets (hashed JS/CSS chunks, including the worker bundle)
        // are safe to cache aggressively.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // The sql.js WASM binary is content-hashed and lazy-loaded; keep it cached.
        source: "/sql-wasm/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
