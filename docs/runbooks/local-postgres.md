# Local PostgreSQL setup and migration

<!-- docs-scope: current-guide -->

## Purpose and trigger

Use this private runbook for the owner's October 17, 2026 direction to replace the GALXAI and GALX Relay Premium hosted databases with PostgreSQL on this Mac. The [dated setup record](../../post-mortem/releases/2026-10-17-local-postgres-setup.json) remains copy evidence; the [central cutover record](../../post-mortem/releases/2026-10-17-central-native-cutover.json) and [retirement/email record](../../post-mortem/releases/2026-10-17-premium-retirement-account-email.json) own later activation. Both clusters now serve native authority, Premium's hosted project is deleted, and central's source is write-guarded and paused under the original organization's Free plan. [ADR 0168](../adr/0168-local-postgres-database-placement.md) records intent separately from [current operating state](../../post-mortem/CURRENT_STATE.md).

## Authority and prerequisites

`scripts/local-postgres.mjs` manages two dedicated PostgreSQL 17 clusters under the ignored, private `.data/local-postgres/` directory. It never reuses the existing Homebrew 14/17 data directories. PostgreSQL 17 and pgvector are installed through Homebrew. The operator runs as the signed-in Mac owner, with socket peer authentication; this is separate from application logins.

| Source | Local database | Listener | Restricted service login |
| --- | --- | --- | --- |
| GALXAI, `mazhcjisettrzbqhorvp` | `galxai` | `127.0.0.1:55432` | `galx_control_service` |
| GALX Relay Premium, `prgjcyokylzcsqrjmkaa` | `galx_relay_premium` | `127.0.0.1:55433` | `galx_execution_service` |

Separate clusters retain distinct catalogs and authentication. Imported roles start without login, superuser, database/role creation or replication rights; original RLS-bypass flags, object owners and relevant role membership remain. Fresh passwords enable each cluster's `postgres` application/maintenance login and its own restricted service login. The later [account migration preparation](local-account-migration.md) additionally enables central `supabase_auth_admin` and `authenticator` only for their verified-TLS account services. `postgres` remains a trusted owner with RLS bypass; it is not a customer credential. Administrator TCP connections, other users, other databases and external addresses are denied. Do not expose either listener or give a relay the application owner's connection.

Source export includes `public`, `private`, `auth`, `galx_account_auth`, `supabase_migrations` and `extensions` when present. This is the application/account/execution data scope, not a clone of every Supabase platform service. pgcrypto, uuid-ossp and pgvector are installed locally; source vector 0.8.2 data is restored using installed pgvector 0.8.7. Supabase Vault, hosted Realtime, Storage, Auth servers and external object bytes are not replaced by this procedure. R2 remains independently configured. Verify any additional platform data before retirement.

## Procedure

Run from the repository root. Commands that start servers, use private sockets or install LaunchAgents need normal host permissions outside a restricted agent sandbox. No command below applies pending application migrations to the hosted projects.

```sh
npm run db:local -- status central
npm run db:local -- status premium
npm run db:local -- audit central
npm run db:local -- audit premium
```

On a new reviewed installation, run `setup central` and `setup premium`; unmanaged clusters are refused. Source snapshot commands are migration-only, not live backup commands. `snapshot central` requires an explicitly selected original source URL and retained original CA; Node and pg_dump verify the source certificate/hostname. The developer `.env.local` now selects native central; do not mistake it for the source. Original source settings are retained owner-only in `.data/postgres-cutover/central-source.secret.env`. The earlier Premium exporter used the authorized CLI's temporary migration login without evaluating emitted shell. Its hosted project is now deleted; central is paused. Inactive-source guards refuse new exports from either. Never call a deleted source or refresh a live destination from a retained snapshot.

Each source snapshot uses a repeatable-read, read-only transaction and exported snapshot shared with `pg_dump`. It retains a compressed archive, SHA-256, exact table counts and order-independent row hashes, owners, table ACLs, RLS flags, role metadata and migration history. Source data and schema are not mutated. `restore central` or `restore premium` restores only into the corresponding empty managed destination; an existing application table, view or sequence stops restoration. Restore errors roll back the archive transaction. An empty destination left after a failed attempt may be retried after inspection; there is no destructive overwrite option.

