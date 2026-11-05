import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "res.cloudinary.com",
      port: "",
      pathname: "/*/image/upload/**",
      search: "",
    }],
  },
  async rewrites() {
    const apiUrl = (process.env.API_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");

    // Preservar a mesma origem no navegador e manter o backend independente.
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
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
