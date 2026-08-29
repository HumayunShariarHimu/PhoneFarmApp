/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL:    process.env.NEXT_PUBLIC_API_URL    || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL:     process.env.NEXT_PUBLIC_WS_URL     || 'http://localhost:4000',
    NEXT_PUBLIC_APP_NAME:   process.env.NEXT_PUBLIC_APP_NAME   || 'PhoneFarmOS',
  },
  images: { domains: ['localhost'] },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
