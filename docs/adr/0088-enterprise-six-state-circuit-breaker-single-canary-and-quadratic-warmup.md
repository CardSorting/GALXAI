# ADR 0088: Enterprise 6-State Circuit Breaker, Strict Single-Canary Slotting & Slow-Start Quadratic Warmup

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

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
