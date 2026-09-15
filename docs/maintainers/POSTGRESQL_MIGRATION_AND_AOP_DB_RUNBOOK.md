# PostgreSQL migration and recovery operations

<!-- docs-scope: current-guide -->

Private database guide. Read the applicable repository Supabase skills before database changes, then inspect [migration source](../../supabase/migrations), [rollback pairs](../../supabase/rollbacks) and [current incident state](../../post-mortem/CURRENT_STATE.md). This document does not authorize an unrelated production mutation.

## Separate inventory, fixtures and mutation

| Command | Actual role |
| --- | --- |
| `npm run db:status` | Read migration history and compare local files; unavailable history is unknown, not “all applied” |
| `npm run db:verify` | Static integrity checks; not proof a remote schema is applied |
| `npm run test:relay:manual-db` | Desktop enrollment, role denial, race fencing, legacy exclusion and rollback/reapply in the disposable fixture |
| `npm run test:relay:foundation-db` | Dormant central pool/assignment constraints, role denial, conflicting claims and retained rollback/reapply in a disposable fixture |
| `npm run test:relay:authorization-db` | Scoped central authorization and independent execution-schema tests in disposable databases |
| `npm run relay:accounts:status` | Read-only main-project pool counts and activation gates; not serving readiness |
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

The manual desktop migration adds paired nullable provenance columns, a unique binding, protected writer functions and lease admission. It retains old records but excludes unconfirmed ones; deploy the compatible controller/application together and manually confirm accounts. Its DOWN restores older access while retaining provenance columns, so rollback deliberately reopens the former boundary.

Run static integrity, relevant isolated database tests, authorization/adversarial cases and application checks before applying. Verify rollback behavior in the fixture; a safe rollback may intentionally refuse data loss rather than delete new records.

## Apply an approved migration set

Check `supabase db push --help` and the linked target. The September 13 image rollout used:

```sh
supabase db push --linked --skip-vault --dry-run
```

Review the exact pending list and stop if it contains unrelated work. `--skip-vault` preserves the existing vault configuration. After the reviewed migration set is authorized, apply with the same target and `--skip-vault`, omitting `--dry-run`. Supply credentials through the configured private mechanism, not printed URLs or command arguments.

Inspect history and relevant schema/privilege behavior afterward. Deploy compatible application readers and verify the affected path. Database application, site deployment and gateway deployment are distinct events.

## Manual desktop policy inventory and rollout

Migration `20260914231914_manual_desktop_shard_enrollment.sql` is the base manual-desktop provenance policy. The central migrations below extend it for isolated pools; this section describes its original retained-controller rollout. It adds nullable paired enrollment columns and a unique desktop index, protects credential/owner/binding writes, confines private SQL functions to the host administrator, disables generic upsert/service insertion, and checks provenance during lease acquisition. Existing rows are retained and excluded until explicitly confirmed; there is no automatic migration to an enrolled state.

The dedicated helper has three distinct modes:

| Invocation | Effect |
| --- | --- |
| `node --env-file-if-exists=.env.local --import tsx scripts/apply-manual-desktop-enrollment.ts` | Read-only migration, retained-row, binding-count and external-privilege inventory |
| Same command with `--dry-run` | Rehearse the exact unapplied migration in a transaction, verify privileges/retention, then roll back |
| Same command with `--apply` | Apply only that version and record its migration history in the same committed transaction |

Use the isolated `test:relay:manual-db` role/race/rollback suite and broad `db:test` before target changes. The helper preserves already applied history; a no-op on an applied target does not constitute a new migration test. Supply the existing administrator connection privately. Brief DDL locks are bounded by the migration's five-second lock timeout; a timeout requires diagnosis, not repeated unreviewed attempts.

After application, load the compatible controller and application with original desktop homes, signing state, holds and receipts preserved. Verify old process-group termination before a supervised restart, denied external privileges/routes, fresh registry state and desktop-only enrollment access. Then the operator manually signs in and confirms eligible accounts. Deployment does not establish provider capability.

`shards:verify-authority` predates this policy and refuses a migrated target. Do not restore its old upsert authority. [September 15 activation](../../post-mortem/releases/2026-09-15-manual-desktop-enrollment-activation.json) records the existing deployment, while [current state](../../post-mortem/CURRENT_STATE.md) remains the dated operational authority.

