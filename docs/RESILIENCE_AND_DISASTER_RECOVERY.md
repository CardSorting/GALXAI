# Resilience and recovery boundaries

Reviewed 2026-09-07. Recovery behavior belongs to a specific component. An outbox, platform ledger, simulation scheduler, and the standalone relay do not share one recovery guarantee.

## Relay failures

| Failure | Implemented response | Limit |
| --- | --- | --- |
| Expired credential | Exclude from selection using registry/decoded token expiry | Expiry decoding does not authenticate a token |
| Upstream authentication rejection | Disable local credential and attempt immediate checkpoint | Not broadcast to independent relays |
| Provider quota feedback | Account cooldown, bounded alternate selection | Other accounts can also be unavailable |
| Repeated transport failure | Local cooldown and bounded recovery | Transport/provider cause can remain uncertain |
| Retry count or budget exhausted | Terminal job failure | Caller must decide whether to submit a new request |
| Request wall deadline | Abort transport and release local capacity | Remote provider may already have done work |
| Registry unavailable/stale | Stop new credential selection | Status/cancel remain independent of registry refresh |
| Downstream disconnect | Bounded grace and retained-memory replay | Replay cannot survive process loss |
| Slow subscriber | Bounded queue and drain deadline | Subscriber may lose its connection |
| Shutdown | Reject new work, drain, then abort remaining work | A single host still has a cutover window |
| Restart | Recover eligible checkpoint state; fail interrupted jobs | No live sockets or output buffers are checkpointed |

The relay owns no wallet refund transaction. Cancellation fields explicitly report financial settlement as not managed by the relay. Image idempotency and chat deduplication are principal-scoped, TTL-limited local behavior, not provider-side exactly-once execution.

## Storage and restore

The named checkpoint volume is private service state. It contains no provider tokens but may contain unfinished prompts/messages. Access controls and retention apply. Preserve it before image changes, migrate it deliberately from earlier bind-mounted layouts, and never share it between concurrently writing relay instances.

PostgreSQL registry backup/restore, vault-root custody, application wallets, and execution journals have separate recovery requirements. Database-backed pool leases must not be confused with the relay's local scheduler. Do not claim zero recovery-point loss for periodic relay checkpoints or instant recovery time without a measured restore exercise.

## Availability strategy

The verified relay is a single container on one host. Host sleep, Docker failure, networking loss, or a provider outage can interrupt it. A tunnel exposes a route but does not remove those dependencies. Multiple relays require coordinated concurrency, rejection propagation, checkpoint strategy, and traffic routing before they form a supported high-availability deployment.

## Experiments

The class-based scheduling and standby-handover experiments in [ADR 0113](adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) are not the deployed relay. Synthetic throughput and scheduler assertions are not live-provider latency, loss, or availability guarantees.

## Operations

Use the [deployment and rollback runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md), [relay API](RELAY_API_REFERENCE.md), and [telemetry guide](maintainers/RELAY_TELEMETRY.md). Preserve the trace, failure code, and partial-output status during incidents without publishing request content or credentials. Retry only after understanding whether the failed operation could already have produced an externally visible result.
