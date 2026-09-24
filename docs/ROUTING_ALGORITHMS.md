# Relay selection and admission

<!-- docs-scope: current-guide -->

Private routing contract for [central account authority and isolated pools](ARCHITECTURE.md). Source behavior and [dated acceptance](../post-mortem/CURRENT_STATE.md) are separate from rollout intent.

## Selection

1. The application verifies customer identity, product permission and owner scope.
2. With `GALX_ISOLATED_RELAYS_ENABLED=1`, deployment policy chooses Premium for text, Sites and images. Alternatively, `GALX_PREMIUM_IMAGES_ENABLED=1` routes image availability and generation to Premium independently (requiring only `GALX_PREMIUM_RELAY_URL` and `GALX_PREMIUM_RELAY_KEY`).
3. The Premium runtime rejects unsupported workloads before provider admission and accepts client-owned function calling as text inference. There is no alternate pool destination.
4. Fresh central projection and execution permission determine which assigned account engines can run. Premium uses health-aware rotation: select the least recently selected eligible account across model subsets and skip current cooldowns/full engines. Healthy Premium accounts have four slots; recovering accounts have one probe. These are separate from the legacy load-weighted capability index.
5. The engine persists an execution reservation, acquires the existing central account lease and binds the lease before provider I/O. Assignment, revisions, epoch, workload, cooldown and budgets must pass centrally.
6. Renewal remains bound to that exact grant. No peer account, legacy transport, alternate model or automatically retried provider request is selected after failure.

Provider account labels do not establish actual access. Premium's first image trial requires its own explicit request and central image grant. Availability reads perform no generation.

## Changes during traffic

A current central projection drives account engine lifecycle. Pause, revocation, removal, expiry or revision changes stop old engines; grant renewal also checks current authority. New work needs current authorization. Saved state and monitor health are observations, not grants.

A central failure invalidates freshness and stops new admission; already issued grants have an independent expiry. Generic transport failure or a 403 does not prove every model on an account is unavailable. Never manually mark health successful to bypass central admission.

## Capacity and fairness

The runtime bounds submissions before parsing/lookup, with per-owner allowances and separate observation/subscription admission. These process-local concurrency limits do not replace customer spend policy or provide independent database capacity. It also retains per-engine execution bounds. Premium reserves selection before asynchronous forwarding and retains execution slots through job completion; HTTP acknowledgement does not free it. Provider cooldowns exclude immediately, explicit central denials receive bounded exponential backoff, and no eligible account returns a sanitized `503 service_busy` with a five-second polling hint. The existing central lease/budget ledger owns account capacity; execution-project rows record work and outcomes without reserving a second capacity balance. Product free quotas and Sites fair usage remain separate from provider account class.

Each pool's live rotation order is independent of wall-clock timestamps; checkpoints seed first selection only. A pool-wide monotonic budget spaces new recovery selections by at least five seconds while healthy traffic remains available. Repeated quota frames count once per job, fresh reset evidence can extend the wait, and post-cooldown probe success is required to clear recovery. An older sibling success cannot substitute for a probe; transient-failure cooldowns and recovery are checkpointed. After lookup, disconnected callers are discarded before selection and new dispatch rechecks projection freshness. A stale release cannot free a later reservation. These rules do not move or repeat an accepted operation.

Retain the original request key, payload, tenant, origin and epoch. A replay can return an existing text job only when its required original runtime/account context is still available. Images and unavailable original contexts return an unconfirmed result rather than dispatching again. Receipt settlement may retry through one coalesced, bounded pass with backoff; durably completed local slots do not wait for remote settlement. Synthesis does not retry.

## Automatic agent tool turns

The [function-tool contract](reference/automatic-agent-tools.md) forwards bounded definitions and correlated tool results, and returns complete allowlisted calls only after successful model completion. Registered callbacks execute in the SDK caller. Every follow-up inference retains its own request identity and normal quota/account admission; an automatic tool loop cannot create relay-host shell access, widen a pool or repeat uncertain work.

## Retained legacy routing

The existing single-controller federation retains capability-first eligibility, its reverse index, load comparison, local reservations and generation-bound job references. These rules apply only to its unassigned accounts and original jobs. Its detailed contract is in [legacy API recovery](reference/legacy-federation-api.md#request-recovery) and [legacy operations](maintainers/legacy-federation-operations.md). SDK race/fallback policies do not widen either relay's replay or pool boundary. [Bounded continuation](reference/shared-quota-recovery.md) preserves completed callback results and original turn limits; it creates a deliberate next step rather than moving accepted work.

See [rate limits](RATE_LIMITS_AND_QUOTAS.md), [queues](QUEUE_SPECIFICATION.md), [API recovery](RELAY_API_REFERENCE.md#request-recovery) and [service operation](runbooks/relay-pool-services.md).