Immediately after a restore, run `verify central` and `verify premium`. They compare every included table's row count/hash, owner, effective ACL and RLS against that exact snapshot; default owner ACL and GRANT order are canonicalized. This does not certify subsequent writes or every workflow. Final central and Premium copies passed independently before activation. Both retained preparation databases and original setup observations are historical. Active Auth/control/execution records subsequently change; never overwrite them to reproduce an old hash. `audit` exercises actual restricted service protocol access, private-table/role/DDL/browser denial, wrong-password, administrator TCP and cross-cluster denial, loopback binding, checksums and fsync. No provider request is made.

`connections central` and `connections premium` write `connections.secret.json` and `application.secret.env` inside the respective private cluster directory. They contain real credentials. Never print, commit, publish, copy to public variables or load them into a live process before completing the cutover gates below. Running `connections` does not update `.env.local`, relay component configurations, deployed images or hosted environments.

### Automatic operation

`npm run db:local -- services` installs `ai.galx.postgres.central` and `ai.galx.postgres.premium` LaunchAgents, plus their `.backup` agents, in the owner's `~/Library/LaunchAgents`. Each database starts at login and restarts after exit. The foreground process runs under `caffeinate -is`, with explicit `LANG` and `LC_ALL` to avoid macOS locale initialization creating a thread before PostgreSQL forks. The installer accepts only its exact known service definition and waits for database readiness. PostgreSQL logs rotate daily through seven weekday files; credentials are not embedded in the plists.

These are user login services, not boot daemons. Keep the owner signed in, the Mac powered and the lid open. They do not provide availability after logout, before login, during shutdown, storage failure or forced system sleep. Login after reboot is still required. No automatic login or system security setting is changed. `restart-check central` and `restart-check premium` briefly stop their copied databases, wait for launchd recovery, then recheck all copied data. Do not run this acceptance check during unplanned live traffic.

### Backup and recovery acceptance

```sh
npm run db:local -- backup central
npm run db:local -- backup premium
npm run db:local -- rehearse central
npm run db:local -- rehearse premium
```

The local backup agents run every 86,400 seconds while the owner session is available. Each writes a partial archive, validates its table of contents and renames only after success; fourteen completed archives per cluster are retained. Inspect private `backup.log`, `restore-rehearsal.json` and timestamps after failures/missed sessions. `rehearse` compares the restored archive to current source data and therefore requires an unchanged/quiescent dataset; ongoing control/Auth writes can legitimately differ. Do not present its old setup rehearsal as current equality. For a live central consistency proof use the paired snapshot/manifest workflow below. Keep enough disk for live clusters, preparation copies, source archives, WAL and backups.

`node scripts/backup-local-postgres-offdevice.mjs central` exports one native repeatable-read snapshot shared by pg_dump and the table manifest, encrypts with authenticated AES-256-GCM and a domain-separated key from the unchanged external recovery seed, checks existing bucket privacy, and uploads to the existing private R2 bucket. It downloads/decrypts that same object and restores it into a disposable database with required extensions, checking hashes, owners, effective ACLs and RLS. A nonsecret role/grant recipe is separately uploaded and read back. Fresh post-activation central recovery passed all 196 tables; Premium's earlier approved recovery passed all 30. These are recovery points, not ongoing replicas or a completed fresh-machine/VM/queue/full-secret recovery drill. Daily off-device scheduling is not installed by this command; local daily backups remain separate.

Every upload has a private receipt. On an interrupted result inspect the exact object and phase before retrying; never blindly submit another deletion/upload. The bounded `central recover <retained-recovery-directory>` path reuses the already uploaded object and permits only the recorded incomplete recovery phase. Explicit-schema dumps require pgcrypto, uuid-ossp and vector before restore; only a newly created disposable target may remove its confirmed empty default public schema. Keep the unchanged seed's external production recovery source available. Never place ciphertext or plaintext archives in public object paths or Git.

## Stop conditions

