/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ← skip ESLint errors on `next build`
  },
};

module.exports = nextConfig;

