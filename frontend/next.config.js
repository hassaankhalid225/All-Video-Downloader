/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Standalone output is for the Docker image only. It is opt-in because `next start`
  // refuses to serve a standalone build — leaving it always on breaks `npm start`, which
  // is how the app is run locally and on any non-container host.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  images: {
    // Thumbnails come from a dozen CDNs that change hostnames without notice, so the
    // allow-list has to be open. Safe here because these URLs only ever originate from
    // our own backend's extraction result, never from user input.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 300,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Downloads must never be cached by a shared proxy — they are user-specific and
        // the signed URL expires.
        source: '/api/file',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ]
  },
}

module.exports = nextConfig