Stop on a source identity mismatch, unexpected schema, nonempty destination, archive hash mismatch, permission drift, failed recovery rehearsal, unknown service definition or unavailable local service. Inspect private `last-operation.log`, `verification-mismatches.json` and cluster logs; never paste raw data or credentials into incident records.

### Live cutover gates

A verified copy alone does not replace a live writer. Premium completed a graceful drain, hosted execution-login fence, fresh 30-table / 144-row copy, owner/ACL/RLS verification, native transport switch and ownership/TLS acceptance. After private off-device recovery and owner approval its hosted project was deleted. The protocol ID remains operational history. Both provider sign-ins expired before the switch; no generation canary was submitted. Retain the separate [expiry incident](../../post-mortem/incidents/2026/2026-10-17-provider-expiry/README.md).

Central subsequently completed its final guarded 196-table / 7,870-row copy and native Auth/web/Nova/authority activation. Hosted platform roles could not be disabled; rehearsed statement triggers durably guard 195 data/session tables, excluding only Auth's platform version marker. Native restoration removes those imported guards without changing data/owners/permissions. The source retains its write guard and is now paused after the original organization moved to Free; it is not a rollback target. Future migrations must still satisfy the following gates; actual delivery and unresolved provider work remain in current state:

1. Inventory and replace the remaining Supabase Auth and Data API callers. Copying `auth.users`/sessions does not run an Auth server or synchronize future sign-ins. Preserve account IDs, refresh/revocation behavior, ownership checks and browser response allowlists.
2. Review every writer: public Media/Connect, the Mac Nova runtime, central management, Premium execution and administrative/background jobs. Confirm the public application has a secure route to its selected database backend. A remote deployment cannot use this Mac's loopback address.
3. Preserve destination identity checks and verified TLS. `native-postgres-v1` fixes each component to its own hostname, port, database and restricted role; omitted mode retains the hosted guard. Both mappings are active and probes reject untrusted certificates and preserve table/network denials. Premium's VM adds only its own port 55433 to the existing central HTTPS exception. Do not disable these guards to make a URL connect.
4. Stop/drain all relevant source writers, preserve uncertain in-flight work, then take fresh final snapshots. The setup snapshots are not a continuing replica. Restore into new empty destinations and verify again; never overwrite accepted local operations.
5. Switch each reviewed client, prove end-to-end identity/admission/execution/settlement and object access, and establish that no client still reads or writes the old projects. Keep exactly one writer for each responsibility. Do not roll back by repointing clients to a stale database after local writes have been accepted.
6. Confirm retention, platform data, independent recovery and exact owner retirement scope before deleting hosted resources. Source write guards allow reads and do not stop Supabase charges. The chosen central cost stop is verified Free plus INACTIVE; Premium is deleted. Optional later permanent central deletion requires a new exact review/approval without resuming the stale source merely for cleanup. Historical invoices remain; project deletion alone is not subscription cancellation.

## Recovery and rollback

During an uncoupled preparation, source clients retain their original configuration. After this cutover the native clusters are live authority, Premium's source is deleted and central's retained source is stale/write-guarded and paused. Stop a database LaunchAgent only after containing/draining its dependent services; disable its backup agent too when deliberately decommissioning. Keep source archives and native data private. Never delete a cluster or run an unrelated DOWN migration as an outage workaround.

For data recovery, first preserve the failed cluster and identify the exact backup. Rehearse into a separate empty database with the installed roles/extensions and original owner/ACL behavior. Verify the backup's recovery point and hashes before a reviewed client switch. Post-cutover recovery must reconcile accepted writes and uncertain operations; source retention is not a deterministic rollback after divergence.

## Verification and evidence

Run `npm run test:postgres:configuration`, `npm run db:verify`, `npm run db:test`, relevant public HTTP/authorization checks, TypeScript and a production build. Integration commands create disposable fixtures and must never target live native data. Compile-time scanning remains separate from actual served-page/asset and signed-in workspace acceptance. Reconcile guides, retain scoped credential-free evidence, and run impact/review/sync/checks. A review fingerprint neither authorizes cutover nor closes an unresolved account/provider incident.
