# GALXAI: Vercel Production Deployment Guide

This guide details the complete process for deploying the **GALXAI Next.js 15 Web Platform** to **Vercel** with maximum performance, enterprise security headers, and zero-downtime integration with Supabase and Cloudflare Edge infrastructure.

---

## 1. Architectural Topology

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       (Web UI & SSR)                     (API Requests)
               │                               │
               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐
  │   Vercel Deployment     │     │   Cloudflare Workers    │
  │   - Next.js 15 Frontend │     │   - Edge Gateway        │
  │   - Serverless APIs     │     │   - Model Router        │
  │   - OG Image Generator  │     │   - R2 CDN (Assets)     │
  └────────────┬────────────┘     └────────────┬────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
               ┌───────────────────────────────┐
               │      Supabase PostgreSQL      │
               │   - Auth & Session Vault      │
               │   - BYOQ Credential Shards    │
               │   - Task Queues & Telemetry   │
               └───────────────────────────────┘
```

---

## 2. Automated Pre-Deployment Verification Gate

GALXAI features an automated **8-Phase Pre-Flight Audit Engine** and CI verification gate. Run the full pre-deployment check before initiating a deployment:

```bash
# 1. Maintainer Workstation 8-Point Onboarding Diagnostic (<5s)
npm run onboard

# 2. Adversarial Institutional Entropy & Action Safety Benchmark (7-Tier Gradient)
npm run bench:entropy

# 3. OpenAI Empirical Inference Boundary Benchmark (Randomized Branch-Blinded)
npm run bench:inference-boundary

# 4. Run the complete pre-deployment audit & build gate (8 Phases + ESLint + Next.js Build)
npm run deploy:check

# 5. Synchronize or inspect Vercel environment variables
npm run vercel:env:print

# 6. Populate or rotate cryptographic vault master secrets
npm run vault:populate
```


---

## 3. Environment Variables Specification

Configure the following environment variables in the **Vercel Project Settings > Environment Variables**:

| Variable Name | Environment | Required | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | **Yes** | Canonical web URL (e.g. `https://galx.ai` or `https://<project>.vercel.app`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Dev | **Yes** | Supabase project HTTPS endpoint (e.g. `https://<id>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Dev | **Yes** | Supabase anonymous / publishable key safe for client-side queries. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Dev | **Yes** | Alias for Supabase publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Dev | **Yes** | Supabase admin secret key for serverless endpoints. *(Keep Secret)* |
| `DATABASE_URL` | Production, Preview, Dev | **Yes** | PostgreSQL connection pooler URI (`aws-0-us-east-1.pooler.supabase.com:6543`). |
| `GALX_VAULT_MASTER_SECRET` | Production, Preview, Dev | **Yes** | 32-byte cryptographic secret for BYOQ HKDF key derivation and AES-256-GCM. |
| `GALX_VAULT_KEY` | Production, Preview, Dev | **Yes** | Alias for master encryption secret. |
| `GALX_VAULT_ACTIVE_KEY_VERSION` | Production, Preview, Dev | **Yes** | Current active key version (`v1`). |
| `NEXT_PUBLIC_GALX_EDGE_URL` | Production, Preview, Dev | Optional | URL of Cloudflare Edge API gateway (`https://api.galx.ai`). |
| `PUBLIC_ASSETS_URL` | Production, Preview, Dev | Optional | URL of R2 multimodal assets CDN (`https://assets.galx.ai`). |
| `OPENAI_API_KEY` | Production, Preview, Dev | Optional | Root fallback API key for OpenAI models. |
| `XAI_API_KEY` | Production, Preview, Dev | Optional | Root fallback API key for xAI/Grok models. |
| `SUPABASE_POOL_SIZE` | Production, Preview, Dev | Optional | Serverless pg connection pool size (Default: `20`). |
| `SUPABASE_TIMEOUT_MS` | Production, Preview, Dev | Optional | Database request timeout in milliseconds (Default: `15000`). |

---

## 4. Deployment Methods

### Method A: Deploy via Vercel Git Integration (Recommended)

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the `GALXAI` repository.
4. Set the framework to **Next.js** (automatically detected).
5. In the **Environment Variables** accordion, paste the variables listed above.
6. Click **Deploy**.

---

### Method B: Deploy via Vercel CLI (or npm shortcuts)

1. **Authenticate Vercel CLI**:
   ```bash
   npx vercel login
   ```

2. **Synchronize Environment Variables**:
   ```bash
   npm run vercel:env:print   # Inspect masked variables
   npm run vercel:env:sync    # Push variables to Vercel
   ```

3. **Deploy Preview build**:
   ```bash
   npm run vercel:deploy
   ```

4. **Deploy Production build**:
   ```bash
   npm run vercel:deploy:prod
   ```

---

## 5. Custom Domain & DNS Setup (Cloudflare + Vercel)

If using Cloudflare DNS to proxy traffic to Vercel:

1. In **Vercel Project Settings > Domains**, add your domain (e.g. `galx.ai` and `www.galx.ai`).
2. In **Cloudflare Dashboard > DNS**:
   - **Apex Record (`@`)**: Add `A` record pointing to `76.76.21.21` (or CNAME flattening).
   - **Subdomain (`www`)**: Add `CNAME` pointing to `cname.vercel-dns.com`.
3. **Cloudflare SSL/TLS Settings**:
   - Set SSL mode to **Full (Strict)**.
   - Ensure WebSocket support is enabled under **Network > WebSockets**.

---

## 6. Post-Deployment Verification & Live Smoke Test
 
Run the automated live smoke test suite against your live Vercel deployment URL:
 
```bash
# Test against production or preview URL
npm run vercel:smoke -- --url=https://galx.ai
```
 
The automated smoke suite validates:
- [x] **Health Check & Telemetry**: Validates `/api/health` HTTP 200, version, and model catalog.
- [x] **Static Prerendering**: Verifies homepage HTML structure and page bundle delivery.
- [x] **Edge OpenGraph Generator**: Checks `/opengraph-image` dynamic image generation.
- [x] **Robots.txt & Sitemap**: Validates crawler directives and XML sitemap format.
- [x] **Perimeter Security Headers**: Confirms `X-Content-Type-Options`, `X-Frame-Options`, HSTS, and `Referrer-Policy`.
- [x] **OpenAI Models Catalog**: Validates `/v1/models` list and SWR edge cache headers.
- [x] **CORS Preflight**: Validates `OPTIONS /api/health` 204 handler.
- [x] **OpenSearch XML**: Checks browser URL bar search discovery at `/opensearch.xml`.
- [x] **Model RSS/Atom Feed**: Verifies XML syndicate feed at `/feed.xml`.
- [x] **RFC 9116 Vulnerability Disclosure**: Verifies `/.well-known/security.txt`.
- [x] **Individual Model Spec & SWR Caching**: Tests `/v1/models/[id]` edge response and headers.
