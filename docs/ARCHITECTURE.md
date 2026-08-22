# 🏛️ GALXAI Architecture Specification

This document provides a comprehensive technical breakdown of the GALXAI universal AI routing gateway, high-concurrency quota cycling substrate, cryptographic vault, and resilience topologies.

---

## 🏗️ System Overview

GALXAI sits between downstream client applications (chat interfaces, agentic swarms, SDKs, IDEs) and upstream foundation model providers (OpenAI, xAI Grok). It abstracts distributed, sharded API credentials into a unified compute layer with continuous capacity management and transparent failover.

```mermaid
flowchart TD
    Client[Client Application / SDK / Agent Swarm] -->|Bearer galx_live_...| Gateway[GALXAI Universal Gateway]
    
    subgraph Gateway Core
        Auth[API Key Authenticator] --> RateGov[Continuous Token-Bucket Rate Governor (ADR 0002)]
        RateGov --> Router[GalxModelRouter (ADR 0001)]
        
        Router --> Pool[GalxCredentialPool & TASD (ADR 0008)]
        Pool --> Breaker[4-State Circuit Breaker (ADR 0004 & 0009)]
        Pool --> Vault[GalxCryptoVault AES-256-GCM + AAD (ADR 0003)]
        Pool --> Substrate[GalxCredentialSubstrate]
        
        Router --> Metrics[GalxMetricsEngine Ring Buffer (ADR 0005)]
    end
    
    subgraph Upstream Fleet
        Router -->|Decrypted Shard Lease| OA[OpenAI Fleet: gpt-5.6-*, dalle-*]
        Router -->|Decrypted Shard Lease| Grok[xAI Grok Fleet: grok-4.5, grok-image]
    end
```

---

## 🏛️ Architectural Decision Records (ADRs) Mapping

All architectural components in GALXAI are governed by formal Architectural Decision Records located in [`docs/adr/`](adr/README.md):

| Component | ADR Reference | Core Innovation & Mechanism |
| :--- | :--- | :--- |
| **Universal Quota Substrate** | [ADR 0001](adr/0001-unified-pooled-quota-cycling-substrate.md) | Single pooled compute fleet, eliminating quota fragmentation and 429 errors. |
| **Rate Governor & Token Calculus** | [ADR 0002](adr/0002-two-phase-token-reservation-and-rate-governance.md) | Microsecond fractional replenishment + 2-Phase atomic token reservation. |
| **Cryptographic Vault** | [ADR 0003](adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md) | AES-256-GCM authenticated envelope encryption with tenant signature AAD binding. |
| **Circuit Breaker FSM** | [ADR 0004](adr/0004-four-state-circuit-breaker-and-failover-topology.md) | 4-state finite state machine (Healthy/Cooldown/Exhausted/Dead) for sub-15ms failover. |
| **Telemetry Ring Buffer** | [ADR 0005](adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md) | Zero-allocation circular ring buffers for P50/P90/P99 latency & EWMA routing bias. |
| **Economic Arbitrage & Caching** | [ADR 0006](adr/0006-intelligent-multi-tiered-discount-strategy.md) | Consolidated Tier-5 wholesale volume capture with 100% prompt caching rebate pass-through. |
| **Proof-of-Deposit Security Gate** | [ADR 0007](adr/0007-proof-of-deposit-and-50pct-match-paywall-gate.md) | Anti-Sybil $10 deposit proof gate matched with $5 introductory bonus ($15 total compute). |
| **Tenant-Affinity Shard Dispersion**| [ADR 0008](adr/0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md) | TASD algorithm to disperse agent swarm bursts across distinct physical shards. |
| **Half-Open Canary & Scavenger** | [ADR 0009](adr/0009-half-open-canary-traffic-warming-and-lease-scavenger.md) | 4-phase canary recovery warming + automated lease scavenger for orphaned streaming reservations. |

---

## 🔄 Request Lifecycle & Routing Workflow

1. **Ingress & Authentication**:
   - The client issues an HTTP request to `/v1/chat/completions` or `/v1/images/generations` with `Authorization: Bearer galx_live_...`.
   - The key hash is verified against stored developer keys with SHA-256 prefix matching.
   - Proof-of-deposit verification confirms active wallet balance (ADR 0007).

