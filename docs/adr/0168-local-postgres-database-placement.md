# ADR 0168: Local PostgreSQL for GALXAI and Premium

<!-- docs-scope: decision-record -->

Date: 2026-10-17. Decision: accepted by the owner's explicit instruction to replace unaffordable hosted operation with PostgreSQL on this device, naming GALXAI and GALX Relay Premium, then continuing application/Auth migration. Delivery: both databases and central Auth/web/Nova/authority serve locally; Premium's hosted project is deleted; central is paused and Pro is cancelled through the original organization's Free plan. The [central cutover record](../../post-mortem/releases/2026-10-17-central-native-cutover.json) and [retirement/email evidence](../../post-mortem/releases/2026-10-17-premium-retirement-account-email.json) own actual account acceptance limits, remaining provider work, optional permanent central cleanup and historical billing. Accepted intent is separate from those observations.

## Context

Hosted egress costs prevent the desired operating pace. Most application persistence already uses PostgreSQL directly, but interactive identity, some Data API access and fixed relay connection validation still depend on Supabase services. Replacing a database URL alone would leave those dependencies and could split accepted writes or account identity between unrelated snapshots.

## Decision

Prepare two dedicated PostgreSQL 17 clusters on this Mac: central application/account authority and isolated Premium execution authority. Preserve original data, operational identifiers, owners, role boundaries, ACLs, RLS, migration history and cryptographic configuration. Generate fresh local login secrets without copying hosted passwords or elevated cluster administration rights. Restrict listeners to loopback, use peer authentication for the Mac operator and SCRAM for the narrowly permitted application/service logins. Install login services with restart, sleep prevention and verified local backups.

This changes database placement under [ADR 0016](0016-authoritative-supabase-postgresql-substrate.md) while retaining PostgreSQL authority, and refines [ADR 0153](0153-central-account-authority-isolated-relays.md) without accepting its entire earlier proposal or merging data/privileges. Protocol project identifiers retain their operational meaning. Explicit native mappings bind each component to its own database, role and verified TLS destination.

The requested application/Auth continuation uses source-matched local Auth and pinned PostgREST behind a bounded first-party account handler, preserving UUIDs, password hashes, verification and server-side session liveness. Canonical web and Nova run as separate Mac containers; only web retains its existing scoped storage/billing/publishing authority. Exact HTTPS routes expose authored public contracts; raw databases, account administration, monitors and control remain private. Existing OAuth clients retain their identities/callback contracts; usable secrets and real return acceptance are independent requirements. Transactional mail uses the separately provisioned verified sender without disabling confirmation.

## Consequences and verification

The [local database runbook](../runbooks/local-postgres.md) owns setup, snapshots, restore refusal, privilege verification, service lifecycle, recovery and remaining cutover gates. The [general database runbook](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) continues to own exact application migration review. No pending migration is applied merely to create a copy.

Automatic operation requires the owner session and a powered, awake Mac; it does not establish availability before login or after logout/device failure. Same-device backups are verified recovery points, not device-loss protection. Data copy acceptance is separate from writer freeze, final synchronization, application/relay cutover, public HTTP acceptance and hosted retirement. Supabase costs continue until old dependencies and resources are actually retired. This decision does not authorize discarding accepted operations, weakening identity/TLS guards or deleting hosted resources before those gates are verified.
