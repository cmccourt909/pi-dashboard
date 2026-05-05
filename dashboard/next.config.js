/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // In Docker Compose the backend service is reachable at http://backend:8000
    // When running locally with `npm run dev` it is at http://localhost:8000
    const backendHost = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendHost}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
