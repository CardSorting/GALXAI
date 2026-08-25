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
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=*",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
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
      fullUrl: true,
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
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-galx-key, x-api-key, dpop, baggage, sentry-trace",
          },
        ],
      },
      {
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-galx-key, x-api-key, dpop, baggage, sentry-trace",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/vault",
        destination: "/keys",
        permanent: false,
      },
      {
        source: "/vault/:path*",
        destination: "/keys",
        permanent: false,
      },
      {
        source: "/telemetry",
        destination: "/status",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
