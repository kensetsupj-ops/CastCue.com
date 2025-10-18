import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',  // Twitch thumbnails
      },
      {
        protocol: 'https',
        hostname: 'vod-secure.twitch.tv',  // Twitch VODs
      },
      {
        protocol: 'https',
        hostname: 'vod-metro.twitch.tv',  // Twitch Metro CDN
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',  // X/Twitter profile images
      },
    ],
    qualities: [75, 90, 100],
  },
};

export default nextConfig;
