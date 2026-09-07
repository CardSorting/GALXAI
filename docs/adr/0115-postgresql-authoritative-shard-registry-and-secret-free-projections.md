# ADR 0115: PostgreSQL-Authoritative Shard Registry and Secret-Free Projections

## Metadata

* **Status**: Accepted
* **Date**: 2026-09-04
* **Authors**: @galxai-architects
* **Subsystem**: credential registry, vault, shard leasing, routing projections
* **Impact**: credential custody, multi-worker consistency, revocation, auditability
* **Migrations**: `20260904150000` through `20260904210000`

## Current implementation scope (2026-09-07)

The durable lease requirements below describe the platform pool's database-backed dispatch path. The standalone `src/relay/relay-server.ts` reads the PostgreSQL credential registry but does **not** acquire a database lease for each upstream attempt. Its shard slots, retry budget, and observed provider-auth rejection are process-local. An upstream rejection does not automatically revoke the registry row or propagate to another relay replica. [ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) defines that deployed relay boundary.

“Secret-free” refers to credential projections/journals excluding provider secrets. Relay job checkpoints can still contain unfinished prompt/messages; it is not a zero-retention promise. The Docker deployment disables personal credential discovery and stores relay state in a dedicated named volume.

## 1. Context

The shard fleet was previously persisted to `.galx-shards.json` and mirrored to PostgreSQL with fire-and-forget writes. That design created two competing realities: a process could route from a stale local file after a remote revocation, and a failed database write could still appear successful locally. A repository-embedded fallback encryption secret also made historical local ciphertext recoverable by anyone with source access. Automatic edge synchronization created a third credential store by copying long-lived provider tokens into edge KV.

This violates the authority doctrine in ADR 0114. A cache, transport, queue, or edge projection cannot decide which credentials exist or remain authorized.

## 2. Decision

Supabase PostgreSQL is the sole shard registry authority:

```text
Operator / OAuth callback proposes registration or rotation
                         │
                         ▼
             Credential registry service
             validate + encrypt + stable ID
                         │
                         ▼
        PostgreSQL transaction on galx_shard_accounts
          state + monotonic registry_revision
                         │ same transaction
                         ▼
        galx_shard_registry_events (secret-free outbox)
                         │
                  LIST / bounded refresh
                         ▼
             BroccoliDB in-memory projection
                         │
                         ▼
                  routing and transport
```

The governing rule is:

> PostgreSQL contains accepted credential authority. BroccoliDB contains a replaceable routing projection. The journal contains secret-free observations. No raw credential is durably copied to local JSON, browser storage, logs, queues, or edge KV.

### 2.1 Credential custody

- Provider access and refresh tokens are AES-256-GCM ciphertext bound to tenant, shard ID, and provider through AAD.
- Versioned vault roots must come from deployment secret management. Durable-authority processes have no compiled or random fallback; isolated development without a database may use a random process-lifetime key that cannot become durable authority.
- Stable shard IDs use HMAC-SHA-256 with `GALX_SHARD_ID_SECRET`; raw provider account IDs are not used as database identifiers or CLI output.
- PostgreSQL stores encrypted payload columns. The change journal deliberately excludes ciphertext, IVs, tags, tokens, account IDs, and API keys.
- Automatic raw-token edge synchronization is removed. A future edge worker may receive short-lived, audience-bound leases from a broker, but never the long-lived registry secret.

### 2.2 Mutation semantics

Production registration, rotation, revocation, and deletion use awaited async methods. A mutation is published to the local routing table only after PostgreSQL confirms it. When database authority is configured but unavailable, mutations fail closed. Synchronous methods remain explicitly memory-only for deterministic simulations and cannot create a disk file.

The database trigger advances `registry_revision` only when registry/control-plane fields change. Hot reservation, latency, and usage counters do not advance the registry revision or flood the outbox. Registry state and its corresponding event commit in the same transaction.

### 2.3 Projection semantics

