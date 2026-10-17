import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes is switched on in M4, once /create, /room and /rules exist.
  devIndicators: false,
};

export default nextConfig;
