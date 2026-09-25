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

Human async and synchronous image requests use durable owner-scoped receipts,
not the generic process-local task table. The receipt commits with its purchased
allowance reservation before work can be claimed. Replays preserve the original
operation identity. Claim permits a human Private Work request only when its
reservation is valid; it permits a public Star Work only for the server-owned
Star publishing class. A client field cannot promote a human request into a
Star publication.

Customer-facing 202 and snapshot responses project queued/claimed work to the
single `in_progress` state. The internal receipt lifecycle is not serialized
into user responses or progress streams.

Completion requires the owned image assets to be normalized, cataloged, and
durably associated with the receipt. A successful image transport by itself is
not a completed Work. The public network query surfaces include only eligible
published Star Works. Human-generated or remixed Works remain owner-scoped and
cannot enter Explore, public search, Star archives, Series, feeds, or another
user's library.

The image lifecycle reserves purchased allowance before dispatch and settles or
releases it only from the existing terminal evidence. Proven pre-dispatch
rejection, queued cancellation, and queued expiry before claim may safely
release a reservation. Ambiguous outcomes remain reserved; timeout after claim,
process restart, and an empty status read do not authorize an automatic retry
or refund. Consult [current image allowance
guidance](maintainers/FREE_GENERATION_QUOTA.md) and [image recovery](../post-mortem/runbooks/image-generation.md).

Public discovery is independent of image execution. Browsing, following,
saving, searching, and opening archives do not create image work. The old
one-time free image balance is historical only and cannot authorize a new
claim. Image-plan checkout and generation use the approved bounded allowance
configuration; invalid or missing configuration continues to fail closed.

The [large-library implementation](maintainers/image-library-scale.md) bounds
metadata/page caches and pending image writes. A full write buffer rejects
admission without evicting unsaved records; durable asset acknowledgement
remains required. Browsing outages return unavailable instead of partial cache
history. This does not add a durable generation queue.

The application's receipt persistence does not make execution exactly once or
transfer that guarantee to generic queues, relay jobs, or SDK retries. Keep
uncertain work bound to its original operation. The browser may retain a
bounded set of receipt IDs for status recovery; resuming status never starts a
new operation. This is a client observation bound, not a promise of parallel
backend execution.

## Throughput isolation

The owning runtime's central grants and existing lease/concurrency limits govern new execution. Durable execution records do not introduce another account budget. Monitor polling is observation, not a work queue or liveness grant. The retained federation's bounded status batches, generation reservations and separate control buckets remain scoped to that deployment.

Application task tables, SDK queues, edge coordinators and billing leases keep their own scheduling, persistence, retries and cancellation contracts. None authorizes replay or model substitution after uncertain execution. Preserve owner, deadline, operation identity and original execution authority in any future queue change.
