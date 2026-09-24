# Legacy desktop enrollment

<!-- docs-scope: current-guide -->
This guide applies only to the retained single-controller federation and its existing desktops, as identified in [current state](../../post-mortem/CURRENT_STATE.md). Premium uses the [local pool service procedure](../runbooks/relay-pool-services.md) and [central management contract](../reference/relay-account-management.md). These legacy commands do not create or administer the active Premium service. Assigned accounts are excluded from legacy enrollment, refresh and lease authority.

> Private operator guide. [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md) requires manual desktop enrollment while retaining automatic worker reconciliation.

## Sole enrollment path

A shard must originate from a desktop manually created in **Relay Desktops**, opened with **GALX Relay Monitor.app** on the Desktop or `npm run relay:desktops`. The administrator completes provider sign-in there and explicitly chooses **Enroll shard**. Creating a desktop, saving a link, starting the controller and polling credentials never enroll an account.

1. Reuse the account's existing manually created desktop, or choose **New**, name a workspace and create it. Keep one account per desktop; do not create a replacement for an already bound account.
2. Open **Set up shard** for an unlinked desktop or **Inspect shard** for a linked one, then choose **Sign in** or **Sign in with a code**. Complete the provider interaction yourself.
3. Choose **Enroll shard**. The controller reads the saved guest login; the HTTP request accepts only the expected existing shard link, never credentials.
4. Enrollment validates account identity, expiry and authenticated inventory, encrypts the login, and commits its unique desktop binding. The controller then saves the local link. A lost response or failed local checkpoint is recoverable by explicitly retrying enrollment from the same desktop; no other account or desktop may replace it.
5. Choose **Check now** and wait for saved authority, the applied worker revision and fresh capability evidence. Inventory acceptance alone does not prove inference or image support.

Unknown accounts are created only by this action. An existing eligible account can be confirmed from its matching manually created desktop without changing ownership, traffic holds, quota, counters or history. Revoked/dead accounts are rejected, duplicate account matches fail closed, and an existing desktop binding cannot be transferred by changing a link. A stopped workspace must be started first. Keep the enrolled workspace and its saved home for future sign-in repair; do not delete it as an account-recovery shortcut.

## Sealed external paths

`shards -- --add`, `shards:import`, `--import`, host-cache discovery and application provider ingestion are disabled. `/api/auth/openai`, `/api/auth/ingest`, `/api/ingest` and provider OAuth URL/PAR/callback/refresh routes return a finite unavailable response before credential processing. Ordinary GALX account login, logout, session refresh and device grants retain their separate contracts.

General repository saves update allowlisted policy metadata only. Database triggers reject direct credential creation/replacement and desktop-binding edits outside the private no-login writer role. The Data API service role cannot insert shards or call the retired upsert/private enrollment functions. The controller administrator uses SQL-only private enrollment and refresh functions; it has no credential-write REST fallback. Database owners remain trusted administrators and can deliberately change schema/roles; this does not claim protection from a malicious database owner.

## Existing records and schema rollout

Migration `20260914231914_manual_desktop_shard_enrollment.sql` adds nullable `managed_desktop_id` and `desktop_enrolled_at`, a paired-state constraint, a unique desktop binding, protected credential writes and a durable lease-admission check. Existing rows retain their original source label, ciphertext, counters and revocation history. No legacy label or valid token is automatically promoted to manual enrollment. Until explicitly confirmed from its desktop, a row cannot receive new work through either the controller projection or database admission.

Run `npm run test:relay:manual-db`, `npm run db:test`, `npm run db:verify`, relay authorization tests and the production build before rollout. Run `node --env-file-if-exists=.env.local --import tsx scripts/apply-manual-desktop-enrollment.ts` without a mode flag for read-only policy inventory. On an unapplied target, `--dry-run` validates the exact migration inside a transaction and rolls it back; `--apply` applies and records that version after review. An already-applied target returns inventory without reapplying or exercising the migration. Then load the compatible controller and application. Existing desktop sessions must reconnect after controller restart. Qualify accounts through the explicit UI flow; never backfill bindings from inferred email, host caches or operator-import labels.

