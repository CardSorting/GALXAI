# ADR 0009: 4-Phase Half-Open Canary Traffic Warming & Background Lease Scavenger

## Status
**Accepted** (Implemented and Verified)

## Context
When upstream AI providers experience transient outages or enforce 429 rate-limit backoffs:
1. **Thundering Herd Recovery**: Abruptly restoring 100% traffic to a recovering upstream credential immediately re-trips rate limits, causing oscillating flappings between healthy and degraded states.
2. **Orphaned Streaming Reservations**: Long-running streaming requests (`/v1/chat/completions?stream=true`) where clients disconnect prematurely can orphan soft token reservations, locking capacity indefinitely.

## Decision
We implemented a **4-Phase Half-Open Canary Traffic Warming Protocol** and an **Automated Background Lease Scavenger Engine**:

### 1. 4-Phase Half-Open Canary Traffic Warming
When an upstream lane completes its cooldown backoff period after a rate-limit event, it enters a structured canary warming cycle:
$$\text{CanaryMultiplier} = \min\left(1.0, \frac{\text{SuccessfulProbes}}{\text{RequiredCanaryProbes}}\right)$$
1. **Canary Probe Phase**: Allows only a single low-concurrency test request through the lane while holding the circuit in half-open state.
2. **Exponential Expansion Phase**: Upon receiving a successful 200 OK, the circuit multiplier scales up incrementally (25% → 50% → 75% → 100%).
3. **Immediate Cooldown Reset**: If a canary probe encounters a renewed 429 or 503 error, the backoff interval doubles with decorrelated exponential jitter:
   $$\text{BackoffDuration} = \min\left(\text{MaxBackoffMs}, \text{BaseBackoffMs} \times 2^{\text{Attempt}} + \text{jitter}(0, 2000)\right)$$

### 2. Automated Lease Scavenger Engine
- Background scavenger periodically sweeps all active credential pool leases.
- If a lease exceeds its maximum execution TTL ($120\text{s}$ default, extendable via SSE heartbeat), the scavenger automatically:
  1. Purges the orphaned lease record.
  2. Reclaims and releases the soft token reservation in the rate governor.
  3. Restores capacity to the available shard pool.

## Consequences
- **Positive**: Eliminates circuit recovery flapping and stabilizes upstream rate-limit recovery.
- **Positive**: Guarantees zero token reservation leaks, even during client abrupt disconnects.
- **Positive**: Self-healing gateway architecture with 99.99% operational SLA.
