# Application queues and relay jobs

Reviewed against the repository on 2026-09-07. There are two distinct systems: the application task queue and the standalone relay's asynchronous inference jobs. Their state, authorization, retry policies, and durability are not interchangeable.

## Application queue implementation

[GalxTaskQueueEngine](../src/core/queue/GalxTaskQueueEngine.ts) implements task scheduling, dispatch, retry/backoff, worker lease operations, pipeline execution, and callbacks. [GalxQueueContracts](../src/core/contracts/GalxQueueContracts.ts) defines task/configuration types; [GalxQueueClient](../src/core/queue/GalxQueueClient.ts) and [GalxQueueEventBus](../src/core/queue/GalxQueueEventBus.ts) provide client and event interfaces.

The route tree in [src/app/api/queues](../src/app/api/queues) exposes task creation, retrieval, streaming, progress, acknowledgement, failure, retry, redrive, and cancellation operations. Consult each handler for authorization and validation. An endpoint's existence does not imply that its corresponding hosted UI remains part of the product strategy.

Queue configuration includes attempt limits, retry duration, minimum/maximum backoff, doubling limits, and jitter. Defaults and queue-specific overrides live in the engine; these are not the relay's retry defaults. Worker lease and fencing behavior must be evaluated against the actual persistence implementation and deployment topology. A process counter alone is not a distributed fencing authority.

This implementation is not a certification of compatibility with Google Cloud Tasks, Cloud Run, EventBridge, or SQS. Historical simulation timing and scheduling results are not a production SLA.

## Standalone relay jobs

Chat submission returns HTTP 202 with job status and stream locations. Inference-key ownership controls subsequent job operations. HTTP acceptance releases request admission; upstream work continues under separate shard concurrency and deadline limits.

Relay retries are bounded by request count, a shared process budget, wall-clock limits, and transport timeouts. SSE replay is bounded in memory. Checkpoints exclude provider tokens but can contain unfinished request content; handle the state volume accordingly. After restart, unfinished work terminates with `relay_restarted_start_new_request` rather than being dispatched automatically.

Cancellation attempts to stop active relay work. It reports `refunded: null` and `refundStatus: not_managed_by_relay`; financial reconciliation belongs to the application. The relay does not run an MLFQ worker scheduler, spawn a shadow executor, or promise exactly-once continuation.

## Integration rule

Keep client retries finite and distinguish accepted, running, completed, failed, and cancelled states. Avoid stacking unbounded client resubmission around queue or relay retries. Agent tool execution belongs to the consuming runtime; neither a job identifier nor model output grants authority on the relay host.

See [relay API](RELAY_API_REFERENCE.md), [ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md), [resilience guide](RESILIENCE_AND_DISASTER_RECOVERY.md), and [product strategy](PRODUCT_SURFACE_STRATEGY.md).
