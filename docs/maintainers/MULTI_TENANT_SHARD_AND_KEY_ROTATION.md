# Maintainer Runbook: Shard Authority and Key Rotation

> Audience: security engineering, platform engineering, and shard-fleet on-call.
> Authority: ADR 0115 and `public.galx_shard_accounts` in Supabase PostgreSQL.

## 1. Operational model

PostgreSQL is the only durable credential and work-lease authority. BroccoliDB is a disposable process-local routing projection. The registry journal is a secret-free transactional outbox. Local JSON, browser storage, queues, logs, and edge KV are not approved credential stores.

```text
operator/OAuth -> validate + encrypt -> PostgreSQL registry + journal
                                           |
                                           +-> bounded worker projection
                                           +-> fenced, renewable work leases
```

The queue delivers authorized intent, a socket carries a live projection, and neither can register, revoke, or lease a credential by itself.

## 2. Required production configuration

Inject these through the deployment secret manager, never through committed files or command-line arguments:

- `DATABASE_URL`: pooled backend PostgreSQL connection.
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: optional Data API failover; it must be an `sb_secret_…` key or a legacy JWT with role `service_role`.
- `GALX_VAULT_KEY_V1`, `GALX_VAULT_KEY_V2`: versioned vault root slots during rotation.
- `GALX_VAULT_ACTIVE_KEY_VERSION`: version used for new ciphertext.
- `GALX_SHARD_ID_SECRET`: HMAC key for stable, non-reversible shard IDs.
- `GALX_AUDIT_SIGNING_SECRET`: domain-separated evidence and attestation signing root.

`GALX_VAULT_MASTER_SECRET` and `GALX_VAULT_KEY` are legacy v1 inputs. New deployments should use versioned slots. A durable-authority process refuses to synthesize a missing key slot.

Run the non-secret-printing preflight:

```bash
npm run shards:doctor
npm run shards:verify-authority
npm run shards:test-authority
```

Healthy output requires no JSON cache, no remediation candidates, no decryption failures, and an admin Data API fallback only when a genuine service credential is configured.

The live verifier also inventories the complete shard SQL surface. It fails if a client role can execute a shard-touching routine, if a retired lease table has runtime grants, if a legacy gateway/vault routine becomes callable, or if the v2 gateway stops delegating to the fenced lease authority. Do not repair such a failure by granting direct table access.

## 3. Credential enrollment and revocation

Use secret-manager-injected environment variables for one credential at a time:

```bash
# GALX_SHARD_ACCESS_TOKEN and GALX_SHARD_ACCOUNT_ID must already be injected.
# GALX_SHARD_REFRESH_TOKEN and GALX_SHARD_EMAIL are optional.
npm run shards -- --add

# Explicitly discover and import supported local provider login files.
npm run shards:import

# Reversible revocation; this does not hard-delete evidence.
npm run shards -- --remove <opaque_shard_id>
```

The CLI rejects token, refresh-token, account, and email command-line flags because argv and shell history are observable. Output uses opaque IDs or hashes and never prints provider credentials or raw account identifiers.

## 4. Zero-downtime vault rotation

Rotation follows the familiar deploy–rewrap–prune pattern. Never change a single unversioned master secret in place: doing so makes existing ciphertext undecryptable.

### Phase A — dual-read, old-write

1. Generate an independent v2 root in the secret manager.
2. Configure the current root as `GALX_VAULT_KEY_V1` and the new root as `GALX_VAULT_KEY_V2`.
3. Keep `GALX_VAULT_ACTIVE_KEY_VERSION=v1` and deploy everywhere.
4. Verify every worker can read v1 and has the v2 slot before rewrapping.

### Phase B — transactional rewrap

Dry-run first. The command locks matching registry rows, decrypts and re-encrypts each payload with unchanged AAD, executes the updates, then rolls the transaction back:

```bash
npm run shards:rotate-vault -- --from v1 --to v2
```

Apply only after the dry-run reports every selected row rewrapped and zero failures:

```bash
npm run shards:rotate-vault -- --from v1 --to v2 --apply
npm run shards:doctor
npm run shards:verify-authority
```

The rewrap transaction advances each registry resource version and writes a corresponding secret-free journal fact. It never prints shard identities or plaintext.

### Phase C — new-write, dual-read, then prune

1. Set `GALX_VAULT_ACTIVE_KEY_VERSION=v2` and deploy everywhere.
2. Observe authentication, lease, decryption, and journal error rates through a full rollback window.
3. Confirm `keyVersions.v1` is zero in `npm run shards:doctor`.
4. Remove the v1 slot only after all v1 session-token lifetimes and backup-retention requirements have elapsed.

Rollback before pruning is configuration-only: restore `GALX_VAULT_ACTIVE_KEY_VERSION=v1`. If rows were rewrapped, run the same transactional command from v2 to v1 while both slots still exist.

## 5. Database password and service-key rotation

Treat any credential committed to source history as compromised even after deleting it from the current tree.

1. Rotate the database password in Supabase Database Settings or the approved management API.
2. Update `DATABASE_URL` in every runtime and operator secret store.
3. Restart/redeploy pooled clients and run `npm run shards:verify-authority`.
4. Rotate the service/secret key independently if it was exposed; never place a publishable key in the service-role variable.
5. Invalidate old deployment revisions and CI artifacts that still contain superseded secrets.

Do not rotate the live database password until all consumers and their secret-update paths are inventoried; an incomplete rotation is an avoidable outage.

## 6. Legacy JSON or fallback-key incident

If `.galx-shards.json` reappears or credentials were encrypted with a compiled/shared fallback:

1. Stop ingestion from the affected producer.
2. Preserve only the minimum forensic hash/metadata required by incident policy; do not attach the file to tickets or logs.
3. Import confirmed live credentials through the PostgreSQL authority.
4. Run `npm run shards:doctor`, then use `--quarantine-legacy` for reversible isolation.
5. Remove the local file and verify `legacyJsonCachePresent=false`.
6. Rotate affected provider refresh/access credentials and any exposed database or vault root.
7. Re-run typecheck, authority verification, and the router forensic suite before restoring traffic.

## 7. Lease incidents

- `AUTHORITY_UNAVAILABLE`: fail closed; do not enable process-local production leases.
- `SHARD_TOKEN_QUOTA_EXHAUSTED`, `SHARD_REQUEST_QUOTA_EXHAUSTED`, or `SHARD_CONCURRENCY_EXHAUSTED`: treat the database decision as authoritative even if the local scorer disagrees.
- `FENCING_TOKEN_MISMATCH`: terminate the stale attempt; never retry mutation under the old token.
- `LEASE_EXPIRED` or failed heartbeat: cancel the transport and let the supervised execution decide whether a new authorized attempt is permitted.
- Rising reclaimed leases: inspect worker crashes, heartbeat latency, connection-pool saturation, and lease TTLs before increasing limits.

The emergency rule is simple: restore availability by issuing new bounded authority, never by copying the root credential into another store.
