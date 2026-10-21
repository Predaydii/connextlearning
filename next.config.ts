import type { NextConfig } from "next";
import { BASE_PATH, LEGACY_PATH } from "./src/lib/urls";

// Public origin (BETTER_AUTH_URL), e.g. https://connextlearning.tratcouncil.com
const SITE_URL = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : "";

const isDev = process.env.NODE_ENV !== "production";

// No nonces on purpose: it keeps the landing page static and CDN-cacheable.
// All user content is rendered as text by React, and every other source is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.cdninstagram.com https://*.fbcdn.net",
  "font-src 'self'",
  // R2: browser uploads · lh3: Google profile photos read by "บันทึก / แชร์รูป" (boarding pass image)
  "connect-src 'self' https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com",
  // Admin-uploaded videos play straight from R2 (/media redirects to a signed link)
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
  "frame-src 'self'",
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
  basePath: BASE_PATH,
  poweredByHeader: false,
  // First-page covers (src/lib/page-cover.ts): pdf.js + a native canvas, loaded from node_modules
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
      "./node_modules/pdfjs-dist/cmaps/**",
    ],
  },
  experimental: {
    serverActions: {
      // Cover images are posted to a server action; sheet files go directly to R2.
      bodySizeLimit: "6mb",
    },
  },
  // Old links (tratcouncil.com/connextlearning/…, still proxied here by that site's rewrite)
  // go to the same page on our own domain. Absolute, so they leave the proxying host.
  async redirects() {
    return [
      { source: LEGACY_PATH, destination: `${SITE_URL}/`, permanent: true },
      { source: `${LEGACY_PATH}/:path*`, destination: `${SITE_URL}/:path*`, permanent: true },
    ];
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