The DOWN migration restores the prior functions/grants and leaves enrollment columns as historical evidence. It reopens the older ingestion boundary and must be paired with deliberately reviewed software rollback; do not use it as a routine availability fix. Full rollback/reapply is tested in a disposable database. See [database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md#manual-desktop-policy-inventory-and-rollout) for rollout ordering and [current state](../../post-mortem/CURRENT_STATE.md) for deployed evidence and pending manual acceptance.

## Refresh an existing account

Provider-session renewal is manual. Open the Desktop shortcut for the same workspace used at enrollment; a local link alone is insufficient authority.

1. Open `npm run relay:desktops` and review the selected workspace's shard link and enrollment. An unconfirmed legacy account must first complete the explicit enrollment action above.
2. Pause new work if repair requires a hold. Accepted work can finish.
3. Complete sign-in through the device-code panel or `galx-relay login` in Terminal.
4. Select an existing custom guest home with `CODEX_HOME=/home/operator/path/to/codex-home galx-relay use-login` if needed. Set `CODEX_HOME` to the directory containing `auth.json`; the helper accepts no path argument.
5. Verify the credential save and checkpoint. Retry sync explicitly when appropriate; do not equate local login with registry authority.
6. If a hold blocks the replacement worker after rotation, review the saved authority and explicitly resume to permit allocation. Then verify the worker-applied revision and fresh capabilities. Admission still fails closed until those checks pass. If no replacement is needed, review existing capability health before resuming.

The bridge also considers the private OAuth setup written by `galx-relay setup`, subject to the same account/expiry/validation checks. If multiple sources exist, it selects by saved-file evidence rather than assuming that local process startup synchronized authority.

The bridge synchronizes credentials saved in the bound desktop; it never independently renews the provider session. Expiry requires manual provider sign-in in that desktop. Managed records are excluded from expired-credential revocation cleanup so they remain repairable. Reads reject unsafe paths, symlinks, unexpected ownership, malformed or expired tokens, conflicting account hints and stale credential families. An unrelated login cannot overwrite a linked account. Matching suggests an existing account for review; it neither enrolls it nor transfers its binding.

The helper requests file-backed provider CLI credentials; it does not export keyrings. The operator must finish provider sign-in. A challenge, saved file or successful fixture is not proof of live account authentication.

## Recoverable synchronization

The host validates the candidate and current encrypted registry revision. It fsyncs a private write intent before compare-and-swap replacement. The intent contains fingerprints and expected revision evidence, not plaintext tokens. Restart can finalize an already committed write or retry against unchanged original authority; newer external revisions are not overwritten.

The journal and registry are separate stores. This protocol is recoverable, not a distributed atomic transaction. A checkpoint failure produces an explicit error and must not claim saved sync state. An unchanged previously applied file cannot restore an older credential family.

Saved-file checks are normally spaced by ten seconds; current-authority checks use a one-minute interval. Transient failures back off with jitter. Manual sync provides an explicit retry; persisted state remains authoritative.

If a valid, matching login still shows `credential_registry_unavailable` and the registry retains its old expiry, investigate the host-side persistence failure. Repeating provider sign-in does not repair a database write error. Restore registry access or query/schema compatibility, then let automatic sync retry or choose **Check now**. Confirm that the saved credential and expiry match the guest file, the worker has applied that revision, and the inspector shows **Ready for work**. Refresh predicates support older status enums without weakening revocation or ownership checks; see [ADR 0132](../adr/0132-recoverable-desktop-credential-handoff.md).

## Rejected revisions and contamination

A 401 is persisted by credential revision to suppress repeated container starts. A 403, 502 or timeout alone does not permanently reject a credential. Historical rejection journals do not retain the original HTTP exchange; do not infer its exact status from a rejected state.

September 9 investigation matched 11 rejected rows to exact synthetic integration fixtures. See [dated evidence](RELAY_SESSION_VERIFICATION_20260909.md). For that exact fixture family, cleanup is dry-run by default:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/quarantine-fixture-shards.ts
```

Review authority and counts before deliberately adding `--apply`. It conditionally revokes matching, unchanged, idle fixtures and preserves encrypted evidence and counters. Changed or busy rows are skipped. Other rejected accounts are not thereby fixtures.

## Isolated integration tests

Run the broad suite with Docker running and dependencies installed:

```sh
npm run db:test
npm run db:test -- --billing
```

The [runner](../../scripts/run-supabase-integration.ts) creates a disposable PostgreSQL 17 container with pgvector 0.8.6, pinned by image digest. The first run downloads that image if necessary. It binds a random port exclusively to `127.0.0.1`, uses a random database password, and stores its database in temporary memory-backed storage. The [platform bootstrap](../../scripts/fixtures/integration-bootstrap.sql) supplies test-only Supabase roles, auth claim helpers and an empty auth-users table, with pgcrypto in `extensions`. All repository migrations are applied unchanged before the suite starts. No production dump, dotenv file or customer data is loaded.

The child gets a fresh working directory and synthetic vault/audit keys. Its environment allowlist excludes inherited Supabase, R2, Stripe, relay and other credentials. Unexpected HTTP calls are blocked and fail the run even if a caller catches the error. Edge/webhook checks remain simulations and R2 writes use temporary local storage; this is not a live provider integration test. Billing-only mode runs its existing isolated schema checks inside the same disposable database.

Success, test failures and handled cancellation clean up the owned container and temporary files. Migration queries and the suite have deadlines. Cleanup checks the unique ownership label before stopping a container. A force-killed parent or stopped Docker daemon can prevent cleanup; inspect only containers bearing the exact run label before removing a leftover. No existing database or unrelated container is dropped or reset.

For an already initialized local fixture, explicitly set `GALX_INTEGRATION_DATABASE_URL`. This override must use literal `127.0.0.1` or `[::1]`, with database name `galx_integration_test` or a `galx_integration_test_` suffix. Caller query and fragment fields are rejected. The runner does not initialize or destroy an explicitly supplied database. It still strips inherited authority and supplies only the guarded local connection to the child. Directly invoking `test-supabase-integration.ts` without that guarded URL fails before repository initialization.

September 11 verification: all 93 migrations loaded, all 94 broad-suite checks and 26 billing-only checks passed, and their containers were removed afterward. Nine enrollment/isolation checks passed. A controlled mid-suite SIGTERM returned nonzero and removed only its owned container. Static integrity verified 93 paired migrations with no violations. [Fixture evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/integration-fixture-verification.json) records these observations and source hashes. The [separate application build](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/integration-fixture-application-verification.json) passed 114 regressions and found no matches for 30 private markers across 634 local browser/rendered assets; it was not deployed. The earlier missing-fixture limitation is resolved by this runner. [Official image instructions](https://github.com/pgvector/pgvector#docker) describe the PostgreSQL/pgvector distribution; the checked digest is retained in source.

Related: [key rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md), [hardening](RELAY_HARDENING.md), [desktop operations](legacy-desktop-operations.md).
