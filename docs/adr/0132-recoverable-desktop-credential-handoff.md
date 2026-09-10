# ADR 0132: Recoverable desktop credential handoff

<!-- docs-scope: decision-record -->

Date: 2026-09-09. Status: implemented; fixtures and an operator-completed live credential refresh verified. Account approval remains an operator task.
Audience: private maintainers. Extends [ADR 0115](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) and [ADR 0131](0131-private-operator-desktops-and-maintenance.md).

## Context

Signing in through a guest terminal previously left the controller using the old credential. A successful local file write is not registry synchronization, and a registry update can succeed before a private checkpoint write fails. Custom login homes, keyring-only storage and unrelated accounts need distinct handling.

## Decision

Watch the linked workspace's saved file-backed provider login. The operator signs in through the installed CLI, an accessible device-code panel or the guest browser. Helpers create and verify a private owned login directory before invoking the CLI and explicitly request file-backed storage.

Custom homes inside the guest home are supported through `galx-relay use-login`. Resolve and validate each path component without following symlinks; bound file size and reject unsafe ownership, special files or malformed credentials. Keyring-only/in-memory stores are not exported: use supported file-backed reauthentication. Host credential caches remain outside the bridge.

Check token/account consistency, expiry, current registry eligibility and upstream inventory acceptance. The linked account must match. A saved unrelated login can be matched to one existing eligible account for review and explicit Save link; matching never enrolls, changes ownership or reactivates revoked authority.

Unlinked desktops expose the same read-only matching action in the link editor. Keep registered repair targets separate from unexpired serving authority: an expired account remains selectable with explicit expiry status, zero eligible models and disabled traffic controls. It does not allocate a worker until a validated credential refresh restores serving authority. Registry removal or revocation removes the repair target. Refresh the selector after matching and reject stale or changed-link results before presenting a selection; Save link remains explicit.

Before mutation, durably flush an intent containing candidate fingerprint and expected encrypted-registry revision. Replace the credential using compare-and-swap. Finish the private checkpoint only after success. Recovery confirms an already-applied result or retries unchanged original authority; an external newer revision wins. Previously applied unchanged files cannot restore old credential families.

SQL compares denied status names against `status::text`: deployed enum versions need not contain every defensive denial label. Comparing the enum directly to an absent label aborts the whole update with `22P02`, even for a healthy account. The Data API fallback rejects ineligible observed rows and fences the exact observed status as well as the credential envelope; a concurrent status change requires rereading authority. No enum migration or broader privileges are required. See [PostgreSQL enum type safety](https://www.postgresql.org/docs/current/datatype-enum.html#DATATYPE-ENUM-TYPE-SAFETY).

Polling is coalesced, bounded and backed off on transient failures; operators have a manual retry. It watches completed CLI sign-in rather than independently exchanging refresh tokens. UI states separate sign-in, validation, registry save, worker application and traffic readiness.

## Failure semantics

| Failure | Result |
| --- | --- |
| Missing/unsafe file or wrong account | Actionable safe status; no registry write |
| Provider rejects candidate or expiry invalid | Preserve current authority; require corrected sign-in |
| Concurrent registry rotation | Preserve the newer revision; report updated elsewhere |
| Intent cannot be persisted | Do not perform the uncheckpointed mutation |
| Registry saved, final checkpoint failed | Explicit checkpoint error with recoverable intent; no false synced claim |
| Controller restart | Reconcile intent against current authority before deciding completion |

Journal and PostgreSQL are separate stores, not a distributed ACID transaction. Durability depends on filesystem fsync behavior and the exclusive controller writer. No rollback restores older credentials over newer authority. Quota, ownership, permissions and traffic policy retain their existing controls.

## Alternatives and consequences

Blindly copying a terminal file could replace the wrong account or resurrect stale tokens. Exporting keyrings would expand credential custody. A fully distributed transaction would require different storage architecture. Conditional authority plus durable intent provides bounded recovery while retaining the existing encrypted registry.

Administrator DTOs exclude raw tokens and private checkpoint internals. This is existing-account recovery; new accounts use [ADR 0133](0133-explicit-validated-enrollment-and-test-isolation.md).

## Evidence and remaining acceptance

Tests exercised custom paths, symlinks, concurrent updates, interrupted checkpoints, account matching, real guest Unicode input and synthetic completion. The installed provider CLI initialized a real device challenge and cancellation; no live credential was imported. Identity approval/MFA remains with the account holder. Pixel-stream accessibility and physical mobile acceptance remain separate.

The initial expired-account repair check verified an operator-completed live login against provider inventory and selected its existing account in the authorized desktop browser without saving it. After the operator linked the desktop, a production enum mismatch exposed a second failure in registry persistence. The corrected query was verified against disposable PostgreSQL using both legacy and extended enums, concurrent rotation, quota churn, ownership checks and blocked-status changes. Automatic sync then saved the live access/refresh credentials and expiry, loaded the matching worker revision, and reached **Ready for work** with healthy eligible capacity. Both desktops and the pre-existing worker were preserved. No inference request was dispatched by these checks.

Regression fixtures also verify that expired accounts remain linkable without allocation or admission, recover after credential refresh, and disappear after registry removal. Browser fixtures cover explicit Save link, readiness, stale matches, failures and responsive layouts.

See [enrollment and recovery](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [dated verification](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md).
