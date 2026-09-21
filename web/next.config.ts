import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve /_next/* JS chunks (not just HMR) when loaded
  // via the machine's LAN IP instead of localhost — otherwise Next.js 403s
  // those requests, React never hydrates, and every client component
  // (including the scroll-reveal animations) silently never runs. If this
  // machine's LAN IP changes, update this to match.
  allowedDevOrigins: ["192.168.1.63"],
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
