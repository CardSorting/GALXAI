# Maintainer debugging and diagnostics

<!-- docs-scope: current-guide -->

Private incident entry point. Follow [triage](../../post-mortem/runbooks/triage.md), [known failure modes](../../post-mortem/failure-modes/README.md) and the [rolling log](../../post-mortem/ROLLING_LOG.md). Identify the component and operation state before changing anything.

| Symptom | Diagnostic boundary | Procedure |
| --- | --- | --- |
| Pool monitor inaccessible or identity check fails | Fixed launcher, owning VM/daemon, TLS and peer firewall | [Service installation](../runbooks/relay-pool-services.md) |
| Account needs attention or saved change unconfirmed | Health reason, current sign-in, gate, applied revision and epoch | [Account management](../reference/relay-account-management.md) |
| Rename/remove response conflicts or is lost | Central expected revision and same-intent operation identity | [Management recovery](../reference/relay-account-management.md) |
| Removed desktop still running | Central removal is retained; stop cleanup independently | [Monitor operations](RELAY_DESKTOPS.md) |
| Images/Favorites say session expired | Verified Auth rejection vs transport/configuration failure | [Identity failures](../../post-mortem/failure-modes/identity.md) |
| Accepted image disappears or fails | Durable receipt, claim, storage and serving generation path | [Image recovery](../../post-mortem/runbooks/image-generation.md) |
| Retained controller will not start | Supervisor, exact process identity, listener and kernel-held namespace guard | [Controller ownership](../../post-mortem/runbooks/controller-lock.md) |
| Deployment storage exhausted | Complete deployment inventory, aliases and accounting window | [Storage containment](../../post-mortem/runbooks/deployment-storage.md) |
| Database saturation | Owning pool, bounded concurrency, query/error classification | [Database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md), [egress evidence](../../post-mortem/incidents/2026/2026-09-09-egress/README.md) |
| Credential/capability unavailable | Current authority revision and fresh attributable evidence | [Enrollment](RELAY_CREDENTIAL_ENROLLMENT.md), [fleet](RELAY_QUOTA_AND_FLEET.md) |
| Sites pending or publication unavailable | Original operation, entitlement, receipt and publication state separately | [Sites operations](SITES_OPERATIONS.md) |

## Diagnostic safety

Inspect credential presence/type and private error classification without printing secrets. Do not run vault-population, environment-sync, seed or migration scripts as read-only tests. Preserve existing encrypted state; changing the vault root is not a decryption repair.

A timeout or database checkout error is not proof of credential rejection, exhausted supplier quota or non-dispatch. Observe lease/receipt authority before release or retry. Do not force a healthy state from telemetry, clear cooldowns without attributable evidence, or replay an uncertain operation.

Do not switch database connection modes, remove leases or restart workers based only on a generic symptom. Confirm the owning code and current configuration; historical port/default examples are not production authority. Use isolated fixtures to test suspected changes.

## Completion

Record evidence and each bounded intervention. Require actual affected-client acceptance and persistence verification before calling service recovered. Add a regression check and any remaining prevention action. Update affected guides in full and run `npm run docs:check`; keep operational details out of customer responses.
