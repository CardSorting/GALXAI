# Wallet lifecycle repair — September 7, 2026

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->
> **Reading scope:** Scoped operational procedure or dated incident evidence. Its component authority remains separate from federation lifecycle, capability routing, and admission recovery. See the [current contract](../../../../docs/FEDERATION_STRATEGY.md) and [complete catalog](../../../../docs/CATALOG.md).

The live database had four Auth users and only one wallet. Migration
`20260907190322_wallet_account_lifecycle` is applied: all four users now have
wallets and the admin account's $30,000 balance was preserved.

## Findings and changes

| Severity | Finding | Resolution |
| --- | --- | --- |
| High | No Auth signup trigger or application signup provisioning; users could exist indefinitely without a wallet. | A private trigger provisions the wallet in the signup transaction. The migration backfills missing wallets with `ON CONFLICT DO NOTHING`. |
| High | Repository creation returned a fabricated process-local wallet after failed persistence, including concurrent insert conflicts. | Creation now requires PostgreSQL persistence, uses the unique user constraint, and returns the stored UUID. Errors propagate. |
| Medium | Billing returned zero for missing wallets, hiding the lifecycle failure. | Authenticated billing routes ensure a wallet exists before opening their read-only snapshot. This also covers verified provider identities using the server account identity boundary. |
| Medium | Batch reads could substitute local wallet data after a failed database read or authoritative miss. | Failed authoritative reads throw; successful misses return null and clear the local record. Existing bounded read caches remain. |
| Low | Direct PostgreSQL timestamp values differ from JSON RPC values. | Repository wallet timestamps are normalized to ISO strings. |

## Operational contract

`ensureWallet` is server code: callers must resolve and authorize the account
identity first. It accepts account identifiers used by both supported identity
paths. It does not give browsers database access or accept request-supplied
ownership in billing routes.

Provisioning creates a zero spendable balance using existing database defaults.
The introductory-grant field is existing eligibility metadata; provisioning does
not create a funded grant, ledger transaction, verified deposit, or payment.
Existing wallets are never updated by provisioning. Financial writes continue
through their existing transaction and ledger workflows.

The insert and following select use separate READ COMMITTED snapshots so a
concurrent insert can finish before the row is read. Do not invoke the helper
inside a read-only or REPEATABLE READ transaction. Billing calls it before the
read snapshot. The trigger contains only an indexed insert and intentionally
fails signup if wallet persistence fails, keeping the account/wallet invariant.

The down migration removes the trigger and function but retains wallets because
they may acquire financial history. The application changes require the normal
application deployment; the database signup fix and backfill are already live.
No public table or RPC signatures changed, so generated public database types
require no changes.

## Verification

- `npm run test:wallet-lifecycle`: isolated disposable local PostgreSQL database;
  backfill, restricted-role signup, transaction rollback, 40 concurrent helper
  calls, 10 concurrent repository calls, persistent UUIDs, timestamps, preserved
  balances, invalid identifiers, storage errors, browser access denial,
  migration reapplication, and safe rollback.
- Local prerequisites: PostgreSQL on `127.0.0.1:55439`, role `seats_test` with
  permission to create a disposable database and fixture roles. The test never
  uses the application's database URL for its connections.
- Existing billing regression suite passed.
- `npm run db:verify` passed; `npm run db:test` passed 94/94 assertions.
- TypeScript check passed.
- Live missing-wallet count is zero. A live Auth insert created a wallet; both
  records were rolled back. The production role cannot impersonate
  `supabase_auth_admin`, so exact-role verification was limited to local
  restricted-role execution and the live installed trigger test.
- The 15 security advisor warnings discovered during this repair were resolved
  in the follow-up migration described below.

## Security follow-up — applied September 7, 2026

Migration `20260907191200_function_search_path_and_vector_security` resolves all
15 findings: 14 application functions inherited the caller's search path, and
the `vector` extension was installed in `public`.

The functions now use `pg_catalog, public, pg_temp`; the two vector search
functions also include `extensions` before `pg_temp`. The extension was moved
to `extensions` using `ALTER EXTENSION ... SET SCHEMA`, preserving the vector
type's identity, existing columns, and indexes. Application roles cannot create
objects in either trusted schema. No function bodies, ACLs, execution authority,
or public RPC argument types were replaced. PostgREST received a schema reload
notification after relocation. Generated TypeScript API types are unchanged.

Verification included the following:

- Migration application, reapplication, and down migration inside a rolled-back
  transaction against the live schema.
- Deliberately shadowed application tables with temporary tables and excluded
  application schemas from the caller's search path; functions still addressed
  the real tables.
- Verified lock acquisition/release, idempotency reservation/replay, timestamp
  trigger execution, and vector/hybrid search with a 1,536-dimensional fixture.
- Confirmed function identities, ACLs, execution authority, and vector type
  identity remained unchanged.
- `npm run db:verify`, all 94 database integration checks, and TypeScript passed.
- Live security advisors completed successfully with `--fail-on warn`: zero
  remaining security findings from this advisor run.

Run `npm run db:verify-function-security` to repeat the focused verification.
The script rolls back all fixtures. Use `-- --rehearse` to additionally test
the migration and rollback inside that transaction; this takes brief catalog
locks. The down migration restores the original unset paths and extension
location and therefore intentionally reinstates the warnings.

Reference: PostgreSQL's [extension relocation documentation](https://www.postgresql.org/docs/current/sql-alterextension.html).

This follows Supabase's documented [Auth-linked account data trigger pattern](https://supabase.com/docs/guides/auth/managing-user-data),
with a private function, fixed search path, fully qualified relation names, and
no browser execute privileges.
