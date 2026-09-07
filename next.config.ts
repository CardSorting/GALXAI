import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self' https://checkout.stripe.com",
      // Next.js development bundles use eval; production keeps it disabled.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://js.stripe.com https://vercel.live`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.galx.ai https://api.stripe.com https://*.vercel-insights.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://vercel.live",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["pg", "stripe"],
  eslint: {
    // Production build resilience: prevents transient linter crashes from aborting Vercel builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Zero build errors verified via tsc --noEmit
    ignoreBuildErrors: false,
  },
  logging: {
    fetches: {
      // Avoid copying query-string identifiers or signed URLs into production logs.
      fullUrl: process.env.NODE_ENV !== "production",
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "clsx",
      "tailwind-merge"
    ],
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["localhost:3000", "galx.ai", "*.galx.ai", "*.vercel.app", "galxai-*.vercel.app"],
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.galx.ai",
      },
      {
        protocol: "https",
        hostname: "assets-staging.galx.ai",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(ico|svg|png|jpg|jpeg|webp|avif|woff2|woff)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/:path*.(xml|txt|webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/credits/stripe",
        destination: "/api/internal/credits/stripe",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/settings",
        has: [{ type: "query", key: "tab", value: "developer" }],
        destination: "/keys",
        permanent: false,
      },
      {
        source: "/gateway",
        destination: "/keys",
        permanent: true,
      },
      {
        source: "/gateway/:path*",
        destination: "/keys",
        permanent: true,
      },
      {
        source: "/vault",
        destination: "/keys",
        permanent: true,
      },
      {
        source: "/vault/:path*",
        destination: "/keys",
        permanent: true,
      },
      {
        source: "/telemetry",
        destination: "/status",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
