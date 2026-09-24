# Relay account registration and manual sign-in recovery

<!-- docs-scope: current-guide -->

Private operator procedure for the fixed Premium monitor. [Central account management](../reference/relay-account-management.md) defines persistence, revisions and roles; [service operations](../runbooks/relay-pool-services.md) defines installation and activation. The existing single-controller enrollment procedure is retained separately as [legacy desktop enrollment](legacy-desktop-enrollment.md).

## Sole enrollment path

Accounts are managed only in `mazhcjisettrzbqhorvp` through a manually created sign-in desktop and the central registrar. Premium requires a verified paid provider account. A provider account's class is separate from the customer's GALX plan. Host credential discovery, pasted-token registration and external API/CLI imports are closed.

1. Open **GALX Monitors**, choose Premium, then **Connect account**. Existing registered accounts must reuse their own registration/desktop.
2. Enter a recognizable name and **Create sign-in desktop**. Preparation saves central operation identity; an explicit same-intent retry preserves its IDs.
3. Start sign-in, open the desktop and complete the provider interaction manually.
4. Choose **Connect account** to verify identity, expiry, models and account class. Review, enrollment, assignment and result commit together; a new account starts enabled when automatic activation is configured, or paused during a manual installation hold.
5. If the response is uncertain, Refresh and inspect the saved connection. Explicit retry reuses the original registered operation without another account.
6. Wait for matching relay confirmation. The verified installation activates automatically when ready. Existing intentionally paused accounts remain paused until explicitly enabled. Qualify the intended workloads separately.

One account retains one pool/installation/desktop assignment. Labels, links and an unexpired token cannot transfer that binding. Wrong-class, ambiguous, duplicate, revoked or mismatched accounts fail closed. Inventory access is not proof that generation succeeded.

## Sealed external paths

Retired application provider connection routes return bounded unavailable responses before credential processing; ordinary GALX customer authentication is independent. The browser submits scoped registration/action metadata, never provider credentials. The owning monitor reads saved files and uses short-lived purpose tickets to the central registrar.

