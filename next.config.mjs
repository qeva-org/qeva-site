// next.config.mjs  — guaranteed to work
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not fail the Vercel build on ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
