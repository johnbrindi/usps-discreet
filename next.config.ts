import type { NextConfig } from "next";
import { mapTiles, tileOrigin } from "./src/config/map";

const isDev = process.env.NODE_ENV !== "production";

// Next.js injects inline bootstrap scripts, so script-src needs 'unsafe-inline' unless a
// nonce-based CSP is adopted (see docs/architecture.md → Security).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Route-map tiles (src/config/map.ts).
  `img-src 'self' data: blob: ${[mapTiles.street.url, mapTiles.satellite.url].map(tileOrigin).filter(Boolean).join(" ")}`,
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const MAP_DATA = ["./src/server/geo/cities.json"];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev-only "N" badge sits bottom-left, on top of the admin sidebar's Sign out button.
  devIndicators: false,
  reactStrictMode: true,
  // The route-map place list is read from disk at runtime (src/server/geo/places.ts), so ship it with these routes.
  outputFileTracingIncludes: {
    "/track/[trackingNumber]": MAP_DATA,
    "/summary/[trackingNumber]": MAP_DATA,
  },
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
