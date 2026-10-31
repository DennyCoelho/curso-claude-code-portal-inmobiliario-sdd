import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opções de configuração do Next.js. */
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
