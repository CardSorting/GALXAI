# ADR 0087: Dual-Window Hybrid Rate Governance, Sliding Request Logs & Zero-Trust Resynchronization

## Status
Accepted

## Context
Upstream foundation model providers enforce heterogeneous, non-standard rate limits. While standard API keys follow Continuous Token Bucket limits (TPM/RPM), pooled accounts, trial tiers, and specialized models (such as GPT-5.6 or Claude 3.7 reasoning tiers) frequently operate on discrete rolling sliding windows (e.g. 5 requests per 5 hours, or 40 requests per 3 hours). Furthermore, shards are subject to out-of-band credit consumption by external developers or automated jobs outside the gateway, causing unexpected 429 rate limit errors when local gateway counters believe capacity is still available.

## Decision
1. **Dual-Window Hybrid Calculus (`ContinuousTokenBucketRateGovernor.ts`)**:
   - Every shard account maintains both continuous fractional token buckets (for microsecond TPM/RPM refills) and discrete sliding window request logs (`SlidingWindowQuotaState`).
   - `canConsumeSlidingWindow()` mathematically filters out timestamps outside the active window duration ($t \le \text{now} - \text{windowDurationMs}$) and verifies discrete slot availability against `dynamicDiscoveredCap` or `maxRequestsPerWindow`.
   - `recordSlidingWindowConsumption()` atomically appends microsecond timestamps to the in-memory request log on lease acquisition.
2. **Deep Universal NLP Error Dissection**:
   - Integrated deterministic natural language parser capable of extracting cooldown durations from cryptic upstream error bodies and headers (e.g. `"Usage limit reached... resets in 4 hours 12 minutes"`, `"resets at 3:45 PM"`, `"5h30m"`, or ISO8601 strings).
3. **Zero-Trust Out-of-Band Quota Resynchronization**:
   - When an upstream shard returns an out-of-band 429 error, `syncSlidingWindowFromReset()` recalculates and fills synthetic timestamps to match the authoritative upstream reset timestamp, instantly updating BroccoliDB L1 state and routing all subsequent requests to healthy alternate shards.

## Consequences
- **Positive**: Complete elimination of rate limit surprise on heterogeneous rolling window accounts (5/hr, 40/3hr).
- **Positive**: Automatic self-healing and resynchronization when keys are shared or consumed out-of-band.
- **Positive**: Zero minute-boundary clumping or mathematical drift.
