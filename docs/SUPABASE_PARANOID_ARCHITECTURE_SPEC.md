# Supabase authority and operational boundaries

<!-- docs-scope: domain-reference -->

Private component reference, reconciled September 13, 2026. Use [the database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) for current procedures and the actual migrations for object-specific privileges. This reference does not substitute generic policies for reviewed schema.

## Identity and authorization

Application identity is verified server-side. Public Auth credentials can verify a bearer token without constructing an administrator client; a publishable key never grants admin authority. Temporary verification failure must remain distinct from a rejected credential. User IDs and editable metadata are not proof of authorization.

Developer approval, staff membership and resource ownership remain independent current checks. BroccoliDB snapshots and batching optimize payloads, not grants. An unavailable authoritative read cannot become cached permission or a fabricated successful write.

## Database ownership

Use explicit privileges and owner/tenant predicates with RLS appropriate to each table's exposure. Private receipts and staff/preview records are not browser-queryable storage. Do not infer direct access from ordinary authentication or a server role name. Definer functions need an actual justified privilege boundary, fixed trusted search paths, restricted callers and adversarial tests.

Financial, audit and accepted-operation state must commit atomically at their defined boundary. Image receipts commit before async acknowledgement, claims arbitrate dispatch, and success requires owned committed assets. Favorites commit before acknowledgement. Keep record identity across uncertainty rather than manufacturing success from local memory.

## Migrations, tests and evidence

Migration and rollback files are reviewed together. Additive schema may be retained during application rollback; populated records can make destructive rollback intentionally unavailable. Read current CLI help, verify the intended target/pending list, preserve vault configuration and apply only the reviewed set.

`db:status` is inventory; `db:verify` is static verification; `db:test` creates an isolated fixture. The legacy `db:migrate` apply path is disabled. Direct mutation scripts are not automatic release or diagnosis steps. Exact current commands and safeguards live in [the runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

Record source, migration application, deployment and actual-client results separately in [post-mortem](../post-mortem/README.md). Keep secrets, dumps, topology and operational diagnostics out of public documentation and browser artifacts.
