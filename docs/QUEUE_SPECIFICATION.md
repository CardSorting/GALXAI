# Application queues and relay execution

<!-- docs-scope: current-guide -->

Private contract. Queue, account admission, customer usage and execution recovery are separate systems. [Routing](ROUTING_ALGORITHMS.md) fixes the selected pool before account admission; idle peer capacity cannot satisfy an unavailable request.

## Accepted relay work

An isolated runtime persists a scoped execution reservation, acquires the existing central account lease and binds it locally before provider I/O. Central grants expire unless renewed. Unconfirmed terminal writes stop new local admission while original writes/settlements retry. Restarted incomplete executions become unknown and are never redispatched. An execution record is not a transferable queue item or a promise of artifact retrieval after engine/epoch loss.

The Premium runtime hosts in-process account engines and selects among its own reported eligible models. It has no global queue, cross-pool discovery or fallback. Text, Sites and images use Premium. The runtime rejects unsupported workloads before provider I/O, while client-owned function calling remains under the text contract and callbacks execute in the agent application. Exact status/replay behavior is in [request recovery](RELAY_API_REFERENCE.md#request-recovery).

The Premium rotation policy reserves an eligible account before forwarding and holds its execution slot through actual completion. Queued/running/streaming work and cooldowns exclude new selection; a `202` is not slot release. If no eligible account remains, return sanitized `503 service_busy` with `Retry-After: 5` before an engine attempt. This adds backpressure without a new durable queue or capacity ledger. Status/replay stays bound to the original account and consumes no new selection.

Recovering accounts in each pool share a five-second minimum interval between new recovery selections; healthy eligible work continues. Reservation releases are ownership-bound, and wall-clock changes do not reset live rotation. A caller gone before lookup completes consumes no new selection or execution; new dispatch also rechecks projection freshness after lookup. A post-forward disconnect remains tied to the original execution and cannot authorize redispatch.

Submissions, status/cancel lookups and stream subscriptions have distinct non-queuing per-owner/process allowances. Completion writes serialize; remote settlement coalesces into bounded, paced maintenance without holding a durably completed local slot. An unconfirmed terminal write or acquired-but-unbound lease still blocks new admission. See [recovery dependency limits](reference/shared-quota-recovery.md#keep-recovery-dependencies-bounded).

Premium uses the same admission exclusions and recovery pacing with four healthy ongoing jobs per account. Explicit [SDK continuation](reference/shared-quota-recovery.md) preserves completed callbacks and its cumulative budget; it is not an automatic queue replay. Caller-owned checkpoints require an awaited persistence hook for crash durability.

The retained federation has separate signed job URLs, generation-bound status/stream/cancel and opted-in durable text receipts on original worker volumes. Its identity tombstones and retained-volume receipt exception do not apply to isolated runtime recovery. Use [legacy API recovery](reference/legacy-federation-api.md#request-recovery) only for operations accepted under that contract.

Current Sites admission follows its customer plan/free allowance and shared fair usage independently of provider-account pool. Historical wallet receipts keep their original settlement rules. See [Sites operations](maintainers/SITES_OPERATIONS.md).

## Application image requests

Public async images and synchronous free images use [durable PostgreSQL receipts](../src/lib/images/request-repository.ts), not the generic process-local task table. The application commits before 202, scopes reads and transitions to the verified owner, fingerprints idempotency keys and claims dispatch atomically. Completion requires all owned image assets to be durably cataloged. Both legacy and isolated Premium paths mirror sanitized image payloads and durably flush BroccoliDB library records before completing receipts.

[The service](../src/lib/images/request-service.ts) tracks bounded work with Next.js `after`. Status reads can schedule an unclaimed queued request; claimed attempts are never leased for redispatch. A failed receipt with the explicit `generation_not_started` classification proves a pre-dispatch rejection; all other timeout/failed statuses are not proof of no side effect. A late authoritative completion can be recorded. Cancellation only succeeds before dispatch; keep original identity and check the library before another submission.

The [one-time free allowance](maintainers/FREE_GENERATION_QUOTA.md) commits image deductions with newly inserted receipts. Replays reuse saved outcomes without another deduction; queued cancellation, safe queue expiry and proven capacity non-start release only the corresponding usage. Dispatched uncertainty stays deducted and occupies free capacity. A separate private, expiring aggregate budget limits all free identities together; cancellation cannot replenish its cumulative or rolling attempt budget. Image claim and Sites start recheck a pause before dispatch; Pro remains outside this extra gate.

The [large-library implementation](maintainers/image-library-scale.md) bounds process-local metadata/page caches and pending image writes. A full write buffer rejects admission without evicting unsaved records; durable asset acknowledgement remains required. Browsing outages return unavailable instead of a partial cache presented as complete history. This does not add a durable generation queue.

The application's receipt persistence does not make upstream execution exactly once or transfer its guarantee to generic queues, relay jobs or SDK retries. Follow [image recovery](../post-mortem/runbooks/image-generation.md) and [ADR 0144](adr/0144-durable-images-and-incident-documentation.md).

The image studio retains up to four accepted requests per tab, with one bounded parallel status batch and no overlapping batches. Requests survive reload in owner-scoped session storage; library navigation does not clear tracking. Transient HTTP failures retain requests, honor Retry-After and pause when hidden/offline. Five minutes of observation pauses updates without discarding identity. Explicit resume checks the same receipts. A lost POST acknowledgement retains its exact key and settings; the Recover request action resubmits that identity through the existing durable idempotency boundary. It cannot create another execution for an already committed receipt. Explicit dismissal can retire paused unknown tracking after the user reviews the library; it never cancels running work or refunds quota. This is a browser work bound, not a promise of four simultaneous backend executions.

## Throughput isolation

The owning runtime's central grants and existing lease/concurrency limits govern new execution. Durable execution records do not introduce another account budget. Monitor polling is observation, not a work queue or liveness grant. The retained federation's bounded status batches, generation reservations and separate control buckets remain scoped to that deployment.

Application task tables, SDK queues, edge coordinators and billing leases keep their own scheduling, persistence, retries and cancellation contracts. None authorizes replay or model substitution after uncertain execution. Preserve owner, deadline, operation identity and original execution authority in any future queue change.
