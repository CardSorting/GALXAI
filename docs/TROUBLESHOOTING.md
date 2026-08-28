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

### 7. Ingestion Gateway & Transport Hardening Errors (`/api/auth/ingest`)

#### A. `HTTP 415 Unsupported Media Type`
- **Root Cause**: Request did not provide `Content-Type: application/json`.
- **Remedy**: Ensure the HTTP client attaches `-H "Content-Type: application/json"`.

#### B. `HTTP 409 NONCE_REPLAYED`
- **Root Cause**: The single-use `X-Request-Nonce` was transmitted more than once within the 10-minute anti-replay sliding window.
- **Remedy**: Generate a unique cryptographically random hex nonce (e.g. `crypto.randomBytes(16).toString('hex')`) per ingestion flight.

#### C. `HTTP 400 INTEGRITY_CHECK_FAILED`
- **Root Cause**: The `Digest: sha-256=<base64>` header does not match the computed SHA-256 hash of the request body.
- **Remedy**: Compute the SHA-256 digest of the exact raw serialized JSON string:
  ```typescript
  const digest = `sha-256=${crypto.createHash('sha256').update(rawBody).digest('base64')}`;
  ```

#### D. `HTTP 503 INGESTION_SATURATED`
- **Root Cause**: In-flight ingestion backpressure circuit breaker reached maximum capacity (100 simultaneous requests).
- **Remedy**: Honor the `Retry-After: 5` header and apply exponential backoff.

#### E. `auth_exchange_failed` in `/auth/callback`
- **Root Cause**: Supabase OAuth authorization code expired, was already consumed, or PKCE verifier cookie was blocked.
- **Remedy**:
  - Ensure browser cookies are enabled for third-party OAuth redirect flows.
  - Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured in `.env.local`.

---

---

### 8. BroccoliDB Compaction & Ingestion Gateway Errors (`/api/audit/broccolidb/compact`)

#### A. `fidelityStatus: "fallback"` (Compaction reverted with 0 tokens saved)
- **Root Cause**: The fail-closed factual grounding gate in `BroccoliCompactionSafety` detected an ungrounded number, currency figure, date, percentage, BIC, or identifier in the compacted text that did not match the original source input.
- **Diagnostic Step**: Inspect the `unsupportedFacts` array in the response:
  ```json
  {
    "fidelityStatus": "fallback",
    "unsupportedFacts": ["3.8 bar", "2032-04-14"]
  }
  ```
- **Remedy**:
  - The fallback is an intentional safety guarantee preventing hallucinated facts.
  - If the fact is valid but missing from extraction, update the domain compactor's regex to extract the field verbatim.

#### B. `HTTP 413 Payload Too Large` (`PAYLOAD_TOO_LARGE`)
- **Root Cause**: Payload exceeded the 10MB limit (`MAX_PAYLOAD_BYTES`), or input string exceeded the 2,000,000 character limit (`MAX_TEXT_LENGTH`).
- **Remedy**: Chunk large document bundles into <2MB partitions or use `mode: "incident"` / `mode: "batch"` with streaming micro-digests.

#### C. `HTTP 400 Bad Request` (`BAD_REQUEST` / `EMPTY_PAYLOAD`)
- **Root Cause**: Request body is empty, invalid JSON, or missing required fields (`text`, `rawStreamText`, or `items`).
- **Remedy**: Verify the JSON payload structure matches the requested mode (`domain`, `batch`, `incident`, `document`).

#### D. `HTTP 401 Unauthorized` (`UNAUTHORIZED`)
- **Root Cause**: In production (`NODE_ENV === 'production'`), the endpoint requires valid authentication via `Authorization: Bearer <key>`, `x-api-key`, or `x-galx-key`.
- **Remedy**: Pass a valid developer key or session token.

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
| **Inference Boundary Benchmark** | Head-to-head empirical testing on OpenAI models (`gpt-4o`, `gpt-4o-mini`, `o3-mini`) | `npm run bench:inference-boundary` |
| **BroccoliDB Compaction API** | Safe facade boundary, GET/POST/OPTIONS routes, 19 modes, bounds & auth gates | `npm run test:broccolidb:api` (7 tests) |
| **BroccoliDB Hardening Suite** | Memory bounds, slab safety, collision-safe memoization, fail-closed safety | `npm run test:broccolidb:hardening` |
| **180-Domain Master Suite** | 180 enterprise industry domain compactors across 21 clusters | `node --import tsx scripts/test-broccolidb-150-domain-suite.ts` |
| **Zero-Hesitation Ergonomics** | Multi-mental-model absorption, CLI, GET queries, aspect ratios, fallbacks | `npx tsx scripts/verify-zero-hesitation-ergonomics.ts` (98 tests) |
| **Universal Router & Ingestion** | AES-256-GCM vault, BroccoliDB, ZDR v10.0, RFC 9530 transport, SOC 2 Type II audit | `npm run test:router` (218 tests) |
| **Cloudflare Edge Mesh** | Zero-egress edge gateway, R2 CDN routes, SWR caching | `npm run worker:test` (46 tests) |
| **TypeScript Compilation** | Static typing across serverless & worker runtimes | `npx tsc --noEmit` (0 errors) |
| **Production App Router** | Production bundle generation across all routes | `npm run build` |



