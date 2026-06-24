/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // API proxying is handled by app/api/[...path]/route.ts at runtime.
  // This avoids the Next.js standalone build-time baking issue with rewrites.
};
module.exports = nextConfig;
