import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Task media (audio/image) served from the backend's R2_PUBLIC_URL —
    // a Cloudflare R2 public bucket, always on a "pub-<hash>.r2.dev" host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
};

export default nextConfig;
