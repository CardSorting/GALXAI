# 🔧 GALXAI Operational Playbook & Troubleshooting Guide

This guide details common status codes, error classifications, developer diagnostic playbooks, and operational remedies when integrating with or operating GALXAI.

---

## ⚡ Zero-Hesitation Quick Diagnostic Commands

Run instant diagnostic checks against the gateway in 0 milliseconds:

```bash
# 1. Measure edge Anycast roundtrip ping latency (<15ms expected)
$ npx galxai ping

# 2. Test 0ms model alias resolution
$ npx galxai resolve claude-3-7-sonnet

# 3. Test live streaming completion from flagship model
$ npx galxai "Say hello to GALXAI"

# 4. Run automated 98-test zero-hesitation verification suite
$ npx tsx scripts/verify-zero-hesitation-ergonomics.ts
```

---

## 🛑 Common Error Classifications & Remediation

### 1. `tenant_pool_quota_capped` (HTTP 429)
```json
{
  "error": "Tenant 'client_abc' reached maximum simultaneous concurrent gateway allocation (20)"
}
```
- **Root Cause**: The client launched more concurrent parallel requests than the tier allows.
- **Remedy**:
  - Implement a client-side concurrency semaphore or worker queue limit (`concurrency: 10`).
  - Upgrade the tenant key to Priority Tier in `/keys` to expand maximum simultaneous in-flight allocations.

---

### 2. `all_shards_cooldown` (HTTP 503)
```json
{
  "error": "All active shards for provider 'openai' are in cooldown or saturated at maximum capacity"
}
```
- **Root Cause**: Upstream provider experienced a global outage or dense 429 rate limit wave across all registered credentials simultaneously.
- **Remedy**:
  - Deposit additional credential shards via `/vault/deposit` to broaden pool capacity.
  - Enable `x-galx-allow-fallback: true` in your request headers to automatically fall back to adjacent models (e.g. `x-ai/grok-4.6`).

---

### 3. Authentication & Key Ingestion Issues (HTTP 401)
```json
{
  "error": "Invalid API key format"
}
```
- **Diagnostic Step**: Check the header or query parameter format.
- **Remedy**:
  - GALXAI accepts keys across multiple headers: `Authorization: Bearer <key>`, `x-api-key: <key>`, `x-galx-key: <key>`, `api-key: <key>`, or URL search parameters `?api_key=<key>`.
  - Ensure quotes around the key are stripped (the gateway automatically removes surrounding `'...'` and `"..."` quotes).

---

### 4. Unrecognized Model String or Alias Warnings
- **Diagnostic Step**: Test model resolution via `npx galxai resolve <your-string>`.
- **Behavior**: GALXAI strips provider namespaces (`openai/`, `x-ai/`, `anthropic/`, `@anthropic/`) and lifecycle suffixes (`:latest`, `-preview`, `-2026-08-01`).
- **Fallback**: Any completely unknown or empty model string automatically falls back to **`gpt-5.6-sol`** with zero 400 errors.

---

### 5. `GalxVaultDecryptionError` (HTTP 500)
```json
{
  "error": "Failed to authenticate ciphertext with provided AAD"
}
```
- **Root Cause**: Cryptographic envelope authentication failed. This occurs if ciphertext was transplanted across tenants, or if `GALX_VAULT_MASTER_SECRET` was rotated without re-encrypting existing database records.
- **Remedy**:
  - Verify that `GALX_VAULT_MASTER_SECRET` in `.env.local` matches the key used during credential registration.
  - Run `npm run vault:populate` to test and re-verify your vault keys.

---

### 6. Cloudflare Edge Gateway Status Codes (`api.galx.ai`)

#### A. `HTTP 429 Edge rate limit exceeded`
- **Root Cause**: Rapid client burst triggered the edge PoP sliding-window rate limiter in `RATE_LIMIT_KV` (default 120 req/min per IP/Key).
- **Remedy**: Apply exponential backoff honoring the `Retry-After: 60` response header.

#### B. `Cloudflare Error 1014 (CNAME Cross-User Banned / SSL Pending)`
- **Root Cause**: Custom domain on R2 (`assets.galx.ai`) is awaiting Cloudflare Universal SSL issuance.
- **Remedy**: Run `npx wrangler r2 bucket domain list galxai-assets` to check SSL verification status.

---

## 🚀 Pre-Flight Verification & Build Troubleshooting

### 1. Pre-Flight Audit Gate Failures (`npm run deploy:check`)

#### Problem: `Cryptographic vault self-test failed`
- **Remedy**: Run `npm run vault:populate -- --fresh` to generate a valid 256-bit cryptographic secret and test the HKDF derivation roundtrip.

#### Problem: `Live HTTPS Ping to Supabase timed out`
- **Remedy**: Check that `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is set to `https://mazhcjisettrzbqhorvp.supabase.co`. Verify outgoing HTTPS port 443 connectivity.

#### Problem: `DATABASE_URL is not set to a pooler endpoint`
- **Remedy**: Ensure `DATABASE_URL` connects via Supabase Transaction Pooler (Port 6543):
  `postgresql://postgres.mazhcjisettrzbqhorvp:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

---

## 🧪 Verification Commands Matrix

| Verification Suite | Target Validation Scope | Execution Command |
| :--- | :--- | :--- |
| **Zero-Hesitation Ergonomics** | Multi-mental-model absorption, CLI, GET queries, aspect ratios, fallbacks | `npx tsx scripts/verify-zero-hesitation-ergonomics.ts` (98 tests) |
| **Universal Router & Privacy** | AES-256-GCM vault, BroccoliDB, ZDR v10.0, SOC 2 Type II audit | `npm run test:router` (177 tests) |
| **Cloudflare Edge Mesh** | Zero-egress edge gateway, R2 CDN routes, SWR caching | `npm run worker:test` (46 tests) |
| **TypeScript Compilation** | Static typing across serverless & worker runtimes | `npx tsc --noEmit` (0 errors) |
| **Production App Router** | Production bundle generation across all routes | `npm run build` |
