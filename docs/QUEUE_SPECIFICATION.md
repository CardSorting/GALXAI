# Application queues and relay execution

<!-- docs-scope: current-guide -->

Private contract. Queue admission, account admission, customer usage and execution recovery are separate systems. [Routing](ROUTING_ALGORITHMS.md) fixes the selected pool before account admission; idle peer capacity cannot satisfy an unavailable request. The local Premium request queue adds durable backpressure inside that already selected runtime; it does not choose a pool or account.

## Accepted relay work

An isolated runtime persists a scoped execution reservation, acquires the existing central account lease and binds it locally before provider I/O. Central grants expire unless renewed. Unconfirmed terminal writes stop new local admission while original writes/settlements retry. Restarted incomplete executions become unknown and are never redispatched. An execution record is not a transferable queue item or a promise of artifact retrieval after engine/epoch loss.

The Premium runtime hosts in-process account engines and selects among its own reported eligible models. It has no global queue, cross-pool discovery or fallback. Text, Sites and images use Premium. The runtime rejects unsupported workloads before provider I/O, while client-owned function calling remains under the text contract and callbacks execute in the agent application. Exact status/replay behavior is in [request recovery](RELAY_API_REFERENCE.md#request-recovery).

The Premium HTTP runtime durably admits authenticated, bounded non-stream generation requests to two in-process BroccoliQueue workers. BroccoliQueue tables use the existing BroccoliDB source and live under the runtime's existing `/state` volume. The runtime claims its existing exclusive ownership and recovers execution before opening the queue store; readiness stays false until both worker handles are running and persistence is healthy. It does not add a service, deployment target, database project, account ledger or cross-pool coordinator. Streaming chat remains on its existing direct streaming path.

The queue bounds total active/waiting/delayed jobs to 128, each owner to eight, and waiting/delayed image jobs to 32; these limits also apply when a retained failed/cancelled request is retried. Text/Sites and images use separate queues with eight and four workers. Queue waits have a 120-second absolute deadline. An expired, unclaimed job is atomically cancelled and returned as `not_accepted`; claiming it wins the race, and its handler is allowed to finish under the normal execution contract. Caller disconnect uses the same waiting-only cancellation boundary and never aborts a claimed generation. During graceful shutdown, new admission closes while workers continue processing already accepted jobs as the HTTP listener drains. After connected requests complete or expire under their original deadline, workers stop claiming new work and drain active handlers. Any waiting jobs left in the persisted queue retain their original deadlines and resume from the same `/state` volume. On recovery, a worker checks the recorded claim timestamp against that deadline before entering the relay handler; a job claimed at or after expiry returns `not_accepted` without provider dispatch, while a claim before expiry owns the race and may finish normally. The caller can safely retry a proven pre-dispatch result with the same idempotency key. Queue requests include the validated body, opaque delegated tenant identity, request key and fingerprint; they do not store the inference bearer key. Queue files live in a mode-0700 directory with mode-0600 files, and the dedicated runtime uses a restrictive creation umask. Symlinked or non-regular storage entries fail startup. These filesystem modes restrict access between local UIDs; the queue volume is not encrypted against host administrators or disk access. The exact queue rows and response bytes are private runtime state. Successful responses are revalidated and sanitized, written to the caller, then acknowledged and removed. Terminal rows left by disconnected callers are retained for at most one hour and capped at four. WAL compaction is coalesced after eight acknowledgements, 128 queue mutations, or 30 seconds, and an incomplete snapshot rotation is retried without invalidating the existing WAL.

The queue is an admission and recovery layer, not authority to repeat provider work. The existing execution store remains authoritative after dispatch: an uncertain or restarted execution is never sent to another provider or account. A waiting job survives container replacement with the same `/state`. Active claims renew a 90-second lease every 30 seconds; after an unclean runtime loss, a replacement worker can reconcile the claim after that lease expires. Its handler checks the original execution record and cannot redispatch work whose outcome is uncertain. If the queue is full or its wait deadline expires before claim, return sanitized backpressure before provider I/O, marked `not_accepted` only when the no-dispatch boundary is proven. Status/replay stays bound to the original account and consumes no new selection.

The Premium rotation policy reserves an eligible account before forwarding and holds its execution slot through actual completion. Queued/running/streaming work and cooldowns exclude new selection; a `202` is not slot release. If no eligible account remains, return sanitized `503 service_busy` with `Retry-After: 5` before an engine attempt. The durable ingress queue does not create capacity or change the account selection policy. Status/replay stays bound to the original account and consumes no new selection.

Recovering accounts in each pool share a five-second minimum interval between new recovery selections; healthy eligible work continues. Reservation releases are ownership-bound, and wall-clock changes do not reset live rotation. A caller gone before lookup completes consumes no new selection or execution; new dispatch also rechecks projection freshness after lookup. A post-forward disconnect remains tied to the original execution and cannot authorize redispatch.

Submissions are bounded before they enter the local queue; status/cancel lookups and stream subscriptions retain distinct non-queuing per-owner/process allowances. Completion writes serialize; remote settlement coalesces into bounded, paced maintenance without holding a durably completed local slot. An unconfirmed terminal write or acquired-but-unbound lease still blocks new admission. See [recovery dependency limits](reference/shared-quota-recovery.md#keep-recovery-dependencies-bounded).

Premium uses the same admission exclusions and recovery pacing with four healthy ongoing jobs per account. Explicit [SDK continuation](reference/shared-quota-recovery.md) preserves completed callbacks and its cumulative budget; it is not an automatic queue replay. Caller-owned checkpoints require an awaited persistence hook for crash durability.

The retained federation has separate signed job URLs, generation-bound status/stream/cancel and opted-in durable text receipts on original worker volumes. Its identity tombstones and retained-volume receipt exception do not apply to isolated runtime recovery. Use [legacy API recovery](reference/legacy-federation-api.md#request-recovery) only for operations accepted under that contract.

Current Sites admission follows its customer plan/free allowance and shared fair usage independently of provider-account pool. Historical wallet receipts keep their original settlement rules. See [Sites operations](maintainers/SITES_OPERATIONS.md).

## Application image requests

Human async and synchronous image requests use durable owner-scoped receipts,
not the generic process-local task table. The receipt commits with its purchased
allowance reservation before work can be claimed. Replays preserve the original
operation identity. Claim permits a human Private Work request only when its
reservation is valid. A server-owned Star request completes as a private
candidate; a separate institutional selection must authorize the exact asset
set before those assets become public. A client field cannot promote a human
request or approve a Star candidate for exhibition.

Customer-facing 202 and snapshot responses project queued/claimed work to the
single `in_progress` state. The internal receipt lifecycle is not serialized
into user responses or progress streams.

Completion requires the owned image assets to be normalized, cataloged, and
durably associated with the receipt. A successful image transport by itself is
not a completed Work or a publication decision. New Star assets remain private
until a durable review event selects their exact IDs; unselected or withheld
candidates stay private. The public network query surfaces include only
eligible published Star Works. Human-generated or remixed Works remain
owner-scoped and cannot enter Explore, public search, Star archives, Series,
feeds, or another user's library.

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
