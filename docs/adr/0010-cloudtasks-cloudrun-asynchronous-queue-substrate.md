# ADR 0010: CloudTasks & CloudRun Inspired Asynchronous Queue Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
High-concurrency AI workloads (agentic swarms, mass evaluation datasets, batch synthesis, long-running vision generation) face distinct challenges when handled purely via synchronous HTTP request/response loops:
1. **Upstream Rate-Limit Starvation**: Bursting hundreds of concurrent requests simultaneously causes cascading 429 errors and client disconnect timeouts.
2. **Serverless Execution Deadlines**: Synchronous web requests held open for 60–120 seconds risk ingress gateway socket drops or reverse proxy gateway timeouts.
3. **Lack of Idempotency & Re-Drive**: Failed long-running agent workflows require complex client-side retry logic without unified Dead-Letter Queue (DLQ) diagnostic persistence.

## Decision
We designed and implemented the **GALXAI Universal Asynchronous Task Queue Substrate (`GalxTaskQueueEngine`)**, mirroring Google Cloud Tasks and Cloud Run execution semantics:

```mermaid
flowchart TD
    Client[Client App / Agent Swarm] -->|POST /v1/chat/completions (X-Galx-Async: true)| Gateway[Universal Ingress]
    Client -->|POST /api/queues/:queue/tasks| DirectIngress[Direct Task Ingress API]
    
    Gateway --> QueueEngine[GalxTaskQueueEngine]
    DirectIngress --> QueueEngine
    
    subgraph Queue Engine Core
        Idemp[24h Strict Idempotency & Deduplication] --> TokenPacer[Token-Bucket Dispatch Rate Limiter]
        TokenPacer --> ConcurrencySemaphore[Active Concurrency Semaphore Ceiling]
        ConcurrencySemaphore --> FSM[Task Finite State Machine]
    end
    
    subgraph Execution Dispatch Topologies
        FSM -->|Direct Ingress| ModelRouter[GalxModelRouter Internal Execution]
        FSM -->|HTTP Push + HMAC-SHA256| CloudRun[Serverless Cloud Run / Webhook Target]
        FSM -->|Lease / Heartbeat Pull| PullWorkers[Distributed Pull Worker Fleets]
    end
    
    FSM -->|Exhausted Attempts / Permanent Error| DLQ[Dead-Letter Queue (DLQ)]
    DLQ -->|Manual / Automated Redrive| QueueEngine
```

### 1. Named Task Queues & Token-Bucket Dispatch Pacing
Each queue enforces continuous token-bucket dispatch rate pacing (`maxDispatchesPerSecond`, `maxBurstSize`) and concurrency semaphores (`maxConcurrentDispatches` globally and per-tenant):
$$\text{Tokens}_{\text{new}} = \min\left(\text{BurstSize}, \text{Tokens}_{\text{curr}} + \Delta t \times \text{DispatchesPerSec}\right)$$

### 2. Dual-Mode Dispatch Topologies (Cloud Run Push & Distributed Pull)
- **Internal Direct Model Execution (`INTERNAL_MODEL`)**: Dispatches directly through `GalxModelRouter` with 2-Phase token reservation, zero network loopback latency, automatic result capture, and optional webhook callback notifications.
- **Cloud Run HTTP Push Target (`HTTP_PUSH`)**: Dispatches HTTP push webhooks to serverless endpoints with custom timeout deadlines (up to 900s) and cryptographically verifiable `X-Galx-Signature` computed via HMAC-SHA256:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Timestamp} + \text{"."} + \text{Payload})$$
- **Distributed Pull Leases (`PULL_WORKER`)**: Enables external worker fleets to atomically acquire execution leases with monotonic fencing tokens (`fencingToken`), heartbeat extensions (`extendLease`), and ack/nack semantics.

