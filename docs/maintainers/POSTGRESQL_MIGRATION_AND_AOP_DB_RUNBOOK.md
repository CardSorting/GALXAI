# PostgreSQL migration and recovery operations

<!-- docs-scope: current-guide -->

Private database guide. Read the applicable repository Supabase skills before database changes, then inspect [migration source](../../supabase/migrations), [rollback pairs](../../supabase/rollbacks) and [current incident state](../../post-mortem/CURRENT_STATE.md). This document does not authorize an unrelated production mutation.

## Separate inventory, fixtures and mutation

| Command | Actual role |
| --- | --- |
| `npm run db:status` | Read migration history and compare local files; unavailable history is unknown, not “all applied” |
| `npm run db:verify` | Static integrity checks; not proof a remote schema is applied |
| `npm run test:relay:manual-db` | Desktop enrollment, role denial, race fencing, legacy exclusion and rollback/reapply in the disposable fixture |
| `npm run test:relay:authorization-db` | Scoped central authorization and independent execution-schema tests in disposable databases |
| `npm run test:relay:refill-db` | Exact operational refill, original failure, boundaries, persisted restart, concurrent admission and retained rollback in the disposable final-chain fixture |
| `npm run relay:accounts:status` | Read-only main-project pool counts and activation gates; not serving readiness |
| `npm run db:test` | Full suite against an isolated disposable PostgreSQL fixture |
| `npm run test:auth:db` | Final-chain session lookup, owner/revocation checks, isolated schema privileges and retained rollback/reapply; never repairs historical grants before its first assertion |
| `npm run test:image:library-db` | Large-library pagination, role, old-asset and rollback checks against 50,000 owned fixture images |
| `npm run test:relay:image` | Historical command name for disposable catalog and synthetic signed object HTTP; missing private-storage denial, sanitized bytes, bucket separation, manifest consistency and ownership; no live storage, relay or generation |
| `npm run test:free-quota:db` | Retired free entry-point denial, unchanged ledger, purchased image isolation, historical policy compatibility/races, role denial and retained rollback in an isolated fixture |
| `npm run test:image:db` | Image receipts/Favorites suite against that isolated fixture |
| `npm run db:migrate` | Legacy manager apply action is intentionally disabled; not the production migration workflow |
| `npm run db:push` | Direct migration mutation script; not a harmless preflight and not the default workflow below |

Inspect scripts before execution. Never disable fixture guards or point integration tests at production. Do not rely on hardcoded historical migration/test counts. Record exact versions and results in dated evidence.

The general database suite has no object-storage credentials and verifies that
the private image adapter rejects upload before any transport call. Do not
restore the retired generic `uploadAsset` method or its public-URL expectation
to repair a fixture. Successful private uploads, image re-encoding, stripped
metadata, private object headers and remote-URL rejection are exercised by
`scripts/test-private-image-storage.ts` in `npm run test:image:security` using
a synthetic storage transport. Neither check constitutes live R2 acceptance.

## Prepare and validate

Use the current Supabase CLI help to discover syntax. For this imperative repository, create a migration using `supabase migration new`, add its paired rollback and keep generated types consistent. Describe affected objects, authority, data volume, lock impact, compatibility and rollback limits before remote mutation.

Prefer additive rollout and preserve readers for already accepted operations. Review actual PostgreSQL lock/transaction behavior; concurrent index creation is not “zero lock” and cannot be placed blindly inside a transaction. A populated-table change needs a plan based on its data and query workload.

Keep private operation tables unavailable to browser database roles. RLS, explicit privileges and owner predicates are complementary. Do not copy blanket service-role grants or add `SECURITY DEFINER` to bypass a permission error. Privileged functions need justified callers, fixed trusted search paths and targeted tests.