2. **Model Resolution & Canonical Normalization**:
   - `ModelCatalog.resolveModel(modelId)` normalizes aliases (e.g. `"sol"` $\to$ `"gpt-5.6-sol"`, `"grok"` $\to$ `"x-ai/grok-4.5"`) and verifies feature support (streaming, reasoning, vision).

3. **Atomic Execution Lease Acquisition (2-Phase Commit, P-AHT & TASD Leveling)**:
   - The router requests a lease from `GalxCredentialPool.acquireLease`.
   - **Filter**: 4-State Circuit Breaker filters out `cooldown`, `exhausted`, `dead`, and saturated shards.
   - **Score**: Shards are ranked via **Predictive Adaptive Hydraulic Headroom (P-AHT)** with Tenant-Affinity Shard Dispersion:
     $$S_i = \left( R_i \right)^{1.2} \times C_i \times H_i \times D_i \times L_i \times W_i \times P_i \times M_i \times T_i + \epsilon_i$$
     Where $R_i$ is post-allocation headroom, $C_i$ is power-law concurrency damping, $M_i$ is predictive drain avoidance (`MDA-Floor`), $T_i$ is Tenant-Affinity Shard Dispersion (`TASD`), and $\epsilon_i$ is micro-jitter.
   - **Phase 1 (Reservation)**: The estimated token capacity is soft-reserved in the selected shard's token bucket.
   - Monotonic fencing token is generated to protect against stale worker execution.
   - Background lease scavenger continuously sweeps expired leases and reclaims orphaned soft token reservations.

4. **Cryptographic Vault Decryption & AAD Verification**:
   - Ciphertext is decrypted via `GalxCryptoVault.decryptSecret` using the bound AAD tuple `tenantUid:shardId:provider`.
   - The plaintext API key is kept in ephemeral RAM only.

5. **Upstream Dispatch & Header Ingestion**:
   - Request is dispatched to the upstream provider adapter (`OpenAIAdapter` or `GrokAdapter`).
   - If upstream returns HTTP 429 or 503, the circuit breaker enters `cooldown`, the lease is released, and the router transparently retries with the next candidate shard in $< 15\text{ms}$.

6. **Streaming & Completion (Phase 2 Commit)**:
   - For SSE streams, chunks pass through `wrapStreamingResponse`, decoding token count and monitoring client disconnects.
   - Upon completion or stream cancelation, `pool.releaseLease` commits actual token consumption, recalculates EWMA latency, and reconciles upstream `x-ratelimit-*` headers.

7. **Ephemeral Scrubbing**:
   - Plaintext secret memory buffers in RAM are zeroized (`zeroizeBuffer`) in the `finally` block.

---

## 🔒 Security Architecture

| Security Domain | Implementation | Guarantee |
| :--- | :--- | :--- |
| **Credential Encryption** | AES-256-GCM with 96-bit random IV | Confidentiality and integrity of upstream API keys |
| **AAD Envelope Binding** | `tenantId:shardId:provider` bound to tag | Prevents cross-tenant ciphertext transplantation |
| **RAM Scrubbing** | `buf.fill(0)` via `zeroizeBuffer` | Zero plaintext leakage in heap dumps |
| **Monotonic Fencing** | Incremental `fencingToken` per lease | Eliminates split-brain races on worker timeouts |
| **Instant Retraction** | Synchronous memory purge & lease invalidation | Purges revoked credentials in $< 40\text{ms}$ |
| **Anti-Sybil Proof-of-Deposit** | $10 deposit proof gate | 100% protection against key harvesting bot swarms |

---

## 📊 Telemetry & Health Engine

- **Ring Buffer Size**: Fixed 2,000-sample array ring buffer (`GalxMetricsEngine`).
- **Percentiles**: Calculates $P_{50}, P_{90}, P_{99}$ latency over sliding 5-minute windows.
- **Throughput Telemetry**: Requests Per Minute (RPM), Tokens Per Minute (TPM), and Error Rates broken down by provider (`openai` vs `xai-grok`) and model.
