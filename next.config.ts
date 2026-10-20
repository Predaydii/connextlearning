import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/urls";

const isDev = process.env.NODE_ENV !== "production";

// No nonces on purpose: it keeps the landing page static and CDN-cacheable.
// All user content is rendered as text by React, and every other source is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.cdninstagram.com https://*.fbcdn.net",
  "font-src 'self'",
  // Browser uploads go straight to R2 via presigned URLs
  "connect-src 'self' https://*.r2.cloudflarestorage.com",
  // Featured video on the news page
  "frame-src 'self' https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  // Served at tratcouncil.com/connextlearning through a Vercel rewrite on that domain
  basePath: BASE_PATH,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Cover images are posted to a server action; sheet files go directly to R2.
      bodySizeLimit: "6mb",
      // Requests arrive via the tratcouncil.com rewrite, so their Origin differs from our host
      allowedOrigins: ["tratcouncil.com", "www.tratcouncil.com"],
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/:dir(img|covers)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
