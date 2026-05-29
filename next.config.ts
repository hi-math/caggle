import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent legacy design .jsx files in pages/assets/ from being treated as routes
  pageExtensions: ['tsx', 'ts'],
};

export default nextConfig;
