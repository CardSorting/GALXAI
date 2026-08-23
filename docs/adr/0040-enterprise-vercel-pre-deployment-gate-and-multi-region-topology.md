# ADR 0040: Enterprise Vercel Pre-Deployment Gate, Next.js 15 Optimization & Multi-Region Topology

## Status
**Accepted & Implemented**

## Context
Deploying a hybrid enterprise platform combining a Next.js 15 App Router web application, Cloudflare Edge Mesh workers, and Supabase PostgreSQL requires strict build-time validation, multi-region routing proximity, cold-start reduction, and automated post-deployment smoke verification. 

Prior to this specification, enterprise deployments faced four major risks:
1. **Secret & Key Drift**: Silent build or runtime failures when cryptographic vault keys, database pooler URIs, or Supabase credentials were missing or malformed.
2. **First Load JS Bloat & Cold Starts**: Heavy UI icon sets (`lucide-react`) and motion libraries (`framer-motion`) inflating shared bundle sizes and slowing down serverless cold starts.
3. **Prerendering Failures**: Server components and middleware throwing unhandled runtime exceptions during Next.js static build page data collection.
4. **Serverless Connection Exhaustion**: Direct database connections from multi-region serverless lambdas exhausting PostgreSQL connection pools.

## Decision

1. **8-Phase Pre-Flight Audit Engine (`scripts/verify-vercel-readiness.ts`)**:
   - Integrated an automated pre-flight audit engine that runs on every local compilation and Vercel build via the `"prebuild"` hook (`package.json`).
   - Audits 8 core architectural pillars:
     1. `vercel.json` JSON schema, security headers, CORS definitions, and clean URLs.
     2. Bundle footprint and credential leak prevention via `.vercelignore`.
     3. Cryptographic vault hardware enclave self-test (HKDF-SHA256 & AES-256-GCM roundtrip).
     4. Supabase infrastructure, HTTPS endpoint ping, anon key validation, and Transaction Pooler URI verification.
     5. Route architecture and Serverless (Node.js) vs Edge runtime isolation.
     6. Static assets, Web App Manifest, dynamic `robots.ts`, and `sitemap.ts`.
     7. Next.js 15 hardened configuration and ESLint 9 Flat Config.
     8. Production build trace verification across all 117 static and SSG pages.

2. **Next.js 15 Production Hardening (`next.config.ts`)**:
   - **`optimizePackageImports`**: Configured for `lucide-react`, `framer-motion`, `clsx`, and `tailwind-merge` to aggressively tree-shake unused exports and reduce First Load JS to ~102 kB.
   - **`serverExternalPackages`**: Explicitly marked `['pg']` as server-only external binaries to prevent accidental bundling into client chunks.
   - **Security Headers & HSTS**: Enforced `poweredByHeader: false` (server fingerprint obfuscation), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`.
   - **Multimodal CDN Remote Patterns**: Configured AVIF/WebP image optimization for `assets.galx.ai`, `assets-staging.galx.ai`, `*.supabase.co`, and OpenAI blob storage.

3. **Multi-Region Routing Proximity & Automated Health Crons (`vercel.json`)**:
   - Pinned serverless function execution regions to `["sfo1", "iad1"]` to ensure low-latency physical proximity to AWS US-West/East Supabase connection poolers.
   - Scheduled automated 15-minute background health crons (`*/15 * * * *` on `/api/health`) to keep serverless functions pre-warmed.

4. **Automated Vercel Secret Synchronizer & Smoke Test Suite**:
   - Created `scripts/sync-vercel-env.ts` (`npm run vercel:env:print`) to validate and generate CLI sync commands for all 9 critical environment secrets.
   - Created `scripts/verify-deployment-smoke.ts` (`npm run vercel:smoke`) to run automated live HTTP/HTTPS smoke verification against production or preview deployment URLs.

## Consequences

### Positive
- **Deterministic 100% Build Pass Rate**: All 117 static, SSG, and dynamic routes compile cleanly with zero runtime exceptions during static analysis.
- **Sub-110kB Shared Bundle Size**: First load JavaScript shared across all routes is held at ~102 kB.
- **Continuous CI Enforcement**: Pull requests and main branch pushes are validated automatically via `.github/workflows/vercel-preflight.yml`.
- **Zero-Downtime Secret Management**: Master vault keys and Supabase credentials are synchronized and validated before deployment.

### Neutral / Trade-offs
- Node.js runtime version is strictly pinned to `20.18.0` LTS via `.nvmrc` and `.node-version`.
- Pre-deployment audit adds 1–2 seconds to the local build phase to guarantee hardware cipher and network health verification.
