# 🔧 GALXAI Operational Playbook & Troubleshooting Guide

This guide details common status codes, error classifications, and operational remedies when running or integrating with GALXAI.

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

- **Root Cause**: Cryptographic envelope authentication failed. This occurs if ciphertext has been transplanted across tenants, or if `GALX_MASTER_SECRET_KEY` was rotated without re-encrypting existing database records.
- **Remedy**:
  - Verify that `GALX_MASTER_SECRET_KEY` in your environment matches the key used during credential registration.
  - Re-deposit the affected shard credentials via `/vault/deposit`.

---

### 4. `HTTP 499 Client Closed Request` (Telemetry Log)

- **Root Cause**: The client disconnected or aborted an SSE stream before generation finished.
- **Behavior**: GALXAI's `ReadableStream` cancel handler immediately freed the shard lease and committed only the actual tokens decoded so far, preventing leaked concurrency slots.

---

## 📈 Monitoring & Health Checks

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/pool/stats` | `GET` | Instant snapshot of healthy, cooldown, and active shard counts. |
| `/api/pool/telemetry` | `GET` | Real-time sliding window latency percentiles ($P_{50}, P_{90}, P_{99}$), RPM, TPM, and error rates. |
| `/v1/models` | `GET` | Live catalog of all 12 available models with active status. |
| `/status` | `GET` | Interactive web dashboard of global fleet availability and response times. |
