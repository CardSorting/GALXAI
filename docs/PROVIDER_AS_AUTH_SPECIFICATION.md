# Provider credentials and application identity

<!-- docs-scope: domain-reference -->

Private reference. Provider accounts supply execution authority through manual registration; they are not a GALX login method. [Account management](reference/relay-account-management.md) is the full implemented contract.

## Independent authorities

| Authority | Establishment | Permission |
| --- | --- | --- |
| GALX account | Verified account session and current access checks | Owned product operations under product policy |
| Pool operator/viewer | Scoped central principal and monitor session | Own-installation management or observation respectively |
| Registrar | Separate private monitor principal | Narrow review/registration/renewal handoff |
| Provider account | Manual sign-in in its owning desktop and explicit central registration | Candidate access subject to assignment, lifecycle and grant checks |
| Runtime | Fixed central principal, current ownership epoch and renewable grant | Own-pool execution under the existing central lease |

A provider login cannot establish a GALX session. GALX plan and provider account class are separate. A decoded hint, account label, existing row or stopped/running desktop cannot prove current access or capacity. Browsers cannot override principal scope.

## Supported lifecycle

Open the fixed Premium or Standard monitor. Register manually through its desktop, review access and save centrally in paused state. Premium uses paid provider accounts; Standard uses free accounts. Enable only after the execution gate and runtime checks permit it, then verify applied revision and actual capability. Both intend the same text catalog; only Premium accepts Sites/images.

Renew through manual same-desktop sign-in and explicit **Update saved sign-in → Save new sign-in**. Rename and account/registration removal are revision-aware central operations. Registered-account removal is permanent revocation with retained files/history; unfinished registration restoration requires new review. The [operator procedure](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [management reference](reference/relay-account-management.md) own detailed failure and retention behavior.

## Component responsibilities

| Component | Responsibility |
| --- | --- |
| [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts) | GALX identity; external provider connection/renewal disabled |
| [Provider route boundary](../src/lib/auth/provider-connection-route.ts) | Fixed terminal denial for retired routes |
| [Central service](../src/relay/pool-central.ts) | Main-project protocol, credential custody, registration and account operations |
| [Pool monitor](../src/relay/pool-monitor-server.ts) | Fixed operator/viewer sessions, scoped registrar and own-daemon desktops |
| [Pool runtime](../src/relay/pool-runtime.ts) | Own-account projections, in-process engines, current epoch and execution |
| [Execution repository](../src/relay/pool-execution.ts) | Own-project reservations and outcomes, without account authority |
| [Account inventory](../src/lib/supabase/repositories/RelayAccountInventoryRepository.ts) | Explicit central inventory projection |
| [GalxCryptoVault](../src/core/vault/GalxCryptoVault.ts) | Context-bound encryption; keys remain with authorized central consumers |

## Custody and concurrency

Only the central service has the main database/vault configuration. Runtimes receive only own-pool eligible material and restricted execution database access. Each monitor owns one VM's desktop daemon and separate scoped principals. Neither execution project stores a registry, credentials or another account budget. The shared physical Mac/admin remains trusted; two local VMs are not physical-host independence.

Expected revisions and immutable operation identity prevent stale overwrite and cross-scope replay. Registration ticket/review updates also advance revision. Central removal precedes desktop cleanup and does not claim remote provider logout. Retained guest files, memory, backups and ciphertext have distinct retention properties; this is not a claim of complete erasure or certification.

## Legacy and closed paths

The existing unassigned controller uses [legacy enrollment](maintainers/legacy-desktop-enrollment.md) and a conditional saved-file bridge. Assigned accounts are denied by its readers/writers/leases. No public API, CLI import, ambient host cache or generic Data API writer can create managed authority. [Exact retired routes](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md#closed-application-and-cli-paths) remain closed. Retained exchange helpers do not reopen them.

## Recovery and acceptance

Repair expiry manually, storage failure through its owning authority, and capability through current evidence. Never revive revoked accounts, transfer bindings, clear quota or reopen ingestion to restore capacity. [Vault rotation](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) is a separate reviewed administrative change preserving plaintext/identity. [Current state](../post-mortem/CURRENT_STATE.md) distinguishes installed local services from pending manual sign-ins, execution activation and public application cutover.
