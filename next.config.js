/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig; 