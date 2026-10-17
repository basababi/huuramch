import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  devIndicators: false,
  // ~11 KB of CSS goes into the HTML: no render-blocking stylesheet round trip on 4G (§7 LCP).
  experimental: { inlineCss: true },
  // `pnpm dev` only: phones on the same Wi-Fi open the dev server by its LAN address, so let
  // private-network hosts load dev assets and the HMR socket (Next blocks other hosts by default).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
};

export default nextConfig;
