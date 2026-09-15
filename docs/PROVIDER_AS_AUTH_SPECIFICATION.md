# Provider credentials and application identity

<!-- docs-scope: domain-reference -->

Private component reference, reconciled September 15, 2026. [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md) defines manual desktop-only shard enrollment. The historical provider-as-auth design is not an active application connection path.

## Three independent authorities

| Authority | Establishment | What it permits |
| --- | --- | --- |
| GALX account | Verified account authentication and current session | Account-owned product operations under their access and plan rules |
| Desktop administrator | Host-issued Relay Desktops session | Local workspace actions and explicit manual enrollment |
| Provider account | Operator completes sign-in inside the owning desktop | Candidate upstream credential, admitted only after validation and durable enrollment |

A provider login cannot create a GALX session. Account verification, preview approval and inference keys cannot grant desktop administration. A workspace label, decoded account hint or existing registry row cannot prove a current provider login or serving capacity.

## Supported account lifecycle

1. Open the desktop shortcut or `npm run relay:desktops` on the controller host.
2. Manually create or open the account's existing desktop and complete provider sign-in there.
3. Choose **Enroll shard**. The host reads the saved guest login and checks the running desktop, expected link, account identity, expiry and authenticated inventory.
4. Commit encrypted authority with its unique owning-desktop binding, then persist the local link. Confirm matching eligible legacy records through this same action; no automatic backfill is permitted.
5. Verify the saved credential, worker-applied revision and requested capability before work. Renew expired provider sessions manually in that same desktop, then use **Check now** or enabled saved-file sync.

Creation, linking and matching never enroll. A different desktop cannot take over a binding. Revoked/dead/quarantined accounts and ambiguous matches remain rejected. Keep the bound home for repair; deleting it is not an ownership transfer. The [enrollment runbook](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) owns recovery details.

## Component responsibilities

| Component | Current responsibility |
| --- | --- |
| [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts) | GALX session/authorization operations; provider connection rejected and provider shard renewal disabled |
| [Provider route boundary](../src/lib/auth/provider-connection-route.ts) | Fixed terminal denial for retired external connection routes |
| [Desktop enrollment](../src/relay/desktop-enrollment.ts) | Saved guest credential validation and explicit new-account or legacy confirmation |
| [Desktop manager](../src/relay/desktop-manager.ts) | Persisted workspace, operation serialization, expected link and saved-login recheck |
| [Desktop credential refresh](../src/relay/desktop-credential-refresh.ts) | Same-desktop conditional replacement of enrolled authority, with recoverable intent |
| [Shard repository](../src/lib/supabase/repositories/ShardRepository.ts) | Registry reads and allowlisted policy updates; no general credential insert/upsert |
| [Manual enrollment migration](../supabase/migrations/20260914231914_manual_desktop_shard_enrollment.sql) | Protected writer, unique binding and durable admission enforcement |
| [GalxCryptoVault](../src/core/vault/GalxCryptoVault.ts) | Encryption and context-bound cryptographic helpers |

Retained provider exchange helpers are implementation history/compatibility utilities, not another accepted enrollment route. No API, CLI, ambient host cache or ordinary Data API call can supply new managed shard authority. See [closed routes](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md).

## Custody and concurrency

Registry ciphertext remains bound to tenant, shard and provider. The controller uses private configured vault and identity keys; worker and desktop containers receive no vault root or database connection. Safe reads from the owning guest home are the input boundary. Browser pages accept no provider token upload, and host keyrings are not extracted.

Enrollment preserves an eligible existing account's owner, counters, holds and history. Refresh checks the current encrypted revision and the owning desktop. Database events commit with their mutation; the local desktop checkpoint remains a separate recoverable store. Stale or conflicting work cannot overwrite newer authority.

Garbage-collected strings, guest homes, checkpoints and backups have distinct retention limits. These controls do not certify complete memory erasure, zero retention, hardware isolation, SOC 2 or FAPI compliance.

## Recovery and acceptance

Repair expiry through manual sign-in, persistence failure through registry/journal repair, and missing capability through fresh evidence. None is repaired by reopening external ingestion, changing account ownership, reviving revoked rows or clearing quota. Vault ciphertext rotation follows its separate [administrator runbook](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) and cannot enroll or renew a provider session.

Use [current state](../post-mortem/CURRENT_STATE.md) for deployed observations. The September 15 release sealed the boundary and preserved existing records; actual manual provider enrollment and image capability remain separately recorded acceptance work. Older September 9 fixtures and challenges retain their original scope.
