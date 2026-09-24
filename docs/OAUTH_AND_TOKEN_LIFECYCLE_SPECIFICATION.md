# OAuth and token lifecycle boundaries

<!-- docs-scope: domain-reference -->

Private reference. [Account management](reference/relay-account-management.md) owns the implemented pool lifecycle; [workspace authentication](operations/workspace-auth.md) owns GALX sessions. [Current state](../post-mortem/CURRENT_STATE.md) separates installation from real provider acceptance.

## Lifecycle map

| Credential or session | Establishment and renewal | Authority |
| --- | --- | --- |
| GALX account session | Verified application login and account session flow | Current customer identity/permissions only |
| Pool monitor session | Fixed native launcher exchanges a scoped one-use ticket; relaunch after expiry | Own-pool viewer or operator privileges checked centrally |
| Registrar principal | Private monitor configuration, separate from viewer/operator | Narrow saved-login review/registration handoff for its fixed installation |
| Provider login | Manual sign-in inside the owning registration desktop | Candidate guest credential, not yet central account authority |
| Registered account | Explicit **Connect account** | Encrypted main-project account and exclusive assignment; new connections enable under the verified automatic policy |
| Replacement sign-in | Manual same-desktop sign-in, then **Reconnect → Save new sign-in** | Revision-checked central credential replacement |
| Runtime projection/grant | Scoped runtime principal, current epoch/revisions and existing central account lease | Own-pool execution for a bounded renewable interval |

Provider renewal, browser reconnection, GALX session renewal and vault re-encryption are separate. Opening a monitor never signs in to a provider or reviews credentials. The new monitor has no legacy background saved-file synchronization bridge. No independent provider refresh-token daemon establishes managed authority.

## Registration and renewal

Open the fixed Premium monitor, choose **Connect account**, prepare its desktop and manually sign in with a paid provider account. Choose **Connect account** to verify access and register atomically. The browser submits references/revisions rather than provider token contents; the scoped registrar reads the saved guest login and central authorization validates its authority. A verified automatic-activation policy enables the new connection and activates its own ready relay; manual holds leave it paused. Reconnect and replay preserve the existing enabled/paused setting.

Review tickets last two minutes and review evidence five minutes. Every registration update changes its revision, including ticket/review updates. Stale review or a changed record requires fresh inspection. Assignment cannot be edited or transferred by changing a desktop link. Revoked/removed or conflicting accounts cannot be revived through registration.

For renewal, use the owning desktop and explicit save flow above. Saved authority, applied runtime revision and actual requested capability are separate checkpoints. The full [manual procedure](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) covers safe saved-file validation, wrong-account rejection, expiry and recovery.

## Lifecycle commands and recovery

Rename, pause, enable, remove and unfinished-registration restore use immutable operation identity, expected revision and actor/pool/installation scope. Registered-account rename also updates the linked registration. `record_changed` preserves current authority; refresh and explicitly retry after review. Lost responses are reconciled as the same intent, not automatically repeated.

Removing a registered account permanently revokes it and removes its linked registration from active results. Removing an unfinished registration cancels tickets/review and permits later restoration with fresh review. Central removal commits before desktop disconnection/stop. Failed stop remains visible as pending cleanup. Removal retains files, credentials, assignments, leases and history; it is not upstream logout or data erasure.

## Closed application provider paths

[The exact retired routes](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md#closed-application-and-cli-paths) return 410 without parsing credentials, contacting a provider, changing cookies or creating a GALX session. `GalxAuthEngine.authenticateProviderUser` rejects provider connections; `refreshProviderShardTokens` does not renew provider families. Retained exchange utilities do not reopen enrollment. Account login/callback, logout and device grants retain their own verified-user contracts.

## Durable custody and legacy scope

Only the central service holds the main-project database/vault authority. Runtime and registrar principals are separate and installation-bound. Execution databases cannot store or manage accounts. Base manual-desktop provenance, protected writer rules and the existing account lease ledger remain central; generic registry upsert and external credential insertion stay closed. Database owners remain trusted schema administrators.

The retained single controller supports **Enroll shard** and conditional saved-file synchronization only for eligible unassigned legacy accounts. Its separate recoverable local journal and maintenance holds remain documented in [legacy enrollment](maintainers/legacy-desktop-enrollment.md). Assigned accounts and bound leases are denied by that path. Those synchronization semantics are not the new pool renewal contract.

## Verification and limits

Use [hardening checks](maintainers/RELAY_HARDENING.md) for role/race/replay/rollback and HTTP isolation coverage. Central outage denies new grants and renewal; uncertain work never redispatches. A fresh health label or expired cooldown is not provider acceptance. [Current state](../post-mortem/CURRENT_STATE.md) records the later automatic-activation release and live account/readiness checks. Provider generation qualification remains separate. Keep account material and diagnostics out of public DTOs and browser assets.
