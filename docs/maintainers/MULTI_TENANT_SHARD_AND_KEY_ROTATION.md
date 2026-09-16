# Maintainer runbook: shard authority and key rotation

<!-- docs-scope: domain-reference -->

Private reference for security, platform and relay operators, reconciled September 15, 2026. [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md) controls enrollment and provider renewal; the encrypted registry and fenced leases retain the database authority established by ADR 0115. The central extension and lifecycle commands are defined in [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md). Use [current state](../../post-mortem/CURRENT_STATE.md) for deployment evidence.

## 1. Operational model

Only project `mazhcjisettrzbqhorvp` owns canonical accounts, encrypted credentials, exclusive pool assignments, lifecycle history and account leases. The [central account contract](../reference/relay-account-management.md) governs the new services. Premium paid provider accounts support text/Sites/images; Standard free accounts support text only. Execution projects contain identity/reservations/outcomes, not accounts or another budget ledger.

Manual sign-in takes place in the owning pool monitor's desktop. **Connect account** verifies and saves authority centrally, enabling new connections under the verified automatic-activation policy. Existing pauses and manual installation holds remain in effect. Later renewal is explicit **Reconnect → Save new sign-in**. Labels, files and valid tokens alone cannot establish assignment. The new monitor does not use the legacy background saved-file bridge. Rename, removal and unfinished-registration restoration use central revisions and immutable operation identity. Removal is revocation with retained evidence, not erasure or upstream logout.

## 2. Configuration and preflight

Use component-specific secret files from [service installation](../runbooks/relay-pool-services.md). Only the central service receives the main-project database login and vault/identity configuration. Each runtime has only its own restricted execution login and runtime principal; each monitor has its own operator/viewer/registrar principals. Do not clone a broad controller environment into a pool VM. Pool hosts do not receive peer keys or state. The local Mac/admin remains trusted.

`npm run relay:accounts:status` reads central inventory without granting mutation/readiness. `npm run relay:local -- status` and `npm run relay:local -- verify` inspect installed services and isolation. Earlier acceptance retained closed gates; see [current state](../../post-mortem/CURRENT_STATE.md) for later evidence. Inventory is not provider qualification.

### Vault configuration for authorized central consumers

| Setting | Role |
| --- | --- |
| `DATABASE_URL` | Trusted administrator SQL connection for the deliberate rewrap procedure; service protocol configuration remains component-specific |
| `GALX_VAULT_KEY_V1`, `GALX_VAULT_KEY_V2` | Versioned vault roots during a reviewed transition |
| `GALX_VAULT_ACTIVE_KEY_VERSION` | Slot used for new ciphertext |
| `GALX_SHARD_ID_SECRET` | Stable opaque account-ID derivation |
| `GALX_AUDIT_SIGNING_SECRET` | Separate evidence-signing authority |

`GALX_VAULT_MASTER_SECRET` and `GALX_VAULT_KEY` remain legacy v1 inputs. Versioned-only consumers require the separate identity key. Never rotate an identity/vault root to repair a provider login. Inject values through private configuration, not argv, browser controls or committed files. A service/publishable key cannot substitute for the restricted credential-write protocol.

`npm run shards:doctor` and the manual-policy inventory in [database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) inspect retained central records. `shards:verify-authority` is a historical mutating harness that refuses the new schema; do not restore its old grants. Use isolated current database tests for regression coverage.

## 3. Registration, renewal and revocation

Use the [current manual procedure](RELAY_CREDENTIAL_ENROLLMENT.md) in the fixed Premium/Standard monitor. Connect verifies account class, identity and current access atomically before applying the installation policy to the new connection. A different desktop or pool cannot take over a binding. Saved revision, applied runtime revision and capability acceptance are separate. Account removal cannot be reversed; unfinished registration restoration requires new review and preserves history.

Central removal precedes desktop disconnection/stop. If cleanup fails, use **Removed → Stop desktop**; do not restore authority to stop a container. Keep homes and canonical evidence. Hard upstream revocation needs the provider's own session process; database removal does not claim to perform it.

For eligible unassigned accounts in the retained single-controller deployment only, use [legacy enrollment](legacy-desktop-enrollment.md). Its **Enroll shard**, **Check now**, saved-file bridge and maintenance holds are scoped legacy behavior. Legacy writers/leases reject assigned accounts. Historical CLI revocation is not the new pool management interface or routine expiry repair.