### 3. Exponential Backoff with Randomized Jitter & DLQ Routing
Transient failures (429, 500, 502, 503, 504, network timeouts) are retried according to exponential backoff with full randomized jitter:
$$\text{BackoffDuration} = \min\left(\text{MaxBackoffMs}, \text{MinBackoffMs} \times 2^{\min(\text{Attempt}-1, \text{MaxDoublings})}\right) \times (1 + \text{rand}() \times \text{JitterFactor})$$
When retry attempts exceed `maxAttempts` or encounter non-retryable 4xx client errors, tasks transition immediately to `DEAD_LETTERED` status with full forensic error traces for diagnostics and 1-click re-drive.

### 4. Strict Idempotency & Deduplication Window
Tasks submitted with `idempotencyKey` are indexed with a 24-hour deduplication TTL, ensuring exactly-once execution semantics across network retries or client double-submits.

### 5. Strict FIFO Partition Grouping (`groupId` / `partitionKey`)
For stateful conversations or transactional agent turns, setting `groupId` guarantees sequential FIFO ordering:
- Only one task per `groupId` is permitted in `DISPATCHING` or `RUNNING` status at any given millisecond.
- Dependent tasks wait until preceding tasks in the partition group complete or dead-letter, while preserving high-throughput parallel execution across independent groups.

### 6. Multi-Step Task Pipelines (DAG Workflows) & Progress Tracking
Workflows requiring sequential chaining (`pipelineSteps`) execute sequentially within a single persistent task entity:
- Output from upstream steps is automatically piped into downstream AI model prompts or webhook payloads.
- Workers and gateway orchestrators emit real-time progress percentages (`0..100%`) and timestamped log lines for observability.

### 7. Native Cron & Recurring Scheduling Engine
Tasks with `cronConfig` (`cronExpression` or `repeatEveryMs`) automatically evaluate their next execution timestamp upon completion, re-enqueuing recurring instances up to a configurable ceiling (`maxExecutions`).

### 8. Bulk Dead-Letter Queue (DLQ) Redrive & Batch Management
- `bulkRedrive`: Ingests and re-activates dead-lettered tasks in bulk with 1 click, resetting their dispatch counters for a clean retry lifecycle.
- `bulkCancel`: Bulk cancels tasks matching tag, groupId, or user filter criteria.

### 9. Real-Time Server-Sent Events (SSE) Streaming
The substrate exposes native SSE endpoints (`/api/queues/:queueId/tasks/:taskId/stream` and `/api/queues/:queueId/stream`) driven by `GalxQueueEventBus`. Clients stream task lifecycle transitions, log updates, and completion results reactively with zero polling overhead.

### 10. Directed Acyclic Graph (DAG) Task Dependencies (`dependsOn`)
Tasks can declare prerequisite parent task IDs. Dependent tasks enter `WAITING_DEPENDENCIES` state until all parent tasks reach `COMPLETED`, at which point parent results are aggregated into `parentTaskResults` and the child task is unblocked.

### 11. Destination Circuit Breakers for HTTP Push Webhooks
Protects external webhook targets from being overloaded during outage events. If a host encounters 3 consecutive 5xx errors or network drops, dispatches to that host are paused for an exponential cooldown window.

### 12. Dynamic Anti-Starvation Priority Aging
$$\text{EffectivePriority} = \text{BasePriority} + \min\left(50, \left\lfloor \frac{\text{WaitTimeMs}}{\text{AgingIntervalMs}} \right\rfloor \times 5\right)$$
Prevents starvation of waiting low-priority background workloads during bursts of higher-priority tasks.

## Consequences
- **Positive**: Complete decoupling of heavy agentic and batch workloads from client connection lifecycles.
- **Positive**: Sub-millisecond queue dispatching with strict rate and concurrency boundaries preventing upstream provider quota saturation.
- **Positive**: Strict FIFO ordering guarantees for conversational memory without sacrificing cross-tenant parallelism.
- **Positive**: Real-time reactive updates via SSE eliminates wasteful client polling loops.
- **Positive**: Complex DAG multi-agent coordination without external workflow engines.
- **Positive**: 100% compatibility with standard Google Cloud Tasks and Cloud Run execution models.
- **Positive**: Full auditability, live telemetry percentiles, and 1-click DLQ re-drive capabilities.


