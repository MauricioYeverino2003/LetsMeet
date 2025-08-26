import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
    // simplest allowlist if you only need picsum
    domains: ["picsum.photos"],

    // OR (more flexible) remotePatterns:
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "picsum.photos",
    //     pathname: "/**",
    //   },
    // ],
  },
};

export default nextConfig;