## Central relay authorization and execution projects

The main project (`mazhcjisettrzbqhorvp`) owns canonical accounts, manual registration, exclusive fixed-pool assignments, encrypted credentials and the existing authoritative account lease/budget ledger. Foundation `20260915073601` adds four private relations. Authorization `20260915081527` adds six more forced-RLS relations, narrow authenticated service functions, desired/acknowledged revisions, registration tickets and destination-bound 30-second grants. Legacy guard `20260915163434` prevents old desktop enrollment/refresh from mutating an assigned account. Management `20260915191404` adds a forced-RLS immutable registration-management journal, monotonic registration revisions and retained removal markers. No account is assigned automatically.

Management changes require an own-pool operator principal and the displayed revision. Immutable operation IDs bind actor, destination, record and request hash for explicit replay. Rename synchronizes a registered account and its linked registration. Removing an unfinished registration clears tickets/review and permits later restoration with a new review; removing an account permanently revokes central access and marks linked registrations removed. Neither operation deletes assignments, credentials, leases or desktop files. Registration-first row locking orders account removal against registrar work; stale review/tickets cannot finish after removal. The monitor attempts desktop stop only after central commit and reports incomplete cleanup separately. Direct application/service/desktop/control table grants remain denied; status emits selected health metadata without raw provider errors.

The former foundation-only closed CHECK is replaced by owner-controlled registration/execution gates. The restricted `galx_control_service` login can execute the private protocol, but cannot read its tables directly. Scope comes from a hashed principal. The same central lease ledger is used once; legacy acquire/renew/release wrappers deny assigned accounts and bound leases. Do not add a capacity ledger to an execution project.

Each relay project has only migration `20260915082628` from `deploy/relay-execution/supabase/migrations`. Premium is `prgjcyokylzcsqrjmkaa`, Standard is `enbtzuxkguehtnrhuvlu`. Their two forced-RLS tables hold fixed identity and execution reservations/outcomes, without accounts or credentials. Each has its own restricted execution login. Never push the root application migrations to these projects.

The [service runbook](../runbooks/relay-pool-services.md) owns config export, local VM or external-host verification, manual registration and gate transitions. `relay:accounts:status` is read-only inventory, not serving acceptance. Installation IDs alone do not verify physical isolation. The [initial service release](../../post-mortem/releases/2026-09-15-relay-services.json) had both gates closed. The subsequent [local installation](../../post-mortem/releases/2026-09-15-relay-local.json) uses separate Docker VMs on the owner's trusted Mac and records registration open, execution closed and zero assignments. Existing Supabase projects retain their authority; local installation applies no new schema.

Local execution uses the explicit `relay:services:gates -- serve-local` transition only after fresh VM/monitor checks and at least one manually registered account in each pool. External hosting retains the separate `serve /private/host-input.json` procedure. Both use the existing central gate function; neither enables individual accounts or proves provider capability. Follow the owning service runbook and [current state](../../post-mortem/CURRENT_STATE.md), rather than replaying a dated gate transition.

Run `test:relay:authorization-db`, `test:relay:services`, `db:verify` and `db:test`. The management release passed 154 central authorization/lifecycle checks, 50 execution-schema checks and 94 general database tests in disposable databases; 112 migration/rollback pairs passed static verification. Coverage includes concurrent rename, replay, removed-ticket rejection, peer/viewer/runtime denial, name synchronization and retained rollback. The older foundation fixture remains intentionally pinned to its historical boundary. Authorization, guard and management rollbacks close protocol access and retain identities/outcomes; management rollback does not undo removal or restore revoked access. Do not apply the older manual-enrollment rollback to bypass the assignment boundary. The [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) records exact-target application and read-only postmigration checks. [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md) remains proposed; migration application does not automatically accept that decision or certify deployment.

## Recovery and rollback

Do not blindly run a down migration. Inspect what it destroys, its data guards and accepted-operation compatibility. Image receipts must survive rollback when populated. Financial history, idempotency and audit records are not disposable fixtures.

For saturation or outages, inspect the owning connection pool and query classification without exposing credentials. Bound concurrency and retain fail-closed authorization; do not treat transport failure as a valid cached grant or successful mutation. Follow [triage](../../post-mortem/runbooks/triage.md) and preserve the original operation.
