import type { NextConfig } from "next";

// Defence in depth, not a fix for anything: nothing here renders untrusted
// HTML. Scripts and styles allow 'unsafe-inline' because the App Router
// bootstraps with inline scripts and components use style props. The other
// origins are the Adobe Fonts kit (use.typekit.net, p.typekit.net) and
// Runlight analytics.
const CSP = [
  "default-src 'self'",
  // React uses eval in development only, to rebuild stack traces.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://analytics.joncp.dev`,
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  "font-src 'self' https://use.typekit.net https://p.typekit.net",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "connect-src 'self' https://analytics.joncp.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // A self-contained server.js under .next/standalone, which systemd runs.
  // public/ and .next/static are staged in by `npm run bundle`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Native or browser-driving packages stay outside the bundle.
  serverExternalPackages: ["better-sqlite3", "playwright-core", "sharp"],
  // The share card's font is read from disk at request time.
  // The worker starts from instrumentation, which isn't a route, so tracing
  // misses parts of playwright-core that it loads lazily; ship all of it.
  outputFileTracingIncludes: { "/*": ["./assets/**", "./node_modules/playwright-core/**"] },
  // The data directory is set at runtime; whatever is in the local one must
  // never ship inside a build.
  outputFileTracingExcludes: { "/*": ["./data/**", "./src/**", "./scripts/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The local voice audition page (scripts/audition.mts); absent in production.
  async rewrites() {
    return [{ source: "/auditions", destination: "/auditions/index.html" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
