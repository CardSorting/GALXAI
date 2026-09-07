# Rate limits, concurrency, and provider quota

Reviewed on 2026-09-07. Limits belong to distinct layers. A platform plan, a relay admission limit, a shard slot, and an upstream provider quota measure different things.

| Layer | Authority and scope |
| --- | --- |
| Product API and account policy | Application authentication, configured plan/governor, and billing policy |
| Platform pool lease | PostgreSQL authority on the database-backed pool path; see ADR 0115 |
| Worker ingress | The deployed Worker's configured admission implementation; not the standalone relay |
| Relay HTTP admission | Process-local active HTTP admissions, default 64; asynchronous chat releases admission on acceptance |
| Relay shard concurrency | Process-local provider attempts, default four slots per shard |
| Relay local usage cap | Optional operator cap; adaptive mode has no local cap by default |
| Provider quota | Provider-reported capacity or rejection; unknown until reported |

## Relay behavior

The relay observes local calls over a three-hour window without inventing an upstream allowance. “No local cap” does not mean unlimited provider capacity. Expired and inactive shards cannot supply headroom. “Ready for requests” describes local eligibility, not a completed upstream credential validation.

Quota rejection uses a provider deadline when available. Otherwise cooldown starts at 60 seconds, doubles with repeated failures, and caps at 30 minutes. One recovery probe prevents a burst at cooldown expiry. Authentication rejection disables that credential locally until rotation; it must not be treated as a transient quota problem.

Retries default to three, with jittered backoff from 500 ms capped at 5 seconds. A shared process budget starts at 20 and replenishes over time and on success. A five-minute default request wall limit and transport deadlines also bound work. These defaults are configurable; the [deployment runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) is the complete operational reference.

## Operator and client guidance

Use the relay dashboard to distinguish local saturation, provider cooldown, expired credentials, rejected credentials, and stale registry data. Administrator keys protect operational data. An inference key does not grant fleet administration.

Use bounded client retries with backoff and honor the endpoint's response. Do not place an unbounded SDK retry loop around the relay's own retries. Cancellation reports that refund handling is outside the relay; inspect application billing separately.

The [continuous token governor](../src/core/governor/ContinuousTokenBucketRateGovernor.ts) and platform lease configuration define their own limits. Do not copy historical example RPM/TPM values, subscription allowances, or simulation throughput into customer entitlements.

See [fleet runbook](maintainers/RELAY_QUOTA_AND_FLEET.md) and [relay API](RELAY_API_REFERENCE.md).
