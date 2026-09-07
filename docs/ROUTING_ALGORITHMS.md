# Routing and shard selection

Reviewed against the repository on 2026-09-07. Routing behavior depends on the entrypoint; the platform pool, Cloudflare Worker, and standalone relay are not interchangeable implementations.

## Application and platform pool

[GalxModelRouter](../src/core/router/GalxModelRouter.ts) and [ModelCatalog](../src/core/router/ModelCatalog.ts) resolve application model requests. [OpenAIAdapter](../src/core/router/adapters/OpenAIAdapter.ts) includes relay and direct-provider/SDK/CLI paths. A relay deployment does not remove those other paths or sandbox the application process.

The platform pool scores candidate credentials and uses its PostgreSQL lease authority where configured. Candidate scoring is not ownership: the database-backed path must acquire and reconcile a lease. See [ADR 0115](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) for registry and lease scope. Algorithm names and local simulations do not prove cross-worker ownership or a production latency target.

## Standalone relay

[relay-server.ts](../src/relay/relay-server.ts) refreshes the configured registry projection before selection, coalescing refreshes over a five-second interval. Registry failure prevents new selection. Expired or inactive credentials are excluded. Eligible shards are selected by least in-flight work, rotating ties, with four concurrent slots per shard by default.

The relay does not acquire a PostgreSQL lease for each provider attempt. Its concurrency reservations, retry budget, and provider-rejection state are process-local. Multiple replicas therefore require additional coordination before they can advertise a shared global limit.

Upstream authentication rejection disables the current credential locally and checkpoints its fingerprint. A changed credential can recover through rotation. Quota failures enter a bounded cooldown and permit one recovery probe; transport failures use bounded retry and backoff. Concurrent failures cannot overwrite a disabled credential with a merely cooling-down state.

Adaptive quota mode has no local request cap by default. A three-hour observation window reports local activity; it is not a promise of provider entitlement. Operators can configure a cap explicitly. Unknown provider capacity stays unknown.

## Recovery and client behavior

A request has finite retry count, shared process retry budget, wall-clock deadline, and transport timeouts. Retrying after partial output is best effort and may repeat provider work. Per-attempt WebSockets are not a warm socket pool. After restart, unfinished jobs fail explicitly rather than resending prompts automatically.

Clients must distinguish HTTP acceptance from completion, honor terminal failures, and bound their own retries. Tool execution belongs to the client's runtime; the relay does not execute tools on the operator's device.

See [relay API](RELAY_API_REFERENCE.md), [operational defaults](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md), and [ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md). Earlier MLFQ, seamless recovery, and fixed-quota relay descriptions are superseded by that decision.
