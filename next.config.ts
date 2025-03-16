import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'ichef.bbci.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.bbci.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.bbci.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'news.bbcimg.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'news.bbcimg.co.uk',
        pathname: '/**',
      },
      // Allow all domains for testing
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