The [large-library migration](image-library-scale.md#validation-rollout-and-recovery) adds partial ordering indexes and a page-only function. Review writer-blocking index creation against the target size/load; its timeout bounds are not a zero-lock promise. Apply it before dependent application readers.

### Private Explore hide preferences

Migration `20260920120000_personal_explore_hide_controls.sql` replaces the old
anonymous/global Explore hide mutation with an additive, account-scoped
preference. The application must verify an interactive signed-in session before
calling the narrow service function; developer API keys, anonymous callers and
caller-supplied viewer IDs are not valid authorities. The preference table is
closed to browser database roles and forced through RLS as defense in depth.

The mutation preserves the public product boundary: it filters only the current
viewer's Explore response, never changes `user_image_library` publication state,
and is deliberately omitted from the Star profile projection. The active list
is capped at 500. A private per-account rate ledger records successful new hides
so undo cannot be used to evade the 30-per-ten-minute or 200-per-day limits;
duplicate hides are idempotent and undo is reversible without replenishing the
allowance. Unknown showcase IDs return a client-only outcome and do not create
rows. The old global function and moderation-event table are closed to browser
roles; historical records remain retained for operators and are not a user
report queue.

Follow-up migration `20260920123000_personal_explore_hide_privilege_repair.sql`
explicitly revokes any inherited `service_role` table privileges before
regranting the exact operations required by the server function. This repair is
fail-closed on rollback and does not restore broad service or browser access.

Before application, run the targeted adversarial suite, the full image security
suite, `npm run db:verify`, and a production build. Rehearse the exact migration
with `node --env-file-if-exists=.env.local --import tsx scripts/push-migrations-direct.ts --dry-run --version 20260920120000` and the privilege repair with the corresponding `20260920123000` version; inspect that both are the only pending versions. The paired DOWN files remove only the new preference objects or retain the restricted privilege boundary and intentionally do not reopen the retired anonymous/global path; restore by reapplying the UP migrations, not by manually granting the old function. After application, verify migration history, table/function privileges, private cache headers for authenticated Explore reads, and that a Star profile still returns its complete public gallery. Do not apply these migrations to a relay execution project.

The historical [free-generation migrations](FREE_GENERATION_QUOTA.md) retain
private grants/usage, the aggregate policy, capacity flag, bounded-query indexes
and Sites tier. Preserve their order in the complete migration chain; they do
not authorize new free grants or reactivate retired handlers. The aggregate
policy seeds paused; its DOWN file disables admission while retaining every
record, and the older quota DOWN only reasserts privileges. Current free Site
entry points reject, the compatibility quota reader returns zeros, and private
human images require purchased allowance reservations. A rollback must preserve
that retirement and existing owner/accounting records; never restore an earlier
free implementation to satisfy a historical fixture. The quota integration
command distinguishes current retirement/isolation checks from low-level
historical ledger/policy compatibility. Current image accounting lifecycle tests
remain in `test:image:db`.

### Durable Star follows

Migration `20260924010000_user_star_follows.sql` establishes the `private.user_star_follows`
table for the Phase 2 agent publishing architecture ("Stars create. Humans discover, follow, save, collect, and share").
It persists human-to-Star follow relationships with zero generative inference demand or agent triggers.
The table is enclosed in the `private` schema with default-deny Row Level Security (`REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT ALL TO service_role;`), indexed by both `star_handle` and `user_id`, and has a deterministic rollback via `supabase/rollbacks/20260924010000_user_star_follows.down.sql`.


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

The main project (`mazhcjisettrzbqhorvp`) owns canonical accounts, manual registration, exclusive fixed-pool assignments, encrypted credentials and the existing authoritative account lease/budget ledger. Foundation `20260915073601` adds four private relations. Authorization `20260915081527` adds six more forced-RLS relations, narrow authenticated service functions, desired/acknowledged revisions, registration tickets and destination-bound 30-second grants. Legacy guard `20260915163434` prevents old desktop enrollment/refresh from mutating an assigned account. Management `20260915191404` adds a forced-RLS immutable registration-management journal, monotonic registration revisions and retained removal markers. Connection lifecycle `20260916013944` adds irreversible credential retirement markers plus private connection state/rejected revision/verification time, atomic Connect, revision-fenced credential-failure reporting and same-account reconnect. Its migration briefly grants private-schema CREATE to the no-login writer for helper ownership transfer, then revokes it in the same transaction; production provisioning had already removed that privilege. No account is assigned or retired without its explicit manual Connect or owner retirement action. Automatic activation `20260916040459` adds a private policy boolean and owner-only verified configuration, enables only new successful connections atomically, and reconciles the owning execution gate on connection/heartbeat. Existing paused accounts and reconnect intent are preserved.

Management changes require an own-pool operator principal and the displayed revision. Immutable operation IDs bind actor, destination, record and request hash for explicit replay. Rename synchronizes a registered account and its linked registration. Removing an unfinished registration clears tickets/review and permits later restoration with a new review; removing an account permanently revokes central access and marks linked registrations removed. Neither operation deletes assignments, credentials, leases or desktop files. Registration-first row locking orders account removal against registrar work; stale review/tickets cannot finish after removal. The monitor attempts desktop stop only after central commit and reports incomplete cleanup separately. Direct application/service/desktop/control table grants remain denied; status emits selected health metadata without raw provider errors.

The former foundation-only closed CHECK is replaced by owner-controlled registration/execution gates with a persistent verified automatic-activation policy. Ordinary owner gate configuration disarms automation, preserving emergency closure across runtime restart. The restricted `galx_control_service` login can execute the private protocol, but cannot read its tables directly. Scope comes from a hashed principal. The same central lease ledger is used once; legacy acquire/renew/release wrappers deny assigned accounts and bound leases. Do not add a capacity ledger to an execution project.

The Premium execution project (`prgjcyokylzcsqrjmkaa`) has execution migrations `20260915082628` and `20261003195250` from `deploy/relay-execution/supabase/migrations`. Its two forced-RLS tables hold fixed identity and execution reservations/outcomes, without accounts or credentials. The second migration replaces only the scoped function so recovery and finish preserve null provider evidence; it rewrites no retained row and changes no privilege. Apply execution changes only to the matching project under its scoped drain/rollback procedure. It has its own restricted execution login. Never push the root application migrations to this project.

The [service runbook](../runbooks/relay-pool-services.md) owns config export, local VM or external-host verification, manual registration and gate transitions. `relay:accounts:status` is read-only inventory, not serving acceptance. Installation IDs alone do not verify physical isolation. The [initial service release](../../post-mortem/releases/2026-09-15-relay-services.json) had both gates closed. The subsequent [local installation](../../post-mortem/releases/2026-09-15-relay-local.json) uses separate Docker VMs on the owner's trusted Mac and records registration open, execution closed and zero assignments. Existing Supabase projects retain their authority; local installation applies no new schema.

Local installation uses `relay:services:gates -- serve-local` once after fresh VM/monitor checks to configure automatic activation before onboarding. External hosting uses `serve /private/host-input.json`. Neither requires an account in the other pool: new verified connections enable in their transaction, and own-runtime readiness opens the gate. Existing account pauses remain untouched. Neither path proves provider generation capability. Follow the owning service runbook and [current state](../../post-mortem/CURRENT_STATE.md), rather than replaying a dated gate transition.

Run `test:relay:activation-db`, `test:relay:authorization-db`, `test:relay:services`, `db:verify` and `db:test`. The management release passed 154 central authorization/lifecycle checks, 50 execution-schema checks and 94 general database tests in disposable databases; 112 migration/rollback pairs passed static verification. Coverage includes concurrent rename, replay, removed-ticket rejection, peer/viewer/runtime denial, name synchronization and retained rollback. The older foundation fixture remains intentionally pinned to its historical boundary. Authorization, guard and management rollbacks close protocol access and retain identities/outcomes; management rollback does not undo removal or restore revoked access. Do not apply the older manual-enrollment rollback to bypass the assignment boundary. The [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) records exact-target application and read-only postmigration checks. [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md) remains proposed; migration application does not automatically accept that decision or certify deployment.

For deliberate legacy cleanup, follow the [retirement contract](../reference/relay-account-management.md#retire-obsolete-legacy-credentials). Preview and commit an explicit locked ID set through the owner-only function, assert no desktop binding, assignment, live lease or in-flight count, and retain aggregate evidence. Encrypted material is irrecoverably erased; identifiers and history remain. The paired lifecycle DOWN closes both gates/protocol and preserves tombstones and rejected-token evidence. Test fixtures verify application/relay-role denial, atomic rollback, fresh-token reconnect and protection against restoration. Do not restore old credential backups as an availability shortcut.

## Account-session schema isolation

`20260916161120_isolate_account_session_lookup.sql` repairs the interaction between the September 13 account lookup and later operational-schema revocations. It moves the existing fixed-search-path definer into non-exposed `galx_account_auth`, preserves its owner/body and claim predicates, and retargets the public boolean invoker wrapper. Only authenticated accounts may use the new schema and execute that helper. No session-table, schema-CREATE or operational-schema grants are added; no account/session data changes. The two-second lock and ten-second statement limits bound DDL waits.

Apply only to the main application project after inspecting the pending set. Run `test:auth:db`, `db:test`, static checks, API authorization and the production build first. Inspect the live wrapper and schema/function privileges afterward, then verify existing-browser entry and live owner/revocation behavior. Replaying the original liveness migration as a fixture setup hid this failure; final-chain acceptance must run before any migration replay. The paired DOWN preserves data and moves the helper back, but restores the unavailable dependency while `private` remains closed. Recovery is reapplying UP, not restoring browser access to operational objects. The public RPC signature is unchanged, so no application deployment is required for this repair. [Workspace auth](../operations/workspace-auth.md#active-session-rollout-and-recovery) owns the full acceptance procedure.

## Exact operational refill

`20261003202702_relay_refill_integer_credit.sql` is a staged primary-database correction for ACT-041. It adds nullable internal BIGINT numerators to the existing account table and replaces only the arithmetic block in `private.relay_base_acquire`. Each numerator is bounded below `3,000,000,000`; that denominator preserves existing nine-decimal credit and represents integer units/minute at millisecond resolution exactly. Legacy fractions initialize the new fields once under the account row lock. There is no backfill, new ledger, entitlement change, execution-record update or new exposed field. Existing function signature, invoker privileges, search path, locking, permission checks and admission rules remain in force. [Account management](../reference/relay-account-management.md#exact-operational-refill) owns the invariant.

The additive table change and constraint validation require a brief table lock; three-second lock and ten-second statement limits bound the attempt. The October 3 read-only primary inventory had 157 applied versions and two pending versions: this correction and unrelated Orbit `20260926081213`. Do not push that pending set wholesale. After separately authorizing deployment, inspect the exact target/history and rehearse only this version with `node --env-file-if-exists=.env.local --import tsx scripts/push-migrations-direct.ts --dry-run --version 20261003202702` before using the scoped mutation procedure above. This migration never belongs in the execution project.

Before target application, retain the fixture evidence from `test:relay:refill-db`, `test:relay:authorization-db`, `test:connect:db`, `db:test`, `db:verify` and the production build. The refill fixture reproduces both the default-rate and observed production-capacity failure before checking the repaired function, 18,000 partitioned evaluations, fresh processes, concurrent one-unit admission and denied browser access. After application, verify exact function/history/privileges and admission without rewriting earlier executions.

The paired DOWN intentionally closes new acquisition with `SHARD_NOT_AVAILABLE` while retaining exact numerators, balances, leases, settlement and history. It is a fail-closed recovery step, not a return to the broken fractional implementation. Reapplying the reviewed UP preserves that state and resumes correct refill. An image rollback cannot revert this arithmetic. The [closure evidence](../../post-mortem/releases/2026-10-03-refill-packaging-closure.json) proves UP/DOWN/UP in isolation; it does not claim a shared migration or authorize a rollout.

## Connect grants and Nova admission

`20261003131619_galx_connect_grants.sql` creates six additive private tables for explicit inference access, pending authorization, grants, hashed codes, hashed tokens and bounded Nova requests. Forced RLS and explicit revocation deny PUBLIC, anon, authenticated and service_role table access; only the trusted PostgreSQL server authority uses these records. There is no new exposed RPC or definer. Existing auth UUIDs own entitlement, grants and admissions with account-deletion cascades. No account, subscription, media or provider row is migrated or seeded.

The migration has three-second lock and ten-second statement limits and indexes the token, owner/client and active-request paths. Admission/refresh/disconnect serialize on a grant; shared operational limits span an account's applications. There is no inference balance or purchase record. Use `test:connect:db`, static verification, general database tests and the application build. The complete disposable chain tests current privileges before any replay, plus account-retention denial and cascade metadata, reuse races, current-grant revocation, unknown request identity and the paired rollback/reapplication.

The October 3 read-only inventory found an unrelated pending Orbit migration. Do not apply an unreviewed pending set. The feature remains disabled until the exact migration and target are reviewed. Disable it before rollback: the paired DOWN drops only these six tables and invalidates their credentials; existing accounts/media/subscriptions remain. Preserve required private evidence first. Reapplication requires new explicit grants. [Connect operations](../operations/galx-connect.md) owns setup, bounded cleanup and separate hosted acceptance.

## Billing return-contract migration

`20260916003207_billing_canonical_returns.sql` adds a nullable constrained `return_path` to private plan checkout attempts. NULL preserves the historical provider return contract; the compatible writer explicitly stores `/billing/plan` for new attempts. Do not backfill existing attempts. The change retains forced RLS and all grants, and bounds DDL lock/statement waits to two/ten seconds. Apply to the application database before its checkout writer, not a relay execution project. The paired rollback retains the column and evidence; presentation rollback must keep the dual-contract reader. [Billing release guidance](../reference/billing-pages.md#verification-and-release) owns acceptance and exact fixture commands. Local fixture application is separate from a target migration.

The route-retirement follow-up `20260920064323_remove_public_developer_return_path.sql` is intentionally narrower: it normalizes only persisted `/developers` return values to `/billing/plan`, then replaces the private check with the neutral billing destination. NULL remains valid for historical provider rows, and no other checkout fields, grants or RLS policies change. Its paired rollback restores the historical compatibility allowance without restoring a public page. Verify the exact migration history and return-path constraint after applying it; do not replay the original additive migration or treat rollback as a public-route restoration.

## Recovery and rollback

Do not blindly run a down migration. Inspect what it destroys, its data guards and accepted-operation compatibility. Image receipts must survive rollback when populated. Financial history, idempotency and audit records are not disposable fixtures.

For saturation or outages, inspect the owning connection pool and query classification without exposing credentials. Bound concurrency and retain fail-closed authorization; do not treat transport failure as a valid cached grant or successful mutation. Follow [triage](../../post-mortem/runbooks/triage.md) and preserve the original operation.
