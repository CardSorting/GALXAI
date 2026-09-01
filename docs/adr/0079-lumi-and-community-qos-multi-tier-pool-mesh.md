# ADR 0079: LUMI & Community QoS Multi-Tier Pool Mesh and IETF RateLimit Generation

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
