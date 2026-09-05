/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL:  process.env.NEXT_PUBLIC_WS_URL  || 'http://localhost:4000',
    NEXT_PUBLIC_MAX_ACTIVE: process.env.NEXT_PUBLIC_MAX_ACTIVE || '3',
  },
  // Vercel/Next.js pages directory setting
  pageExtensions: ['js','jsx'],
};
