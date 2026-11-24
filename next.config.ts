import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Sent with every response. A full script CSP is not set yet (Next inline bootstrap scripts). */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://checkout.paycom.uz https://test.paycom.uz; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Database drivers load native/wasm assets at runtime — keep them out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // NEXT_DIST_DIR lets a verification build run beside a live dev server without clobbering .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private pages must never be cached by shared caches.
      { source: "/:locale(ru|uz)/(account|admin|order)/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
