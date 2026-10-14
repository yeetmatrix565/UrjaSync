/**
 * The dashboard ships as a fully static bundle: it is served from a static host
 * or bundled into the Android app's assets. There is no server, so server-only
 * features (headers(), route handlers) are intentionally absent - a static host
 * or CDN is responsible for security headers.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
