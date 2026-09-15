# ADR 0133: Explicit validated enrollment and isolated integration fixtures

<!-- docs-scope: decision-record -->

Date: 2026-09-09. Status: implemented; production fixture quarantine and controller reload verified.
Audience: private maintainers. Supersedes bulk-import guidance in [ADR 0115](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md); extends cold-start behavior in [ADR 0126](0126-capability-aware-shard-relay-federation.md).

## Investigation

Production initially had 12 desired records, one healthy worker and 11 rejected credential revisions. All 11 rejected records matched the exact synthetic key, fixed test tenant and timestamp ID family written by the broad database integration suite. That suite inherited production configuration, inserted healthy fake accounts and did not remove its shard fixtures.

Separately, bulk import scanned host login caches without provider validation and overwrote existing account state, including health, quota and compliance claims. That was an unsafe population path, but it was not the source of these 11 exact fixtures.

The rejection journal records credential revisions, not original HTTP exchanges. Historical handshake statuses cannot be reconstructed from it. The evidence therefore does not establish that genuine accounts require manual-only workers.

## September 14 successor

[ADR 0152](0152-manual-desktop-only-shard-authority.md) replaces the external enrollment policy below with manual desktop-only enrollment and schema enforcement. This record preserves the September 9 decision and fixture findings; its CLI recipe is historical, not current instructions. Use the [current enrollment guide](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).

## Original September 9 decision

Retain automatic reconciliation, capability refresh, bounded recovery, drains and ownership cleanup for registered authority. Retire ambient/bulk discovery. `shards:import`, `--import`, `seedMultiAccountFleet()` and enabled host discovery now fail with migration guidance before their former discovery work.

Explicit operator `--add` accepts privately injected OAuth input, checks fresh registry authority and account/expiry consistency, validates upstream inventory, encrypts, then creates only if the stable ID is absent. SQL conflict handling and privileged REST insert both prevent concurrent enrollment from replacing credentials, ownership, revocation or counters. Existing accounts refresh through [ADR 0132](0132-recoverable-desktop-credential-handoff.md). New records do not inherit unverified compliance assertions.

Cold worker allocation performs a bounded inventory authentication preflight before creating a container. A 401 is persisted by credential revision and suppresses repeated starts. Transport failures, 403, 5xx and timeouts back off without permanent rejection. Late failures cannot poison rotated authority; failed rejection-journal writes do not claim durability. Existing owned workers may be adopted without a new cold-start preflight.

Model inventory acceptance does not establish inference/WebSocket compatibility or image-tool support. Workers still need fresh capability evidence. Manual holds continue to preserve repair context under the lifecycle rules.

## Fixture and cleanup boundary

The broad mutating integration process requires a guarded loopback PostgreSQL URL with a dedicated test database name before any repository import. It strips inherited credential authority, uses unique test identities and cleans its own created shard. Production URLs fail before mutation.

The September 11 follow-up makes `npm run db:test` self-contained: its parent runner creates a pinned PostgreSQL 17/pgvector container, bootstraps test-only platform prerequisites, replays all migrations unchanged and supplies a fresh local connection and synthetic keys to the guarded child. It removes its owned container and temporary files on success, failure or handled cancellation. A caller may still explicitly choose an initialized loopback fixture, which is never reset or destroyed by the runner. Direct child invocation still requires the guarded URL. Billing-only tests retain their schema harness and use the runner's disposable database. See [the current test instructions](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests).

A dry-run-first cleanup identifies only the exact legacy fixture family. Apply conditionally checks original encrypted revision, owner, status and zero in-flight work. It revokes matching records without deleting ciphertext, counters or history; changed/busy records are skipped. This does not authorize broad revocation of other rejected credentials.

No schema or RLS change was needed. Existing generic persistence update paths retain their own behavior; the create-only guarantee applies to this enrollment path.

## Alternatives

Manual-only worker provisioning would not stop the integration suite from contaminating authority and would sacrifice useful recovery/scaling. Keeping bulk discovery with a warning would still permit stale cache replay. Deleting all rejected rows would discard evidence and could affect real accounts. Explicit enrollment, isolated tests and targeted conditional quarantine address the observed causes.

## Dated outcome and validation

On September 9, 11 exact fixtures were revoked, zero skipped. The controller reported one desired shard, one healthy worker and zero active rejected records. A temporary maintenance hold preserved the same serving container and generation across reload; its desktop/link also remained intact.

164 relay/security/desktop regressions and three enrollment-storage tests passed. Real-socket tests covered 401, 403, 502 and timeout behavior. A Docker canary verified cold rejection allocates no container and rejection survives restart; its owned containers and checkpoint volumes were removed. Production-configured broad tests failed at the new guard as intended.

The controller loaded the changes and the worker image was built. The existing worker was retained rather than replaced. No new real account sign-in, new live image request or complete paid-entry transaction was performed in this pass. See [the full dated record](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md).
