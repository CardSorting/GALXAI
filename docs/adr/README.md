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

---

## 🧭 Architectural Principles

1. **Zero Client Refactoring**: Standard OpenAI API compatibility (`/v1/chat/completions`, `/v1/images/generations`, `/v1/models`).
2. **Sub-15ms Gateway Overhead**: Zero-allocation ring buffers, in-memory continuous calculus, and non-blocking candidate selection.
3. **Anti-Sybil Integrity**: $10 minimum deposit proof with 50% instant match grant ($15 total usable credit) and 100% unspent balance refundability.
4. **Transparent Capacity Leveling**: Adaptive Hydraulic Headroom Cycling (P-AHT) with dynamic reliability weights and tenant affinity dispersion.
