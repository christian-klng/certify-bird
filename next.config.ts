import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erzeugt .next/standalone: ein schlankes Paket für das Docker-Image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
