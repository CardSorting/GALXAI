# Relay selection and admission

<!-- docs-scope: current-guide -->

Private routing contract for [central account authority and isolated pools](ARCHITECTURE.md). Source behavior and [dated acceptance](../post-mortem/CURRENT_STATE.md) are separate from rollout intent.

## Selection

1. The application verifies customer identity, product permission and owner scope.
2. With `GALX_ISOLATED_RELAYS_ENABLED=1`, deployment policy chooses `GALX_TEXT_RELAY_POOL` for text, default Standard. Sites and images choose Premium. Distinct origins and keys are required.
3. The runtime rejects forbidden workloads before provider admission. Standard rejects Sites, images and generic tool/image aliases; a Premium failure cannot create Standard work.
4. Fresh central projection and execution permission determine which assigned account engines can run. Premium retains a rotating cursor among matching models. Standard uses [health-aware rotation](reference/standard-relay-scheduling.md): select the least recently selected eligible account across model subsets, skip current cooldowns/busy engines and allow one ongoing job per account. These are separate from the legacy load-weighted capability index.
5. The engine persists an execution reservation, acquires the existing central account lease and binds the lease before provider I/O. Assignment, revisions, epoch, workload, cooldown and budgets must pass centrally.
6. Renewal remains bound to that exact grant. No peer account, legacy transport, alternate model or automatically retried provider request is selected after failure.

The intended text catalog is the same across pools; a free or paid label does not establish actual access. Premium's first image trial requires its own explicit request and central image grant. Availability reads perform no generation.

## Changes during traffic

A current central projection drives account engine lifecycle. Pause, revocation, removal, expiry or revision changes stop old engines; grant renewal also checks current authority. New work needs current authorization. Saved state and monitor health are observations, not grants.

A central failure invalidates freshness and stops new admission; already issued grants have an independent expiry. Generic transport failure or a 403 does not prove every model on an account is unavailable. Never manually mark health successful to bypass central admission.

## Capacity and fairness

The runtime has bounded concurrent request bookkeeping and per-engine execution bounds. Standard reserves selection before asynchronous forwarding and retains its execution slot through job completion; HTTP acknowledgement does not free it. Provider cooldowns exclude immediately, explicit central denials receive bounded exponential backoff, and no eligible account returns a sanitized `503 service_busy` with a five-second polling hint. The existing central lease/budget ledger owns account capacity; execution-project rows record work and outcomes without reserving a second capacity balance. Product free quotas and Sites fair usage remain separate from provider account class.

Standard's live rotation order is independent of wall-clock timestamps; checkpoints seed first selection only. A pool-wide monotonic budget spaces new recovery selections by at least five seconds while healthy traffic remains available. Repeated quota frames count once per job, fresh reset evidence can extend the wait, and confirmed recovery is checkpointed. After lookup, disconnected callers are discarded before selection and new dispatch rechecks projection freshness. A stale release cannot free a later reservation. These rules do not move or repeat an accepted operation.

Retain the original request key, payload, tenant, origin and epoch. A replay can return an existing text job only when its required original runtime/account context is still available. Images and unavailable original contexts return an unconfirmed result rather than dispatching again. Receipt settlement may retry; synthesis does not.

## Retained legacy routing

The existing single-controller federation retains capability-first eligibility, its reverse index, load comparison, local reservations and generation-bound job references. These rules apply only to its unassigned accounts and original jobs. Its detailed contract is in [legacy API recovery](reference/legacy-federation-api.md#request-recovery) and [legacy operations](maintainers/legacy-federation-operations.md). SDK race/fallback policies do not widen either relay's replay or pool boundary.

See [rate limits](RATE_LIMITS_AND_QUOTAS.md), [queues](QUEUE_SPECIFICATION.md), [API recovery](RELAY_API_REFERENCE.md#request-recovery) and [service operation](runbooks/relay-pool-services.md).