Retired legacy rows contain no usable ciphertext and must be excluded from decryption/rewrap inventories. Their retirement marker and empty credential fields are immutable; do not restore them from a backup to repair a connection. The [owner-only retirement contract](../reference/relay-account-management.md#retire-obsolete-legacy-credentials) preserves operational history. Reconnect for a rejected token preserves its bound account; it is not a vault or identity-key rotation.

## 4. Vault rotation

Use a staged deploy–rewrap–prune transition. Inventory readers and backups first. The rewrap takes row locks, so assess contention and the rollback window; this procedure does not promise zero interruption.

### Phase A — dual-read, old-write

1. Prepare the new independent root in the secret manager while retaining the current slot.
2. Configure both slots on authorized registry readers/writers, keeping the current active version.
3. Reload those consumers through their component runbooks and verify old ciphertext is still readable. Worker/desktop images do not receive the roots.

### Phase B — transactional rewrap

The private administrator command locks selected rows, decrypts and re-encrypts with the same associated identity data, and explicitly assumes `galx_desktop_writer` for the protected update. It preserves plaintext, ownership, enrollment binding and operational counters. Its default transaction rolls back:

```sh
npm run shards:rotate-vault -- --from v1 --to v2
```

After reviewing a successful dry-run and the authorized target, the explicit apply command is:

```sh
npm run shards:rotate-vault -- --from v1 --to v2 --apply
```

Verify key-version inventory and decryption with `shards:doctor`, and read the manual-policy inventory again. Do not use the obsolete live upsert verifier. The database journal records changed registry revisions; no plaintext or credential identity should be emitted in the command result.

### Phase C — new-write, dual-read, then prune

Set the active write slot to the new version and reload the affected consumers. Observe decryption, credential-write and lease results through a rollback window. Confirm no current rows use the old slot before considering removal, and retain it as long as old signed/encrypted session data or backups require it.

Before pruning, rollback can restore the prior active slot while both roots remain. Already rewrapped rows require the same reviewed reverse rewrap if old ciphertext is needed; changing the active slot alone does not rewrite them. Never roll back provider credentials or desktop provenance as part of vault recovery.

## 5. Database password and service-key rotation

Inventory all consumers and update paths before rotating either credential. Update private configuration, reload connection pools, and verify registry reads plus the manual-policy privilege inventory. Rotate service credentials independently from the database password. A publishable key cannot replace a service credential. Retain a coordinated rollback and retire obsolete secret-bearing deployments under the applicable release policy.

These are separate administrative changes. The documentation procedure does not authorize credential rotation during ordinary troubleshooting or manual provider sign-in.

## 6. Legacy cache or exposed credential incident

Stop the affected producer and retain minimal private evidence. Do not import `.galx-shards.json`, host login caches or token environment variables into the managed fleet. Inspect `shards:doctor` and the CLI's reversible legacy-cache quarantine before any cleanup. Preserve necessary forensic evidence and never publish the source file.

Repair eligible accounts through manual sign-in and explicit save/registration in their owning monitor; use the separately scoped legacy procedure only for unassigned accounts. Revoke exposed provider sessions through the approved account process and coordinate any required database/vault rotation separately. Do not copy a root secret to another store or re-enable external insertion to restore service.

## 7. Admission and recovery

| Result | Response |
| --- | --- |
| Unconfirmed provenance or assignment | Use the owning manual registration procedure; do not backfill bindings, labels or pool assignments |
| `AUTHORITY_UNAVAILABLE` | Restore authoritative access; no cached production grant |
| Quota or concurrency refusal | Respect the database decision; inspect work and policy rather than resetting counters |
| `FENCING_TOKEN_MISMATCH` | Stop the stale attempt; never mutate with its old fence |
| Expired lease or failed heartbeat | Cancel according to the original execution contract and preserve uncertain work |
| Saved login but unconfirmed write | Repair central access, inspect the current revision and reconcile the same operation before an explicit retry |
| Bound home lost or wrong-desktop conflict | Preserve registry and receipts; investigate administrator recovery before any transfer |

The paired manual-enrollment rollback reopens old grants and is not an availability shortcut. Follow [database recovery](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md), [controller recovery](../RESILIENCE_AND_DISASTER_RECOVERY.md) and original-operation reconciliation before resuming traffic.