Workers perform an authoritative LIST on initialization and replace their in-memory projection. Routing entrypoints enforce a bounded staleness interval (default five seconds) and coalesce concurrent refreshes into one query. A remote empty result is authoritative; workers must not resurrect stale local rows.

This mirrors the useful part of Kubernetes LIST/watch and Envoy xDS semantics without pretending that a cache owns state:

- `registry_revision` is the resource version;
- `journal_offset` is replay order, not the state version;
- a projection may lag, be discarded, and rebuild;
- future journal consumers checkpoint an offset and re-LIST if retention makes that offset unavailable.

### 2.4 Lease authority

The database lease procedures are backend-only. `PUBLIC`, `anon`, and `authenticated` have no execute privilege; only the backend service role may call them. Repository-level lease acquisition, release, and scavenging never fall back to process-local authority when PostgreSQL is configured. This preserves fencing semantics under database partitions.

The high-speed pool still scores candidates and maintains per-process scheduling telemetry, but that selection is only a proposal. PostgreSQL locks the shard row and independently checks health, revocation, cooldown, credential expiry, continuously refilled token/request capacity, durable provider rolling-window history, and the global concurrency ceiling before it recognizes work ownership. Fractional refill carry is stored explicitly so frequent checks cannot erase sub-unit credit. Platform pool chat and image dispatchers on this database-backed path await that decision before receiving a usable lease and await idempotent reconciliation before retiring it locally.

Every acquisition through this database-backed lease path requires an idempotency key. Lease procedures use a consistent shard-before-lease lock order to avoid acquisition/release/scavenger deadlocks. Long-lived streams renew their lease by heartbeat; renewal requires the current fencing token and transport is cancelled if authority can no longer be proven. Synchronous pool methods remain available only for simulations and operator diagnostics; they must never be described as cross-worker ownership.

The service-role Data API fallback uses a database-owned registry upsert function. Its conflict path updates only control-plane fields and cannot overwrite live reservation, usage, concurrency, or fencing counters from a stale worker projection.

Legacy tier leases and composite gateway RPCs previously formed competing authority paths. Their client/runtime grants are revoked and their tables remain owner-only forensics. Versioned gateway v2 RPCs accept a request idempotency key, serialize duplicate admissions before shard selection, and delegate to the same authoritative acquire/release functions. The L1 gateway cache is keyed by request ID; it can replay one request's decision but cannot lend the same lease to unrelated work. Wallet settlement is guarded by a unique lease receipt so ambiguous postflight retries cannot double-charge.

Universal QoS admission remains a policy proposal, not shard ownership. Its runtime adapter must exchange an accepted QoS result for an authoritative PostgreSQL shard lease before returning a dispatchable result; synthetic `cached_lease` and production local-success fallbacks are forbidden.

The adjacent LUMI/community compute-authority repositories follow the same failure rule. Their acquisition, heartbeat, settlement, sweep, and grant RPCs are service-only capabilities; runtime roles cannot mutate their lease/quota tables directly. A configured direct PostgreSQL pool is preferred, the privileged Data API is a fallback, and loss of both authorities produces an explicit rejection rather than a locally minted lease or grant.

## 3. Industry pattern mapping

| Established pattern | GALXAI application |
| :--- | :--- |
| Kubernetes `resourceVersion` plus LIST/watch | monotonic `registry_revision`, replaceable worker projection, journal offset for replay |
| Envoy xDS version/nonce ACK-NACK separation | accepted registry revision is distinct from projector delivery and acknowledgement |
| Transactional outbox | registry row and secret-free journal fact commit atomically |
| Stripe idempotency | stable HMAC shard ID makes repeated operator imports converge on one record |
| Vault leases | renewable, fenced work leases; future edge access is short-lived and revocable, never a root-credential copy |
| Temporal service separation | durable authority, task delivery, and worker execution remain distinct concerns |

## 4. Failure policy

