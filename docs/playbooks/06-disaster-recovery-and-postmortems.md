# Recovery and post-mortem records

<!-- docs-scope: current-guide -->

Use [post-mortem](../../post-mortem/README.md) as the single incident system. [Triage](../../post-mortem/runbooks/triage.md) owns containment and recovery; [documentation workflow](../../post-mortem/runbooks/documentation.md) owns the rolling log, follow-ups and source-bound review.

Recover under the component's actual authority. Preserve controller signing state, worker checkpoints, database/financial history and accepted-operation records. These stores do not jointly guarantee exactly-once execution. Reconcile an uncertain original side effect before admitting another.

Follow [release rollback](../maintainers/RELEASE_ENGINEERING_AND_VERSIONING.md) and [database operations](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md), rather than blindly restoring a previous build or dropping the latest migration. Require actual affected-client acceptance after restoration.

Every record includes impact, dated observations, cause/evidence, containment, recovery, verification limits and concrete prevention actions. A `recovered` incident can still have open work; `closed` requires completed or explicitly accepted follow-ups. Historical incidents remain preserved in [the incident index](../../post-mortem/INCIDENTS.md).
