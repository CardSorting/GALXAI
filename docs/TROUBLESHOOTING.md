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

#### E. Context Dilation on Clean/Small Prompts (`DENSITY_OVERHEAD`)
- **Root Cause**: Forcing a small, clean prompt (<200 tokens) into a complex hierarchical summary structure can bloat token size (e.g. 94 tokens $\to$ 289 tokens).
- **Remedy**: Use `BroccoliCompactionFacade.selectRepresentation()`. The built-in **Adaptive Density Gate** (ADR 0067) will automatically invoke the **Identity Operator** ($\text{ID}(C)$) passing the prompt through verbatim ($0.0\%$ overhead, $100\%$ baseline preservation).

#### F. Conflicting Authority & Stale Deprecated ADRs (`INSTITUTIONAL_ENTROPY`)
- **Root Cause**: Legacy repositories contain contradictory historical guidance (e.g. superseded `HS256` instructions or deprecated start scripts) that mislead LLMs.
- **Remedy**: Route via `BroccoliCompactionFacade.selectRepresentation({ taskType: 'architecture_invariants' })` to filter out archival minutes and superseded RFCs while preserving active cryptographic invariants (`RS256`, `v2` keys), memory safety (`zeroizeBuffer`), and runtime rules (`runtime = 'edge'`). Verify via `npm run bench:entropy`.

---

## ⚡ 4. Rolling Context & Seat Quota Troubleshooting

### A. `seat_quota_exceeded` (HTTP 429)
```json
{
  "error": "You have exhausted your 5-hour limit (0% remaining). It will fully refresh in 2 hours, 14 minutes."
}
```
- **Root Cause**: The user's sliding 5-hour burst quota has been completely consumed.
- **Remedy**: Wait for the sliding window to replenish, or upgrade the user's seat entitlement tier (`developer` $\to$ `small_business` $\to$ `enterprise` $\to$ `apex`).

### B. `orphaned_tool_message` / `incomplete_tool_sequence` (HTTP 400)
```json
{
  "error": "Tool message at index 5 does not follow an assistant message with tool_calls"
}
```
- **Root Cause**: A custom client pruned intermediate conversational turns and severed the assistant message containing `tool_calls` from the matching `tool` result message.
- **Remedy**: Ensure `GalxRollingContextEngine.ensureAtomicTurnPairs` is enabled or pass unbroken tool turn sequences. The normalizer automatically preserves assistant tool calls and results together.

### C. `seat_lease_timeout` (HTTP 504)
- **Root Cause**: An active stream hung or network connection was severed without sending an explicit disconnect, leaving an in-flight reservation in `galx_seat_request_leases`.
- **Remedy**: Leases expire automatically after their TTL (`180s`). For immediate cleanup, call `fn_release_seat_request_lease`.

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

---

### 9. Upstream Provider Wire & Multi-Account Shard Diagnostics (ADR 0111–0112)

#### A. `missing_scope: model.request` (HTTP 401)
- **Error Response**:
  ```json
  {
    "error": {
      "message": "You have insufficient permissions for this operation. Missing scopes: model.request.",
      "code": "missing_scope"
    }
  }
  ```
- **Root Cause**: An upstream ChatGPT OAuth session token (Client ID `app_EMoamEEZ73f0CkXaXp7hrann`) was forwarded to `https://api.openai.com/v1/chat/completions`. ChatGPT session tokens only have `openid profile email offline_access` scopes and are rejected by OpenAI's standard REST API.
- **Remedy**:
  - Do NOT forward ChatGPT session tokens to `api.openai.com/v1/chat/completions`.
  - The router automatically executes these credentials over native WebSocket: `wss://chatgpt.com/backend-api/codex/responses`.
  - Test live WebSocket connectivity using `npx tsx scripts/manage-shards.ts --test`.

#### B. `refresh_token_invalidated`
- **Root Cause**: An OAuth refresh token was revoked by OpenAI or superseded by an out-of-band re-authentication.
- **Remedy**:
  - Run `npx tsx scripts/manage-shards.ts --list` to inspect all active and invalid shards.
  - Remove stale shards: `npx tsx scripts/manage-shards.ts --remove <shard_id>`.
  - Ingest fresh tokens: `npx tsx scripts/manage-shards.ts --add --token <jwt> --account <id> --email dev@galx.ai`.

