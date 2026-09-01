# ADR 0089: Anti-Stampede Bounded Admission Queue & AIMD Adaptive Concurrency Limiter

## Status
Accepted

## Context
During momentary peak load bursts across all shards in a provider pool, synchronous lease acquisition would previously fail-fast and reject user requests with HTTP 429 / `all_shards_cooldown` errors, even when capacity or mathematical token bucket refill was only 200–500ms away. Clients retrying simultaneously would form a synchronized retry stampede. In addition, static in-flight concurrency caps caused slow-poisoning / tarpitting when upstream providers suffered degraded server latency.

## Decision
1. **Bounded Admission Queue / Waiting Room (`GalxCredentialPool.ts`)**:
   - When all candidate shards are momentarily exhausted or saturated, the pool forecasts the earliest reset timestamp across the fleet:
     $$t_{\text{earliestReset}} = \min_{s \in \text{Fleet}} (t_{\text{cooldown}, s}, t_{\text{windowReset}, s})$$
   - If the remaining wait time $t_{\text{earliestReset}} - t_{\text{now}} \le \text{maxQueueWaitMs}$ (default 4,000ms), the request is admitted to an in-memory priority queue (`admissionQueue`), returning a queued promise.
   - If the wait exceeds the deadline budget or queue capacity ($>500$), it fails fast with descriptive reset telemetry.
2. **Reflexive Event-Driven Queue Draining**:
   - Whenever any worker releases a lease (`releaseLease`), completes a token commit, or scavenges an expired lease, `drainAdmissionQueue()` executes immediately to satisfy queued requests without polling loops.
3. **Additive-Increase / Multiplicative-Decrease (AIMD) In-Flight Limiter**:
   - Dynamically calculates the concurrency limit for each shard based on EWMA latency:
     - Fast shards ($\text{EWMA} < 400\text{ms}$): Concurrency boosted up to $\min(25, \text{base} + 4)$.
     - Moderately throttled ($\text{EWMA} > 1200\text{ms}$): Concurrency capped at $\max(3, \lfloor\text{base} \times 0.7\rfloor)$.
     - Severely degraded ($\text{EWMA} > 2000\text{ms}$): Concurrency choked to $\max(2, \lfloor\text{base} \times 0.4\rfloor)$.

## Consequences
- **Positive**: Absorbs micro-burst traffic spikes and converts potential 429 client errors into smooth $<500\text{ms}$ queued completions.
- **Positive**: Protects against slow-poisoning / tarpit degradation by automatically reducing in-flight concurrency on slow shards.
- **Positive**: Zero polling overhead via event-driven reactive lease drainage.
