# Resilience and recovery

<!-- docs-scope: current-guide -->
> Private recovery guidance. Use the [federation contract](FEDERATION_STRATEGY.md) and [runbook](RELAY_VNEXT_RUNBOOK.md).

| Failure | Recovery boundary |
| --- | --- |
| Empty/stale model evidence | Remove admission eligibility; retain worker and rediscover |
| Credential 401 | Persist revision rejection; repair authority before starting again |
| Inventory timeout, 403 or 5xx | Back off; do not permanently reject from this evidence alone |
| Registry unavailable | Fail authority checks; never populate from host caches |
| Held worker needs repair | Preserve it and accepted work; pause new admissions/replacement |
| Revoked, removed, expired or changed authority | Retire old worker even if held |
| Lost acknowledgement | Reconcile same receipt/job; do not repeat synthesis blindly |
| Controller restart | Browser sessions/admission receipts are process-local; preserve durable text receipts and private signing/state |
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

Process-local admission receipts do not survive controller restart, expired receipt windows can permit new execution, and missing artifacts are not recovered merely by polling. Keep uncertain outcomes explicit. Physical phone input, guest semantic accessibility and live provider sign-in require their own verification. Use the [dated record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md), not old test counts, to assess deployment.