#### C. `all_shards_cooldown` or 429 Quota Saturation
- **Root Cause**: All enrolled accounts in the pool have consumed their 40 requests within the current 3-hour sliding window.
- **Behavior**: When a shard hits 429, `GalxCredentialPool` isolates it to `cooldown/exhausted` and fails over instantly to the next healthy shard with monotonic fencing tokens (`#1, #2...`).
- **Remedy**:
  - Check remaining quota per shard: `npx tsx scripts/manage-shards.ts --list`.
  - Add more shards to the pool: `npx tsx scripts/manage-shards.ts --import` or `--add`.
  - Verify rotation and failover: `npx tsx scripts/manage-shards.ts --cycle 4`.

#### D. Premature Timeouts During Multi-Thousand-Token Code Synthesis
- **Root Cause**: Complex reasoning tasks (such as generating multi-file TypeScript microservices or HTML5 games) stream delta tokens over WebSocket for 40–80+ seconds. Static TTFT timers will kill the socket mid-stream.
- **Remedy**:
  - In `OpenAIAdapter.ts`, the `refreshChunkTimer` automatically resets the activity timer upon every incoming delta chunk (`response.output_text.delta`).
  - Configure custom deadlines via `options.deadline.intraChunkTimeoutMs` (defaults to 45,000ms per chunk).

---

## 🧪 Verification Commands Matrix

| Verification Suite | Target Validation Scope | Execution Command |
| :--- | :--- | :--- |
| **Real Inference Pipeline** | 8-phase end-to-end live wire execution (Streaming SSE, Non-streaming synthesis, Wallet hold, Key revocation) | `npx tsx scripts/test-inference-pipeline.ts --fast` |
| **Fleet Shard Prober** | Live wire health probe across `wss://chatgpt.com/backend-api/codex/responses` (200 OK ~1.2s) | `npx tsx scripts/manage-shards.ts --test` |
| **Fleet Multi-Shard Cycle** | SWRR lease rotation and monotonic fencing token verification across pooled shards | `npx tsx scripts/manage-shards.ts --cycle 4` |
| **Maintainer Onboarding** | 8-Point Workstation Diagnostic (Node, Vault, Safety, Docs, Git Hooks) | `npm run onboard` |
| **Institutional Entropy Benchmark** | 7-Tier Progressive Entropy Gradient & 7 Adversarial Traps (ADR 0066/0067) | `npm run bench:entropy` |
| **Inference Boundary Benchmark** | Head-to-head empirical testing on OpenAI models (`gpt-4o`, `gpt-4o-mini`, `o3-mini`) | `npm run bench:inference-boundary` |
| **Chat Context Hardening Suite** | Request normalizer, tool turn pairs, dynamic output bounds, RRF search | `npx tsx scripts/test-chat-context-hardening.ts` (21 assertions) |
| **Paranoid Supabase Linter** | 53 migration audit, 53 paired .down.sql rollbacks, RLS & search_path check | `npm run db:verify` |
| **Live Database Test Suite** | 92 zero-egress database integration tests on Supabase | `npm run db:test` |
| **BroccoliDB Compaction API** | Safe facade boundary, GET/POST/OPTIONS routes, 19 modes, bounds & auth gates | `npm run test:broccolidb:api` (7 tests) |
| **BroccoliDB Hardening Suite** | Memory bounds, slab safety, collision-safe memoization, fail-closed safety | `npm run test:broccolidb:hardening` |
| **180-Domain Master Suite** | 180 enterprise industry domain compactors across 21 clusters | `npm run bench:180-domains` |
| **Compactor Scaffolding CLI** | Interactive generator for new domain compactors | `npm run scaffold:compactor` |
| **Git Invariant Hooks** | Pre-commit (`tsc`) and commit-msg (`Conventional Commits`) hooks | `npm run hooks:install` |
| **Zero-Hesitation Ergonomics** | Multi-mental-model absorption, CLI, GET queries, aspect ratios, fallbacks | `npx tsx scripts/verify-zero-hesitation-ergonomics.ts` (98 tests) |
| **Universal Router & Ingestion** | AES-256-GCM vault, BroccoliDB, ZDR v10.0, RFC 9530 transport, SOC 2 Type II audit | `npm run test:router` (218 tests) |
| **Cloudflare Edge Mesh** | Zero-egress edge gateway, R2 CDN routes, SWR caching | `npm run worker:test` (46 tests) |
| **TypeScript Compilation** | Static typing across serverless & worker runtimes | `npx tsc --noEmit` (0 errors) |
| **Production App Router** | Production bundle generation across all routes | `npm run build` |




