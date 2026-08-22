# GALXAI Architecture Decision Records (ADRs)

This directory contains the formal Architectural Decision Records (ADRs) that govern the design, cryptographic security, high-throughput routing algorithms, and economic models of the GALXAI platform.

---

## 🏛️ ADR Master Index

| ADR # | Title | Category | Status | Impact / Core Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **[ADR 0001](0001-unified-pooled-quota-cycling-substrate.md)** | Unified Pooled Quota Cycling Substrate | **Routing & Pool** | `Accepted` | Unifies distributed API credentials into a single transparent compute pool. |
| **[ADR 0002](0002-two-phase-token-reservation-and-rate-governance.md)** | 2-Phase Token Reservation & Continuous Calculus Rate Governance | **Rate Governance** | `Accepted` | Prevents concurrency stampedes via continuous microsecond token replenishment. |
| **[ADR 0003](0003-aes-256-gcm-envelope-encryption-with-aad-binding.md)** | AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing | **Security & Vault** | `Accepted` | Cryptographically binds ciphertexts to tenant signatures with zero-memory traces. |
| **[ADR 0004](0004-four-state-circuit-breaker-and-failover-topology.md)** | 4-State Circuit Breaker & Sub-15ms Failover Topology | **Resilience** | `Accepted` | Finite state machine (Healthy/Cooldown/Exhausted/Dead) for sub-15ms failover. |
| **[ADR 0005](0005-circular-buffer-telemetry-and-ewma-latency-scoring.md)** | Zero-Allocation Circular Ring Buffer Telemetry & EWMA Latency | **Telemetry** | `Accepted` | Garbage-collection-free histogram tracking with P50/P90/P99 latency calculations. |
| **[ADR 0006](0006-intelligent-multi-tiered-discount-strategy.md)** | Intelligent Multi-Tiered Discount & 75% Prompt-Caching Strategy | **Economics** | `Accepted` | Captures wholesale volume pricing and passes 100% of prompt caching rebates. |
| **[ADR 0007](0007-proof-of-deposit-and-50pct-match-paywall-gate.md)** | Proof-of-Deposit Security Gate & 50% Match Paywall Architecture | **Security & GTM** | `Accepted` | Gates key generation behind refundable $10 deposit matched with $5 free bonus ($15 total). |
| **[ADR 0008](0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md)** | Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom | **Routing & Swarms**| `Accepted` | Prevents agent swarm hot-spotting and levels token capacity across shards. |
| **[ADR 0009](0009-half-open-canary-traffic-warming-and-lease-scavenger.md)** | 4-Phase Half-Open Canary Traffic Warming & Background Scavenger | **Resilience** | `Accepted` | Eliminates recovery flapping and reclaims orphaned streaming reservations. |
| **[ADR 0010](0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md)** | CloudTasks & CloudRun Inspired Asynchronous Queue Substrate | **Queue & Async** | `Accepted` | Decouples heavy agentic workloads with token-bucket dispatching, Cloud Run push webhooks, and DLQs. |
| **[ADR 0011](0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md)** | Directed Acyclic Graph (DAG) Workflows & Real-Time Event Streaming | **Orchestration** | `Accepted` | Sub-millisecond SSE push streaming, Fan-In DAG dependencies, destination circuit breakers, and priority aging. |
| **[ADR 0012](0012-universal-developer-sdk-and-ergonomics-substrate.md)** | Universal Developer SDK & Developer Experience (DX) Substrate | **Developer SDK** | `Accepted` | Universal zero-dependency client with OpenAI parity, async queues, and typed error hierarchy. |
| **[ADR 0013](0013-fluent-builders-structured-outputs-and-dx-ergonomics.md)** | Fluent Builders, Structured Outputs & DX Ergonomics Substrate | **DX Ergonomics** | `Accepted` | Fluent prompt builders, Zod/JSON schema extraction, Vercel AI SDK adapters, and batch swarm runners. |
| **[ADR 0014](0014-apex-agent-runtime-middleware-and-resilience-substrate.md)** | Apex Agent Runtime, Middleware & Resilience Substrate | **Agent Runtime** | `Accepted` | Autonomous multi-step tool loops, pluggable middleware pipeline, LRU caching, and model fallback cascades. |
| **[ADR 0015](0015-zero-egress-cloudflare-workers-edge-compute-mesh.md)** | Zero-Egress Cloudflare Workers Edge Compute Mesh | **Edge Mesh** | `Accepted` | Offloads token streaming and queue execution to Cloudflare Workers for $0 egress bandwidth costs. |
| **[ADR 0016](0016-authoritative-supabase-postgresql-substrate.md)** | Authoritative Supabase PostgreSQL Substrate | **Data Layer** | `Accepted` | Authoritative PostgreSQL single source of truth for ACID ledgers, AES-256-GCM shards, and pgvector. |
| **[ADR 0017](0017-high-throughput-binary-wire-and-rpc-micro-batching.md)** | High-Throughput Binary Wire Protocol & RPC Micro-Batching | **Wire & Batch** | `Accepted` | Binary codecs and 100-item micro-batches (fn_batch_draw_wallet_tokens_cf) cutting database IOPS by 98%. |
| **[ADR 0018](0018-edge-speculative-streaming-and-keepalive-connection-pools.md)** | Edge Speculative Streaming & Pre-Warmed Connection Pools | **Inference DX** | `Accepted` | Speculative draft + target streaming and pre-warmed HTTP/2 keep-alive sockets cutting TTFT by 65%. |
| **[ADR 0019](0019-autonomous-shard-health-probes-and-budget-governance.md)** | Autonomous Shard Health Probes & Multi-Tenant Budget Governance | **Governance** | `Accepted` | Autonomous shard auto-drain heartbeats and multi-tenant budget threshold webhooks (50%/80%/100%). |
| **[ADR 0020](0020-provider-as-auth-zero-friction-session-substrate.md)** | Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting | **Auth & Vault** | `Accepted` | 1-Click zero-friction onboarding using upstream OpenAI/xAI credentials as primary identity. |
| **[ADR 0021](0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md)** | JWE Compact Session Encryption & DPoP Client Fingerprinting | **Session Security** | `Accepted` | Compact AES-256-GCM encrypted tokens (`galx_sess_v2...`) bound to IP subnet / UA fingerprints. |
| **[ADR 0022](0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md)** | OAuth 2.0 Token Rotation with Reuse Attack Detection Cascades | **Anti-Replay** | `Accepted` | Single-use rotation with 30s grace window and automatic session family lineage killswitch. |
| **[ADR 0023](0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md)** | Step-Up SUDO Session Elevation & Fine-Grained Token Scoping | **Authorization** | `Accepted` | 15-minute privileged SUDO window, wildcard token scopes (`chat:*`), and multi-device remote logout. |
| **[ADR 0024](0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md)** | Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Re-Wrapping | **KMS & Risk** | `Accepted` | Dynamic 0-100 risk scoring, security posture grades (`A+`), and zero-downtime key re-wrapping. |






---


## 🧭 Architectural Principles

1. **Zero Client Refactoring**: Standard OpenAI API compatibility (`/v1/chat/completions`, `/v1/images/generations`, `/v1/models`).
2. **Sub-15ms Gateway Overhead**: Zero-allocation ring buffers, in-memory continuous calculus, and non-blocking candidate selection.
3. **Anti-Sybil Integrity**: $10 minimum deposit proof with 50% instant match grant ($15 total usable credit) and 100% unspent balance refundability.
4. **Transparent Capacity Leveling**: Adaptive Hydraulic Headroom Cycling (P-AHT) with dynamic reliability weights and tenant affinity dispersion.
