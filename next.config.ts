import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/export': ['./assets/fonts/**/*'],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
