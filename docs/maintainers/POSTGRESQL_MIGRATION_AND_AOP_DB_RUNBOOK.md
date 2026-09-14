# PostgreSQL migration and recovery operations

<!-- docs-scope: current-guide -->

Private database guide. Read the applicable repository Supabase skills before database changes, then inspect [migration source](../../supabase/migrations), [rollback pairs](../../supabase/rollbacks) and [current incident state](../../post-mortem/CURRENT_STATE.md). This document does not authorize an unrelated production mutation.

## Separate inventory, fixtures and mutation

| Command | Actual role |
| --- | --- |
| `npm run db:status` | Read migration history and compare local files; unavailable history is unknown, not “all applied” |
| `npm run db:verify` | Static integrity checks; not proof a remote schema is applied |
| `npm run db:test` | Full suite against an isolated disposable PostgreSQL fixture |
| `npm run test:image:library-db` | Large-library pagination, role, old-asset and rollback checks against 50,000 owned fixture images |
| `npm run test:relay:image` | Historical command name for isolated object/catalog consistency, decoding and ownership checks; no live relay or generation |
| `npm run test:free-quota:db` | Private allowance enrollment, concurrent deductions, retries, non-start release and retained rollback in an isolated fixture |
| `npm run test:image:db` | Image receipts/Favorites suite against that isolated fixture |
| `npm run db:migrate` | Legacy manager apply action is intentionally disabled; not the production migration workflow |
| `npm run db:push` | Direct migration mutation script; not a harmless preflight and not the default workflow below |

Inspect scripts before execution. Never disable fixture guards or point integration tests at production. Do not rely on hardcoded historical migration/test counts. Record exact versions and results in dated evidence.

## Prepare and validate

Use the current Supabase CLI help to discover syntax. For this imperative repository, create a migration using `supabase migration new`, add its paired rollback and keep generated types consistent. Describe affected objects, authority, data volume, lock impact, compatibility and rollback limits before remote mutation.

Prefer additive rollout and preserve readers for already accepted operations. Review actual PostgreSQL lock/transaction behavior; concurrent index creation is not “zero lock” and cannot be placed blindly inside a transaction. A populated-table change needs a plan based on its data and query workload.

Keep private operation tables unavailable to browser database roles. RLS, explicit privileges and owner predicates are complementary. Do not copy blanket service-role grants or add `SECURITY DEFINER` to bypass a permission error. Privileged functions need justified callers, fixed trusted search paths and targeted tests.

The [large-library migration](image-library-scale.md#validation-rollout-and-recovery) adds partial ordering indexes and a page-only function. Review writer-blocking index creation against the target size/load; its timeout bounds are not a zero-lock promise. Apply it before dependent application readers.

The [free-generation migrations](FREE_GENERATION_QUOTA.md) add private grants/usage, followed by the aggregate policy, capacity flag, bounded-query indexes and Sites tier. Apply both in timestamp order before dependent handlers. The aggregate policy seeds paused; its DOWN file disables new free admission while retaining every record. The older quota DOWN only reasserts privileges. Use the compatible gate or a Pro-only application rollback, never the earlier unbounded free implementation.

Run static integrity, relevant isolated database tests, authorization/adversarial cases and application checks before applying. Verify rollback behavior in the fixture; a safe rollback may intentionally refuse data loss rather than delete new records.

## Apply an approved migration set

Check `supabase db push --help` and the linked target. The September 13 image rollout used:

```sh
supabase db push --linked --skip-vault --dry-run
```

Review the exact pending list and stop if it contains unrelated work. `--skip-vault` preserves the existing vault configuration. After the reviewed migration set is authorized, apply with the same target and `--skip-vault`, omitting `--dry-run`. Supply credentials through the configured private mechanism, not printed URLs or command arguments.

Inspect history and relevant schema/privilege behavior afterward. Deploy compatible application readers and verify the affected path. Database application, site deployment and gateway deployment are distinct events.

## Recovery and rollback

Do not blindly run a down migration. Inspect what it destroys, its data guards and accepted-operation compatibility. Image receipts must survive rollback when populated. Financial history, idempotency and audit records are not disposable fixtures.

For saturation or outages, inspect the owning connection pool and query classification without exposing credentials. Bound concurrency and retain fail-closed authorization; do not treat transport failure as a valid cached grant or successful mutation. Follow [triage](../../post-mortem/runbooks/triage.md) and preserve the original operation.
