# 🔧 Maintainer Debugging & Diagnostic Runbooks

> **Target Audience**: SRE On-Call Engineers, Core Maintainers, and Incident Responders.  
> **Purpose**: Fast-triage decision trees, log analysis recipes, and emergency remediation runbooks for platform maintainers.

---

## 📑 Diagnostic Scenarios

1. [Diagnostic 1: Cryptographic Decryption Failure (HTTP 500)](#diagnostic-1-cryptographic-decryption-failure-http-500)
2. [Diagnostic 2: Compaction Fidelity Warning or Fallback](#diagnostic-2-compaction-fidelity-warning-or-fallback)
3. [Diagnostic 3: Upstream Rate Limit Spike (HTTP 429)](#diagnostic-3-upstream-rate-limit-spike-http-429)
4. [Diagnostic 4: PostgreSQL Connection Pool Thrashing](#diagnostic-4-postgresql-connection-pool-thrashing)
5. [Diagnostic 5: Edge KV Rate Limit Desynchronization](#diagnostic-5-edge-kv-rate-limit-desynchronization)

---

## Diagnostic 1: Cryptographic Decryption Failure (HTTP 500)

### 🚨 Symptoms
- Client receives `500 Internal Server Error` with code `VAULT_DECRYPTION_FAILED`.
- Server logs show `GalxVaultDecryptionError: Authenticated data mismatch`.

### 🔍 Cause
The Authenticated Associated Data (AAD) tuple `${tenantUid}:${shardId}:${provider}` or the master encryption seed does not match the parameters used during encryption.

### 🛠️ Remediation Steps
1. **Check Environment Master Secret**:
   ```bash
   echo $GALX_VAULT_MASTER_SECRET
   ```
   Ensure the seed matches between Vercel serverless containers and Cloudflare Edge workers.
2. **Verify AAD Registration in PostgreSQL**:
   Inspect the row in `galx_provider_shards`:
   ```sql
   SELECT id, tenant_uid, provider, key_version FROM galx_provider_shards WHERE id = 'shard_123';
   ```
3. **Execute Local Crypto Test**:
   ```bash
   npx tsx scripts/populate-vault-secrets.ts
   ```

---

## Diagnostic 2: Compaction Fidelity Warning or Fallback

### 🚨 Symptoms
- Compaction endpoint returns `fidelityStatus: "fallback"` with non-empty `unsupportedFacts`.
- Client response is uncompressed raw source text instead of compacted output.

### 🔍 Cause
`BroccoliCompactionSafety` detected an extracted fact (e.g. a dollar amount, percentage, date, or identifier) that was present in the output digest but could not be grounded in the input text.

### 🛠️ Remediation Steps
1. **Run Payload Dissection Tool**:
   ```bash
   npx tsx scripts/dissect-payloads-and-causal-analysis.ts
   ```
2. **Inspect Domain Regex/Parser**:
   Open the corresponding domain compactor in `src/core/broccolidb/` and verify that the regex accurately hoists the specific field.
3. **Verify Safety Gate**:
   ```bash
   npm run test:broccolidb:hardening
   ```

---

## Diagnostic 3: Upstream Rate Limit Spike (HTTP 429)

### 🚨 Symptoms
- High rate of HTTP 429 errors from upstream providers (`openai` or `xai`).
- Latency spikes on active streaming connections.

### 🔍 Cause
A tenant's request volume exceeded the available soft reservation capacity in the `GalxCredentialPool` or an upstream foundation model shard reached its Tier-5 TPM ceiling.

### 🛠️ Remediation Steps
1. **Inspect Shard Fleet Health**:
   ```bash
   npm run playbook -- --stage=traffic
   ```
2. **Verify Circuit Breaker Auto-Failover**:
   Check if the circuit breaker transitioned the failing shard to `COOLDOWN` and routed traffic to secondary fallback shards.
3. **Enable Aggressive Input Compaction**:
   Ensure incoming client requests set the header `x-galx-compact: true` to compress input prompt volume by up to $85.93\%$, preserving $3.3\times$ TPM headroom.

---

## Diagnostic 4: PostgreSQL Connection Pool Thrashing

### 🚨 Symptoms
- Serverless API routes return `ETIMEDOUT` or `remaining connection slots are reserved`.

### 🛠️ Remediation Steps
1. **Verify PgBouncer Port 6543**:
   Ensure `DATABASE_URL` specifies port `6543` with `?pgbouncer=true` rather than direct port `5432`.
2. **Verify Edge Micro-Metering**:
   Ensure Cloudflare Edge Workers aggregate token deductions using `fn_batch_draw_wallet_tokens_cf` rather than single-row writes.
3. **Run Supabase Schema Verifier**:
   ```bash
   npm run db:verify
   ```

---

## Diagnostic 5: Seat Request Lease Contention & Orphaned Stream Leases

### 🚨 Symptoms
- Client receives `HTTP 429 concurrency_limit_exceeded` or `seat_lease_timeout` despite low active stream counts.

### 🔍 Cause
An unhandled client disconnect or network interruption terminated a stream without completing `fn_settle_seat_stream_completion_composite_v2`, leaving an active reservation in `galx_seat_request_leases`.

### 🛠️ Remediation Steps
1. **Automatic TTL Resolution**:
   Leases expire automatically after their TTL (`180s`). Active streams are freed automatically.
2. **Execute Manual Lease Release**:
   ```sql
   SELECT fn_release_seat_request_lease('lease_uuid_here');
   ```
3. **Verify Concurrency Semaphore in Test Suite**:
   ```bash
   npx tsx scripts/test-chat-context-hardening.ts
   ```

---

## Diagnostic 6: Tool Turn-Pair Compaction Boundary Invariant Failures

### 🚨 Symptoms
- Upstream provider rejects chat completion with HTTP 400 (`orphaned_tool_message` or `tool_use_id without matching tool_result`).

### 🔍 Cause
A client or custom compaction strategy severed an `assistant` message containing `tool_calls` from its subsequent `tool` execution response across sliding window boundaries.

### 🛠️ Remediation Steps
1. **Verify `ensureAtomicTurnPairs`**:
   Ensure `GalxRollingContextEngine.buildOptimalRollingContext` executes `ensureAtomicTurnPairs` to shift compaction boundaries leftward to enclose assistant triggers.
2. **Run Request Normalizer Verification**:
   ```bash
   npx tsx scripts/test-chat-context-hardening.ts
   ```

---

*For full operational playbooks, see [../playbooks/README.md](../playbooks/README.md).* 🥦🔧🚀
