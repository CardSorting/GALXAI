# ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming

> Current scope (2026-09-07): This historical platform circuit-breaker decision is not the standalone relay state machine. See ADR 0088 for later platform work and [ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) for current relay rejection, cooldown, single-probe recovery, and finite retries.

## Status
**Accepted** (Implemented and Verified)

## Context
Standard binary (Open/Closed) circuit breakers are ill-suited for AI API fleets:
- Treating temporary upstream 429 rate limit backpressure the same as a permanent revoked API key (401/403) leads to unnecessary credential eviction or catastrophic traffic re-routing.
- When an account finishes a cooldown period, slamming it immediately with 100% traffic causes immediate secondary rate limit trip spirals.

## Decision
We implemented a specialized **4-State Resilient Circuit Breaker** (`GalxCircuitBreaker`):

```
       ┌───────────────────────────────┐
       │            HEALTHY            │◄──────────────┐
       │     (100% Traffic Window)     │               │
       └───────┬───────────────┬───────┘               │
               │               │                       │
     HTTP 429  │               │ 401/403 Invalid       │ Canary Success
     / 503     │               │ Permanent             │
               ▼               ▼                       │
       ┌───────────────┐  ┌─────────┐                  │
       │   COOLDOWN    │  │  DEAD   │                  │
       │  (Exponential │  │ (Evict) │                  │
       │ Backoff+Jitter│  └─────────┘                  │
       └───────┬───────┘                               │
               │                                       │
     5+ Errors │                                       │
     Density   │ Cooldown Expires                      │
               ▼                                       │
       ┌───────────────┐                               │
       │   EXHAUSTED   ├──────── Half-Open Canary ─────┘
       │  (5m Freeze)  │         (25% -> 75% -> 100%)
       └───────────────┘
```

### 1. Granular Error Classification
- **Terminal Permanent Auth Errors**: Matches `invalid_api_key`, `account_deactivated`, `permission_revoked`, `401`, `403`. Transitions shard directly to `dead` state.
- **Transient Rate Limit Errors (429 / 503)**:
  - If upstream returns a `Retry-After` header, parses and sets the cooldown period accordingly.
  - Applies exponential backoff with decorrelated random jitter ($\pm 2.5\text{s}$) to avoid synchronized retry stampedes.
- **Error Density Guard (Exhausted)**: Shards with $\ge 5$ consecutive failures are placed into an extended 5-minute cooldown.

### 2. Half-Open Canary Traffic Warming
- When a shard emerges from `exhausted` or `cooldown`, it enters a canary state with damped traffic allocation:
  - Phase 1: 25% traffic multiplier (`canaryMultiplier: 0.25`).
  - Phase 2: 75% traffic multiplier upon consecutive successes.
  - Phase 3: Restored to 100% `healthy` state.

## Consequences
- **Positive**: Prevents cascading rate limit trip spirals.
- **Positive**: Eliminates zombie retries against permanently revoked credentials.
- **Positive**: Smooth, graceful recovery for degraded upstream providers.
