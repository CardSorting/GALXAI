# OAuth and token lifecycle boundaries

<!-- docs-scope: domain-reference -->

Private source reference, reconciled September 15, 2026 against [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md). [Current state](../post-mortem/CURRENT_STATE.md) records deployment and acceptance separately.

## Lifecycle map

| Credential or session | How it is established and renewed | Authority |
| --- | --- | --- |
| GALX account session | Verified account login and the account session renewal flow | Application identity and current account permissions |
| Local monitor session | Host launcher exchanges a one-use ticket; reopen after expiry or restart | Read-only local operational view |
| Relay Desktops session | Separate host-issued desktop ticket and browser session | Local desktop administration; ordinary accounts and monitor sessions cannot enroll |
| Provider CLI login | Operator completes sign-in inside a manually created desktop | Saved guest login; not yet registry authority |
| Managed shard | Explicit **Enroll shard** validates the saved login and binds it to that desktop | Encrypted PostgreSQL record with confirmed desktop provenance |
| Replacement provider credential | Operator signs in again in the same desktop; **Check now** or enabled saved-file sync verifies and saves it | Conditional replacement of the bound account's current encrypted revision |
| Worker access | Controller assigns scoped transport credentials and one eligible provider credential | Private worker execution, not enrollment authority |

Provider-session renewal, account-session renewal, browser reconnection and vault re-encryption are separate operations. The relay does not run an independent provider refresh-token daemon. A provider token retained in encrypted historical data does not authorize an automated renewal path.

## Initial enrollment and existing-record confirmation

Create the desktop manually in Relay Desktops, finish provider sign-in there, and choose **Enroll shard**. The request carries only the expected existing link, never a token. The host validates the persisted running desktop, saved-file identity and expiry, current registry state and authenticated inventory before the private SQL write. It then persists the local link.

The same explicit action can confirm a matching eligible legacy account while preserving its owner, quotas, counters, holds and history. Records without both enrollment fields remain excluded even if their credentials are unexpired. Creation, polling, matching, linking, API calls to retired provider routes and CLI imports cannot silently confirm them. Revoked, dead, quarantined, ambiguous or differently bound accounts fail closed.

## Manual renewal and saved-file synchronization

When a provider session expires, open its owning desktop and complete sign-in again. Start a stopped desktop first. Saved-file synchronization only transfers a login that already exists there; enabling it is not consent or capability for background provider renewal.

Reads validate owned guest paths and reject symlinks, special or oversized files, missing selected homes, malformed or expired tokens and inconsistent account hints. Custom login homes require explicit selection within the guest home. Keyring-only credentials require file-backed reauthentication.

For an already enrolled account, the bridge validates the candidate against the current owner, desktop binding and encrypted revision. It flushes a private write intent, performs compare-and-swap replacement and checkpoints the accepted fingerprint. A newer revision wins over stale work. Recovery can finalize an already committed replacement or retry unchanged authority; the local journal and database are separate stores, not one distributed transaction.

A saved login, committed credential, applied worker revision and ready requested capability are distinct checkpoints. A hold can prevent worker replacement even after a successful save. Follow the [complete enrollment and recovery procedure](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).

## Closed application provider paths

The OpenAI/ingest aliases and provider OAuth URL, PAR, callback and refresh handlers return the terminal 410 contract in [the route reference](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md). They do not parse credentials, contact a provider, establish a GALX session or change cookies. Middleware sends these exact retired routes to their denial handlers without preview or account sign-in work.

`GalxAuthEngine.authenticateProviderUser` rejects provider connections; `refreshProviderShardTokens` returns false without renewing a provider token family. Retained `GalxOAuthManager` exchange helpers and process-local coalescing structures do not reopen registry enrollment. GALX account login/callback, logout, session management and device grants retain their independently verified contracts in [workspace authentication](operations/workspace-auth.md).

## Durable authority and privilege boundary

`managed_desktop_id` and `desktop_enrolled_at` are paired nullable fields; a unique non-null desktop binding permits one managed account per desktop. Confirmed rows must be OpenAI OAuth accounts. The private writer role owns enrollment/refresh functions, and protected-field triggers reject other credential or binding mutations. Service-role ingestion and generic registry upsert are closed. Ordinary repository saves change allowlisted policy metadata only.

Both registry projection and durable lease admission reject unconfirmed rows. Existing source labels are historical data, not proof of manual enrollment. Database owners remain trusted; the separately reviewed [vault rewrap procedure](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) can preserve plaintext and binding while changing ciphertext.

## Failure and evidence

Expired sign-in requires manual renewal; wrong account or desktop requires review; transient inventory/storage failures require bounded recovery; a failed checkpoint cannot claim success. A credential 401 is revision-specific. A generic 403 or timeout alone is not permanent rejection and does not prove image support.

Use the isolated role/race/rollback tests and authorization suites in [hardening](maintainers/RELAY_HARDENING.md). [September 15 activation](../post-mortem/releases/2026-09-15-manual-desktop-enrollment-activation.json) verifies policy closure, not a completed manual provider enrollment or restored image generation. Older device-flow and throughput results remain dated evidence, not current conformance guarantees.
