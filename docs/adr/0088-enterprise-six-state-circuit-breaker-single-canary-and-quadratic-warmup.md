# ADR 0088: Enterprise 6-State Circuit Breaker, Strict Single-Canary Slotting & Slow-Start Quadratic Warmup

## Status
Accepted

## Context
When an upstream provider shard recovers from cooldown or quota exhaustion, hundreds of queued or incoming requests previously routed elsewhere suddenly discover the newly healthy shard. This creates the "Hero's Return" anti-pattern: a massive thundering herd stampedes the freshly un-cooldown shard within 50ms, causing an immediate cascade of secondary 429 rate limit errors and high tail latencies. Furthermore, during half-open canary testing, admitting multiple parallel requests before the first probe succeeds can destabilize the shard.

## Decision
1. **6-State Circuit Breaker State Machine (`GalxCircuitBreaker.ts`)**:
   - `healthy`: 100% routing weight.
   - `warming_up`: Slow-start quadratic warmup ramp scaling effective routing weight over a 30-second window.
   - `half_open`: Strict single-canary slotting.
   - `cooldown`: Full decorrelated jitter backoff for transient 429s/503s.
   - `exhausted`: Extended backoff for rolling-window quota exhaustion (e.g. 5/5hr limit) or high failure density ($>5$ consecutive errors).
   - `quarantined`: 24-hour quarantine for billing limit exhaustion (HTTP 402 / `insufficient_quota`).
   - `dead`: Permanent eviction for revoked OAuth tokens or invalid API keys (HTTP 401/403).
2. **Strict Single-Canary Slotting (`acquireCanarySlot()`)**:
   - When a shard transitions to `half_open`, only **exactly 1 execution lease** is permitted to probe the shard.
   - All concurrent parallel requests bypass the canary shard and route to alternate healthy shards.
3. **Slow-Start Quadratic Warmup Curve**:
   - Upon successful canary verification, the shard transitions to `warming_up`.
   - The effective dispatch weight scales quadratically:
     $$\text{Weight}_{\text{eff}}(t) = \text{Weight}_{\text{base}} \times \min\left(1.0, \left(\frac{t - t_{\text{start}}}{30000\text{ms}}\right)^2\right)$$
   - This smoothly ramps traffic from 10% to 100% capacity over 30 seconds, preventing herd crashes.
4. **Per-Shard Model Capability Matrix**:
   - Upstream HTTP 404 / 400 `model_not_found` errors automatically register the target model in `unsupportedModels` for that specific shard, rerouting subsequent requests without marking the shard dead for other supported models.

## Consequences
- **Positive**: 100% prevention of post-cooldown thundering herd crashes.
- **Positive**: Safe single-probe validation without traffic disruption.
- **Positive**: Granular per-model error isolation protecting multi-tier shard fleets.