The central database owns encrypted credentials and existing leases. Private functions enforce scope, current revision and desktop identity; app/service roles cannot perform broad credential writes. Legacy enrollment, refresh and lease paths reject centrally assigned accounts. Never reopen those paths to fix a pool issue. See [security](../SECURITY.md) and [database authority](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

## Existing records and schema rollout

The manual desktop policy retains unconfirmed legacy accounts without granting new capacity. Central foundation, authorization, legacy assignment guard and management migrations add the Premium workflow. Their complete version inventory and rollback rules are in [central schema](../reference/relay-account-management.md#durable-schema). The Premium execution project contains no account registry.

The earlier [management acceptance](../../post-mortem/releases/2026-09-15-relay-account-management.json) and later [connection acceptance](../../post-mortem/incidents/2026/2026-09-16-relay-registration/connection-lifecycle.json) are dated evidence, not current inventory. The subsequent [automatic activation release](../../post-mortem/releases/2026-09-16-relay-automatic-activation.json) records the historical installation policy. Provider qualification remains separate. Manual sign-in remains an operator action.

## Refresh an existing account

1. In Accounts, inspect Health and open **Reconnect** or **Connection settings** for that account.
2. Reuse its matching registration and desktop. Start the desktop if stopped.
3. Complete manual provider sign-in there.
4. Use **Reconnect account** to review and commit the replacement centrally.
5. Inspect saved account state, relay confirmation and actual capability separately. Reconnect preserves enabled/paused intent; a deliberately paused account still requires Enable.

The new pool workflow has no automatic provider-session renewal or background saved-file synchronization. A successfully saved guest login does not update central authority until the explicit registrar action. The legacy controller's optional saved-file sync is a different retained workflow and cannot update assigned pool accounts.

## Recoverable synchronization

Pool registration/review uses short-lived tickets, current desktop identity and central revision checks. A removed registration invalidates pending review/tickets; restoring an unfinished registration requires a fresh connection check. A lost response requires reading the original saved operation before an explicit retry, never creating a duplicate desktop/account.

If central persistence is unavailable, preserve the draft/registration and repair that dependency. Repeating provider sign-in does not fix a database error. Stale changes return `record_changed`; close, refresh and inspect before retry. Account rename synchronizes its linked registration, and immutable operation results retain the original intent.

The monitor is intentionally conservative during outages. Status and operation reads use a bounded retry budget with exponential backoff, jitter and a short circuit breaker; repeated failures fail fast and one half-open probe tests recovery, preventing every tab or monitor process from retrying at once. Connect and Reconnect account never retry the credential write automatically. Duplicate Connect requests are coalesced server-side, saved credential reads use the desktop manager's bounded I/O bulkhead and cannot overlap a background sign-in check on the same desktop, and an interrupted browser response triggers a read-only reconciliation of the original registration. Keep the page open or return to the same monitor: it preserves the last confirmed snapshot, disables mutations while disconnected, pauses hidden/offline polling and resumes with a capped backoff and jittered polling. The browser receives an explicit allowlisted monitor snapshot; control identity, credential material and implementation-only status stay server-side. A connection error keeps its recovery guidance beside the affected task with Refresh status and, when useful, Open Connections actions. If the registration is still not confirmed after reconciliation, wait for the control service and use Refresh before an explicit retry. Do not create a second desktop or repeat provider sign-in to work around an uncertain result.

Deterministic canonical account IDs can be encountered again after an older registry row is removed while its append-only history remains. The registry revision allocator must continue after that retained history; if a Connect attempt reports the bounded account-update confirmation message, keep the saved desktop sign-in, refresh the registration, and verify the applied revision after the database repair. Do not delete journal history or create a replacement account to work around the error.

The owner-authorized [legacy retirement procedure](../reference/relay-account-management.md#retire-obsolete-legacy-credentials) purges unused old credential material while retaining operational tombstones. It cannot retire a bound/assigned/in-flight account, and retired rows cannot become matching candidates or be restored. After cleanup, a verified manual connection establishes fresh canonical authority. This is separate from reconnecting an existing account, which preserves its identity. A remaining identity conflict requires administrator inspection; never ignore a live/removed binding or select an arbitrary match.

Provider rejection sets a separate reconnect-required state, preserving enabled/paused intent. Current rejected credentials cannot clear that state, and a late rejection report cannot invalidate a newer credential revision. Complete a fresh manual sign-in in the same desktop and save it. An enabled account can resume when verification succeeds; a paused account remains paused. Explicit Remove remains permanent. Temporary inventory failure keeps the saved sign-in and does not establish credential rejection. All errors use fixed local messages.

The older fsynced credential-intent journal and automatic sync intervals apply only to [legacy synchronization](legacy-desktop-enrollment.md#recoverable-synchronization). They are not the new pool registrar protocol.

## Rejected revisions and contamination

Use the health reason before choosing a repair: expired sign-in, unavailable access, cooldown, repeated failures and unknown connectivity differ. Generic 403/5xx/timeout does not establish all model permissions or a paid/free classification. Never clear counters or mark a record healthy to create capacity.

Use **Manage → Remove** to revoke an account and retain history, rather than deleting registry rows or homes. Removed registered accounts cannot be restored. An unfinished registration can be restored from Removed after cleanup and a new review. Known historical synthetic-fixture cleanup remains a narrowly scoped [legacy procedure](legacy-desktop-enrollment.md#rejected-revisions-and-contamination), not general account removal.

## Isolated integration tests

`npm run test:relay:authorization-db` applies the main migrations to a disposable PostgreSQL fixture and tests central scope, revisions, ticket invalidation, assignment, removal, replay and rollback; execution schema checks use a separate disposable database. `npm run db:test` owns the broad fixture, and `db:verify` checks migration/rollback integrity statically.

The runner strips inherited credentials, creates a randomly named/owned loopback database with synthetic authority, blocks unexpected network calls and cleans up only its owned resources. Do not point mutation tests at production or disable fixture guards. An explicit fixture override must remain a validated local test database. The full older harness details and dated initial verification remain [retained here](legacy-desktop-enrollment.md#isolated-integration-tests).

HTTP and synthetic browser tests cover viewer denial, cross-pool sessions, exact body fields, rename conflicts, removal, cleanup and restore. They do not sign into a real provider. See [hardening](RELAY_HARDENING.md), [desktop operations](RELAY_DESKTOPS.md) and [current state](../../post-mortem/CURRENT_STATE.md).
