# Maintainer runbook: shard authority and key rotation

<!-- docs-scope: domain-reference -->

Private reference for security, platform and relay operators, reconciled September 15, 2026. [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md) controls enrollment and provider renewal; the encrypted registry and fenced leases retain the database authority established by ADR 0115. Use [current state](../../post-mortem/CURRENT_STATE.md) for deployment evidence.

## 1. Operational model

Only a manually created Relay Desktop can supply a new managed account through explicit **Enroll shard**. The host validates its saved login and commits encrypted authority and the desktop binding. A matching eligible legacy record requires the same confirmation. PostgreSQL is the durable registry and lease authority; routing caches, queues and logs cannot establish it.

Provider expiry requires manual sign-in in the owning desktop. Saved-file synchronization validates and persists that login; vault rotation re-encrypts the same plaintext. Neither operation is external enrollment or an automatic provider refresh-token service.

The registry journal commits with its database mutation. Desktop link and sync checkpoints are a separate private recoverable store. Guest homes and assigned worker configuration necessarily hold credentials within their own private boundaries; they do not replace database admission authority.

## 2. Configuration and preflight

Inject configuration through the existing private secret mechanism; never put tokens in argv, browser controls or committed files.

| Setting | Role |
| --- | --- |
| `DATABASE_URL` | Host administrator SQL connection permitted to call private enrollment/refresh functions; controlled rewrap also requires the writer role |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Optional privileged registry-read fallback; no credential-write fallback or enrollment permission |
| `GALX_VAULT_KEY_V1`, `GALX_VAULT_KEY_V2` | Versioned vault roots during a reviewed transition |
| `GALX_VAULT_ACTIVE_KEY_VERSION` | Slot used for new ciphertext |
| `GALX_SHARD_ID_SECRET` | Stable opaque account-ID derivation |
| `GALX_AUDIT_SIGNING_SECRET` | Separate evidence signing authority |

`GALX_VAULT_MASTER_SECRET` and `GALX_VAULT_KEY` remain legacy v1 inputs. Do not change an existing identity or vault root to repair a login. Versioned-only deployments must configure the separate shard-ID key. Workers and desktops receive no database or vault roots.

For read-only inventory use:

```sh
npm run shards:doctor
node --env-file-if-exists=.env.local --import tsx scripts/apply-manual-desktop-enrollment.ts
```

Inspect decryption failures, legacy-cache presence, migration state, confirmation counts and denied external privileges separately. A retained unconfirmed record is expected during manual confirmation, not proof of corruption. `npm run shards:verify-authority` is a historical mutating harness and refuses the new schema; do not restore its old upsert grants. Use `npm run test:relay:manual-db`, `npm run db:test` and `npm run shards:test-authority` for isolated regression coverage.

## 3. Enrollment, renewal and revocation

Follow **Relay Desktops → New or existing workspace → Sign in → Enroll shard** and the [complete enrollment guide](RELAY_CREDENTIAL_ENROLLMENT.md). Only an eligible same-account record can be confirmed. Database binding cannot be transferred by editing a local link; revoked, dead, quarantined or ambiguous matches cannot be revived through enrollment.

Renew provider sessions manually in the bound desktop, then verify **Check now**, saved authority and worker readiness. Expired managed rows remain repairable and are excluded from routine expired-record revocation. The administrator CLI retains deliberate `--remove --shard-id <opaque_id>` revocation, preserving encrypted evidence. Revocation is not the routine expiry-repair operation.

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

Repair eligible accounts through manual sign-in/enrollment in their desktops. Revoke exposed provider sessions through the approved account process and coordinate any required database/vault rotation separately. Do not copy a root secret to another store or re-enable external insertion to restore service.

## 7. Admission and recovery

| Result | Response |
| --- | --- |
| Unconfirmed desktop provenance / `SHARD_NOT_AVAILABLE` | Use explicit manual enrollment; do not backfill bindings or source labels |
| `AUTHORITY_UNAVAILABLE` | Restore authoritative access; no cached production grant |
| Quota or concurrency refusal | Respect the database decision; inspect work and policy rather than resetting counters |
| `FENCING_TOKEN_MISMATCH` | Stop the stale attempt; never mutate with its old fence |
| Expired lease or failed heartbeat | Cancel according to the original execution contract and preserve uncertain work |
| Saved login but write/checkpoint failure | Repair SQL or local journal access, then retry the same desktop operation |
| Bound home lost or wrong-desktop conflict | Preserve registry and receipts; investigate administrator recovery before any transfer |

The paired manual-enrollment rollback reopens old grants and is not an availability shortcut. Follow [database recovery](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md), [controller recovery](../RESILIENCE_AND_DISASTER_RECOVERY.md) and original-operation reconciliation before resuming traffic.
