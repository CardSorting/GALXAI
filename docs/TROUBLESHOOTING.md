# 🔧 GALXAI Operational Playbook & Troubleshooting Guide

This guide details common status codes, error classifications, deployment diagnostic playbooks, and operational remedies when running or integrating with GALXAI.

---

## 🛑 Common Error Classifications

### 1. `tenant_pool_quota_capped` (HTTP 429)

```json
{
  "error": "Tenant 'client_abc' reached maximum simultaneous concurrent gateway allocation (20)"
}
```

- **Root Cause**: The client application launched more parallel concurrent requests than the fair-share ceiling allows ($20$ for standard tiers, $40$ for priority tiers).
- **Remedy**:
  - Implement a client-side concurrency semaphore or worker queue limit.
  - Upgrade the tenant key to Priority Tier in `/keys` to expand maximum simultaneous in-flight allocations.

---

### 2. `all_shards_cooldown` (HTTP 503)

```json
{
  "error": "All active shards for provider 'openai' are in cooldown or saturated at maximum capacity (10 concurrent)"
}
```

- **Root Cause**: Upstream provider experienced a global outage or dense 429 rate limit wave across all registered credentials simultaneously.
- **Remedy**:
  - Deposit additional credential shards via `/vault/deposit` to broaden pool capacity.
  - Enable `x-galx-allow-fallback: true` in your request headers to automatically fall back to adjacent models (e.g. `x-ai/grok-4.5`).

---

### 3. `GalxVaultDecryptionError` (HTTP 500)

```json
{
  "error": "Failed to authenticate ciphertext with provided AAD"
}
```

- **Root Cause**: Cryptographic envelope authentication failed. This occurs if ciphertext has been transplanted across tenants, or if `GALX_VAULT_MASTER_SECRET` was rotated without re-encrypting existing database records.
- **Remedy**:
  - Verify that `GALX_VAULT_MASTER_SECRET` in your `.env.local` or Vercel environment matches the key used during credential registration.
  - Run `npm run vault:populate` to test and re-verify your vault keys.
  - Re-deposit the affected shard credentials via `/vault/deposit`.

---

### 4. `HTTP 499 Client Closed Request` (Telemetry Log)

- **Root Cause**: The client disconnected or aborted an SSE stream before generation finished.
- **Behavior**: GALXAI's `ReadableStream` cancel handler immediately freed the shard lease and committed only the actual tokens decoded so far, preventing leaked concurrency slots.

---

### 5. Cloudflare Edge Gateway Status Codes (`api.galx.ai`)

#### A. `HTTP 401 Invalid API key format`
- **Root Cause**: The request `Authorization` header did not start with `Bearer galx_live_...` or `Bearer galx_test_...`.
- **Remedy**: Ensure valid API keys generated from `/keys` are passed in `Authorization: Bearer <key>` headers.

#### B. `HTTP 429 Edge rate limit exceeded`
- **Root Cause**: Rapid client burst triggered the edge PoP sliding-window rate limiter in `RATE_LIMIT_KV` (default 120 req/min per IP/Key).
- **Remedy**: Apply exponential backoff honoring the `Retry-After: 60` response header.

#### C. `Cloudflare Error 1014 (CNAME Cross-User Banned / SSL Pending)`
- **Root Cause**: Custom domain on R2 (`assets.galx.ai`) is awaiting Cloudflare Universal SSL issuance.
- **Remedy**: Run `npx wrangler r2 bucket domain list galxai-assets` to check SSL verification status.

---

## 🚀 Vercel Deployment & Build Troubleshooting

### 1. Pre-Flight Audit Gate Failures (`npm run deploy:check`)

#### Problem: `Cryptographic vault self-test failed`
- **Remedy**: Run `npm run vault:populate -- --fresh` to generate a valid 256-bit cryptographic secret and test the HKDF derivation roundtrip.

#### Problem: `Live HTTPS Ping to Supabase timed out`
- **Remedy**: Check that `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is set to `https://mazhcjisettrzbqhorvp.supabase.co`. Verify outgoing HTTPS port 443 connectivity.

#### Problem: `DATABASE_URL is not set to a pooler endpoint`
- **Remedy**: Ensure `DATABASE_URL` connects via Supabase Transaction Pooler (Port 6543):
  `postgresql://postgres.mazhcjisettrzbqhorvp:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

---

### 2. TypeScript Identifier Conflict in `worker-configuration.d.ts`

#### Problem: `Cannot find name 'KVNamespace'` or DOM global redefinition conflicts
- **Root Cause**: Running uncurated `wrangler types` dumped 15,000+ global lines colliding with TypeScript's standard DOM library.
- **Remedy**: Ensure `worker-configuration.d.ts` uses scoped dynamic import types:
  ```typescript
  type CloudflareKVNamespace = import('@cloudflare/workers-types').KVNamespace;
  type CloudflareR2Bucket = import('@cloudflare/workers-types').R2Bucket;
  type CloudflareDurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;
  ```
  Run `npx tsc --noEmit` to verify clean resolution with 0 errors.

---

### 3. Post-Deployment Smoke Test Failures (`npm run vercel:smoke`)

#### Problem: Smoke test fails on `/opengraph-image`
- **Remedy**: Verify that `export const runtime = 'edge'` is declared in OpenGraph route handlers and that Edge-compatible fonts are loaded via `fetch()`.

#### Problem: Live response security headers missing
- **Remedy**: Check that `next.config.ts` includes `securityHeaders` in `headers()` and that `vercel.json` is deployed.

---

## 📈 Monitoring & Health Checks

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `https://api.galx.ai/api/health` | `GET` | Edge PoP health probe & latency tracker. |
| `https://galx.ai/api/health` | `GET` | Next.js Vercel serverless diagnostic health & commit telemetry. |
| `/api/pool/stats` | `GET` | Snapshot of healthy, cooldown, and active shard counts. |
| `/api/pool/telemetry` | `GET` | Real-time sliding window latency percentiles ($P_{50}, P_{90}, P_{99}$), RPM, TPM, and error rates. |
| `https://api.galx.ai/v1/models` | `GET` | Live catalog of all 12 available models with active status and edge caching. |
| `/status` | `GET` | Interactive web dashboard of global fleet availability and response times. |
