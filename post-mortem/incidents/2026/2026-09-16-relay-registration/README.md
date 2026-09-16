# Manual relay registration blocked by historical identities

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260916-REGISTRATION, SEV-3, relay, responder Codex in the owner session. One Premium registration has a saved manual sign-in but cannot complete access review. Public customer impact is unverified. Execution was already closed independently.

## Evidence and timeline

Source baseline `b8eb43f97f79707c36b29106cfe206cf41889047`. The installed central and Premium monitor use the September 15 management images. Journal event EVT-20260916-relay-registration-diagnosis records the initial inspection. The provider accepted the existing saved token and returned four accessible models. No generation was submitted.

## Cause and contributing conditions

The enrollment matcher found 31 records for the same identity: 30 permission-retracted unbound historical records and one non-retracted unbound record. It raises `credential_account_ambiguous` before any enrollment write. The central HTTP handler erased this typed cause as generic service unavailability, and the monitor displayed an uncertain-action error. All 56 registry envelopes were readable. Database inspection used the existing restricted central protocol in a rolled-back transaction.

## Containment and recovery

The initial error-only correction and rolled-back historical-identity rehearsal are retained in [the first verification](verification.json). The owner then explicitly requested obsolete-record purge and a stable reconnect strategy, superseding the pending historical-record selection. [Lifecycle evidence](connection-lifecycle.json) records the applied migration, exact cleanup and installed service acceptance.

All 56 legacy records were unbound, unassigned, idle and free of active leases. The owner-only transaction erased ciphertext, IV and tag, zeroed expiry, retracted permission and stamped immutable retirement markers while preserving IDs, counters, leases and journals. Retired tombstones are excluded before identity matching. The owning desktop and its saved manual sign-in were preserved. The existing registration now resolves to one newly verified canonical connection, paused, with four available models and a matching runtime acknowledgment. Exact Connect replay returns that same account.

The initial migration attempt rolled back because production had removed the no-login writer's schema CREATE privilege. The corrected migration grants it only for the ownership transfer and revokes it in the transaction; isolated tests and live readback confirm the privilege remains absent. No partial schema or cleanup was left by the failed attempt.

## Verification and limits

58 source tests, six boundary checks, 69 connection-database checks, 155 central authorization checks, 50 execution-database checks, 94 general database checks and a 272-page production build passed. Thirty synthetic browser variants and installed desktop/mobile checks passed with no reported Axe violations, overflow or page errors. Five service images passed 50 packaging checks; local VM/services/TLS/peer isolation passed 69 checks. See the [targeted UX audit](../../../../docs/knowledge/audits/2026-09-16-relay-connections.md).

At that registration verification, registration was recovered, execution remained closed in both pools and Standard had no connected account. Provider inventory verifies access to four models but does not establish generation acceptance. No public app release or generation was submitted. Purging this live registry does not erase external provider sessions or database backups.

## Prevention and closure

ACT-024 covers the retired-record matcher boundary, atomic Connect/replay, safe errors, independent rejected-token state, same-account reconnect, terminal removal and scoped refresh regression. Its local installation and original-sign-in acceptance are complete. Unrelated activation and provider-generation work remains tracked separately; recovery does not close those actions.

## Later execution activation — September 16

After the owner manually connected a separate Standard account and requested activation, [local activation acceptance](../../../releases/2026-09-16-relay-execution-activation.json) verified one current connected account per pool. The supported activation command passed 69 installation checks before opening both central execution gates. Separate revision-checked enable operations reached revision 2 with matching relay acknowledgment. Both live monitor pages display **Execution: Allowed** and **Enabled · Applied**; both runtime readiness and authenticated model inventory return HTTP 200. This resolves the later activation report without re-registering either account. No generation was submitted; provider qualification and ACT-025 remain separate.

## Automatic activation follow-up — September 16

The owner requested removal of repeated manual gate approvals. [Automatic activation acceptance](../../../releases/2026-09-16-relay-automatic-activation.json) records the additive policy migration, two installed monitor images and actual policy/readiness acceptance. New verified connections enable atomically and the owning runtime reconciles activation. Reconnect and replay preserve intentional pauses; owner closure disarms automatic activation even during a connection race. ACT-026 is complete for this installed contract. Actual provider generation and caller delivery remain separate under ACT-025.
