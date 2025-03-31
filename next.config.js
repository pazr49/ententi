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
  // Exclude Supabase Edge Functions from build
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'supabase/functions']; 
    return config;
  },
};

module.exports = nextConfig; 