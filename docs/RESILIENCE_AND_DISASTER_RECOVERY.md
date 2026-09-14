# Resilience and recovery

<!-- docs-scope: current-guide -->
> Private recovery guidance. Use [incident operations](../post-mortem/README.md), [current state](../post-mortem/CURRENT_STATE.md), the [federation contract](FEDERATION_STRATEGY.md) and [runbook](RELAY_VNEXT_RUNBOOK.md).

| Failure | Recovery boundary |
| --- | --- |
| Application async image process changes | Retrieve the durable owner-scoped PostgreSQL receipt; a queued unclaimed request can resume, a claimed uncertain attempt cannot redispatch |
| Stopped controller with old lock | New launcher/guardian recovers after process-group termination; legacy or ambiguous marker follows [guarded ownership recovery](../post-mortem/runbooks/controller-lock.md); never remove a live/ambiguous owner |
| Auth transport unavailable | Keep it distinct from invalid credentials; no cached identity grant or forced sign-out workaround |
| Empty/stale model evidence | Remove admission eligibility; retain worker and rediscover |
| Credential 401 | Persist revision rejection; repair authority before starting again |
| Inventory timeout, 403 or 5xx | Back off; do not permanently reject from this evidence alone |
| Federation worker stopped or disappeared | Controller-only replacement with exponential backoff; five attempts in ten minutes then `worker_restart_budget_exhausted` and operator inspection |
| Worker/controller operation stalls | Per-operation deadlines and external guardian escalation; retain uncertain mutation/receipt evidence and never replay blindly |
| Registry unavailable | Fail authority checks; never populate from host caches |
| Held worker needs repair | Preserve it and accepted work; pause new admissions/replacement |
| Revoked, removed, expired or changed authority | Retire old worker even if held |
| Lost acknowledgement | Reconcile same receipt/job; do not repeat synthesis blindly |
| Controller restart | The guardian recovers one owner; admission identity tombstones persist while response bodies and browser sessions remain process-local; preserve durable text receipts and private signing/state |
| Worker generation gone | Stream/cancel cannot move; opted-in receipt reads can use the original retained volume |
| Credential checkpoint failure | Report explicit error; recover private intent without overwriting newer authority |
| Desktop inventory failure | Retain record, report unavailable; do not infer deletion or recreate blindly |

## Preserve before repair

Record the affected shard revision, worker generation, request ID and structured event privately. Pause the linked shard if preserving its worker is needed. A pause blocks new work and replacement starts; accepted work can complete. It does not override registry revocation, expiry or rotation.

Preserve the controller signing secret, rejection/maintenance journals, desktop journal, guest home volumes and worker checkpoints according to their data sensitivity. Worker checkpoints can contain unfinished prompts; guest homes can contain login credentials. A backup is sensitive even when registry tokens are encrypted.

## Restore and verify

Establish one controller owner, restore compatible private state and reconnect through the host launcher. Graceful stop removes unheld workers, so do not assume every restart preserves container identity. Verify ownership and generation before resuming.

Credential sync uses a durable intent and compare-and-swap: finalize an already committed replacement or retry unchanged authority, never overwrite a newer external revision. Separate journal and registry stores are not atomically committed together.

Closing a desktop viewer is safe for ongoing processes. Stop preserves home; deletion requires explicit confirmation and removes owned resources. Preview cleanup must not select production desktops by a broad name pattern.

## Sites financial and delivery recovery

Keep original invocation identity, grant, relay origin/reference, receipt volume and federation signing authority. Included Sites recovery reads the original outcome without payment or repeat generation. Confirmed non-dispatch can release a grant once; unknown or missing evidence retains occupancy. Historical wallet holds retain their accepted pricing/reconciliation records. Disabling new admission or losing paid entitlement must not disable existing-operation recovery.

The companion independently retains immutable archives, upload intent, saved-version acknowledgement and publication locks. Recovery must observe the original external effect. A missing upload/deployment acknowledgement cannot be repaired by publishing another version. See [Sites operations](maintainers/SITES_FAIR_USAGE.md#rollback) for retained-state limits and compatible rollback.

## Limits

Relay admission identity tombstones survive controller restart, while response bodies and the in-memory response cache do not; response bodies have a ten-minute cache window, then completed identities remain as permanent `unknown` tombstones. Their window and scope are separate from the application's durable image receipts. Pending entries become unknown, and losing a relay acknowledgement never permits another image dispatch. Missing artifacts are not recovered merely by polling. Keep uncertain outcomes explicit. Physical phone input, guest semantic accessibility and live provider sign-in require their own verification. Use [current state and linked dated records](../post-mortem/CURRENT_STATE.md), not old test counts, to assess deployment.
