# ADR 0079: LUMI & Community QoS Multi-Tier Pool Mesh and IETF RateLimit Generation

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migrations 54–59, Applied & Cemented)

## Context
GALXAI operates multi-tenant LLM inference workloads spanning Free Community users, LUMI $10/month subscription holders (OpenAI reasoning & coding tier), and Pay-As-You-Go Sovereign enterprises. Uncontrolled contention between tiers caused queuing latency spikes and quota exhaustion. Additionally, clients required standards-compliant IETF RFC RateLimit headers to gracefully throttle requests without guessing backoff windows.

## Decision
1. **Multi-Tier Pool Isolation (`lumi_qos_pools`, `galx_tier_shards`)**:
   - Free Pool: 3-tier adaptive throttle with continuous credit decay.
   - LUMI Pool: Dedicated $10/month pool with 5-hour rolling warp multipliers for GPT-5.6 Sol/Terra/Luna, o3, and o3-mini.
   - Sovereign Pool: Guaranteed 70% headroom cluster floor.
2. **IETF Standard RFC RateLimit Header Generator**:
   - Generates `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `RateLimit-Policy` dynamically in single-hop preflight execution.
3. **Opportunistic Off-Peak Burst Multipliers**:
   - Enables up to 2.5x concurrency expansion when cluster utilization drops below 40%.

## Consequences
- 100% elimination of noisy-neighbor starvation across tiers.
- Zero-latency client throttling compliance matching IETF standards.