| Failure | Required behavior |
| :--- | :--- |
| PostgreSQL unavailable during registration/rotation/revocation | Reject; do not mutate routing projection |
| PostgreSQL unavailable during authoritative lease operation | Fail closed; never mint an in-memory substitute |
| Local scorer proposes stale/exhausted capacity | PostgreSQL rejects atomically under the shard lock |
| Frequent requests produce fractional refill credit | Preserve the remainder durably; never round it away per request |
| Stream outlives its initial lease | Renew with its fencing token; cancel transport if renewal fails |
| Worker projection exceeds staleness bound | Coalesce an authoritative refresh; fail routing if it cannot refresh |
| Empty authoritative registry | Replace the projection with empty; do not restore local seeds |
| Journal projector unavailable | Registry commits continue; projector resumes from `journal_offset` |
| Slow or failed telemetry batch | Requeue within bounded memory; expose failure count and last failure time |
| Duplicate credential import | Stable ID upsert; no duplicate logical identity |
| Legacy/synthetic entries | Reversible quarantine before deletion |

## 5. Security boundary

- `galx_shard_accounts` and `galx_shard_registry_events` have RLS enabled and forced.
- `PUBLIC`, `anon`, and `authenticated` have no table privileges on either table.
- Registry upsert and lease mutation procedures are service-only and pin `search_path` to `public, pg_temp`.
- Superseded `SECURITY DEFINER` shard, vault-rewrap, and gateway routines are owner-only; no runtime role can execute them.
- Legacy shard lease/telemetry tables are forced-RLS, owner-only forensic records rather than writable fallbacks.
- The privileged Supabase client requires a service-role/secret key and never substitutes a publishable key.
- Admin-key detection accepts only `sb_secret_…` credentials or legacy JWTs whose role is `service_role`; a misplaced publishable key fails closed.
- CLI credential input comes from environment or an interactive secret channel, never command-line arguments.
- Direct database credentials and vault master keys must never have source-code defaults.

## 6. Operations

```bash
# Explicitly import operator-owned local provider credentials into PostgreSQL
npm run shards:import

# Inspect counts and remediation categories without printing identities/secrets
npm run shards:doctor

# Verify live RLS, grants, journal hygiene, counter-safe upsert, capacity,
# idempotency, fenced renewal, and no JSON cache
npm run shards:verify-authority

# Verify fail-closed and memory-only local behavior
npm run shards:test-authority
```

`--quarantine-legacy` is a reversible remediation: it sets `status = revoked` and `permission_retracted = true`. Deletion is a separate, explicit operation after retention and incident review.

Key and incident procedures are defined in [Shard Authority and Key Rotation](../maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md), including transactional dry-run rewrap, database-password rotation, and legacy JSON response.

## 7. Consequences and follow-ups

### Positive

- There is one durable credential authority.
- Revocation survives process and host restarts.
- Failed writes cannot masquerade as successful local mutations.
- Registry change replay cannot leak credential material.
- Client roles cannot enumerate shards or mutate leases.

### Required follow-ups

- Rotate any database password or provider credential that was ever protected only by a repository-embedded fallback or committed to source history.
- Keep new production dispatchers on the awaited authority adapter; synchronous lease callsites are permitted only in simulations and diagnostics.
- Move the implemented versioned secret-manager key slots behind a managed KMS/HSM KEK when the deployment platform supports direct envelope operations.
- Add a durable journal consumer with checkpoint retention once push invalidation is needed below the bounded refresh interval.

## 8. References

- [Supabase database security](https://supabase.com/docs/guides/database/secure-data)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Kubernetes API resource versions and watches](https://kubernetes.io/docs/reference/using-api/api-concepts)
- [Envoy xDS protocol](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [HashiCorp Vault leases](https://developer.hashicorp.com/vault/docs/concepts/lease)
- [Temporal architecture](https://github.com/temporalio/documentation/blob/main/docs/encyclopedia/architecture/how-temporal-works.mdx)
