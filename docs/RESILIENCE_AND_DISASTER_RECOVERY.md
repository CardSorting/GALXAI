# Resilience and recovery

<!-- docs-scope: current-guide -->

Identify the affected component in [current state](../post-mortem/CURRENT_STATE.md), then use [incident operations](../post-mortem/README.md) and the owning runbook. New pool services and the retained legacy controller have different recovery contracts.

| Failure | Recovery boundary |
| --- | --- |
| Local monitor unavailable | Open the fixed native app; inspect its owning VM, reviewed images and central dependency |
| Runtime cannot claim ownership | Respect the greater-than-60-second central stale-owner interval; never override epoch/identity |
| Central unavailable | Stop new registration/grants; active grants expire independently; restore central authority |
| Own execution database unavailable | Retain reservation/terminal intent, block unsafe new admission, settle original leases after recovery |
| Standard returns `service_busy` | Respect the polling hint; [rotation](reference/standard-relay-scheduling.md) excludes busy/cooling accounts. No peer borrowing or account removal solely for saturation |
| Account sign-in expired | Manually sign in in its bound desktop and explicitly save through the registrar |
| Saved update not confirmed | Inspect owning runtime, revision and heartbeat; do not mark applied from the database write alone |
| Account or registration removed | Keep history; registered accounts cannot restore, unfinished registrations require fresh review after Restore |
| Removed desktop failed to stop | Registration → Removed → Stop desktop; central revocation remains saved |
| Lost bound home or conflicting assignment | Preserve authority and investigate; no automatic rebind, credential import or pool move |
| Unknown admission or old epoch | Preserve original record/tenant/destination; never redispatch to the peer or legacy transport |
| Application image process changes | Read the durable owner receipt; claimed uncertainty does not authorize redispatch |
| Legacy controller lock/worker failure | Use its guardian/namespace procedure; do not apply it to pool epochs or Colima identity |

## Preserve before repair

Record the original operation, pool/installation, account revision and safe error classification privately. Preserve main-project accounts, assignments, removed markers, immutable journals, leases, execution rows, component keys, TLS trust, guest homes and state volumes. Backups can contain credentials or unfinished content.

Pool Pause saves central state and blocks old authorization; it does not promise the legacy behavior of preserving a held worker while all accepted work drains. Inspect active work before intervention. Do not clear cooldowns, counters or records to manufacture capacity.

## Restore and verify

Restore the same local identities/configuration, use reviewed image pins and start through `relay:local`. Verify own-pool sessions, TLS, peer denial and fresh central authorization before opening execution. Startup must not replace immutable installation identity or borrow another pool's config.

Registration, execution gate, account Enable and successful provider qualification are separate checkpoints. Keep external ingestion closed. Account refresh uses manual sign-in and explicit central save; it never restores another account or a removed registered account. A stopped sign-in desktop can be normal for a healthy registered account.

Removal commits before local stop. Retained files are not an active registration, and Restore does not reinstate old tickets/review. New display connections/direct actions deny removed records; Stop remains for cleanup. Missing homes require explicit recovery, not generic Delete/recreate.

## Sites financial and delivery recovery

Keep original invocation, owner, grant, origin and receipt identity. Isolated Sites stays on Premium. New-runtime epoch/account loss may prevent result retrieval even when execution records remain; there is no receipt relocation to Standard. Historical legacy signed receipts have their own retained-volume exception, documented in [legacy API](reference/legacy-federation-api.md#durable-sites-text-contract).

Included generation recovery does not charge or generate again. Proven non-dispatch can release the corresponding grant under its product policy; unknown completion retains occupancy. Historical wallet holds and native publication intents keep their original settlement/external-effect contracts. See [Sites rollback](maintainers/SITES_FAIR_USAGE.md#rollback).

## Limits

Central and execution writes are ordered with retained uncertainty, not one cross-database transaction or exactly-once provider execution. Short grants and local network checks do not prove physical-machine independence. Keep unknown outcomes explicit and record actual acceptance separately from fixtures.

The retained [legacy operations](maintainers/legacy-federation-operations.md) document kernel guards, guardian restart budgets, per-shard Docker workers, hold/adoption and admission tombstones. Those services remain separate from the new pool setup and historical requests must keep their original readers. Use [service rollback](runbooks/relay-pool-services.md#recovery-and-rollback) for the installed pools.
