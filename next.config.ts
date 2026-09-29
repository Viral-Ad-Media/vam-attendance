import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Produces a minimal, self-contained .next/standalone build (only the
  // files needed to run `node server.js`) — this is what the Dockerfile
  // copies into the final image instead of the whole node_modules tree.
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://billing.stripe.com; " +
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
        ],
      },
    ];
  },


};

export default nextConfig;
