# Relay credential enrollment and recovery

<!-- docs-scope: current-guide -->
> Private operator guide. [ADR 0133](../adr/0133-explicit-validated-enrollment-and-test-isolation.md) retains automatic workers and retires bulk credential discovery.

## Supported paths

| Intent | Action |
| --- | --- |
| Register a new operator-owned OAuth account | Explicit environment input, validated before create-only persistence |
| Refresh an existing account | Sign in within its linked desktop; verify and sync the saved login |
| Select a custom guest login home | `CODEX_HOME=/home/operator/path/to/codex-home galx-relay use-login` |
| Use a keyring-only login | Reauthenticate with `galx-relay login` using file-backed storage |
| Use a different saved account | Match an existing eligible account, review, then explicitly save the link |
| Scale workers | Let the controller reconcile validated authority and model capacity |

`npm run shards:import`, `--import`, `seedMultiAccountFleet()` and `RELAY_DISCOVER_HOST_CREDENTIALS=true` are retired compatibility entrypoints that fail with migration guidance. Do not restore host-cache scanning or reset existing account rows.

## Enroll one account

Configure the intended database/vault authority and stable ID secret in the operator environment. Inject `GALX_SHARD_ACCESS_TOKEN` and `GALX_SHARD_ACCOUNT_ID` privately; `GALX_SHARD_REFRESH_TOKEN` and `GALX_SHARD_EMAIL` are optional. ID derivation uses `GALX_SHARD_ID_SECRET` or the configured vault secret. Never put credentials in argv, screenshots, tickets or documentation.

```sh
node --env-file-if-exists=.env.local --import tsx scripts/manage-shards.ts --add
npm run shards:doctor
```

The CLI refreshes authority, rejects an existing account, checks token/account consistency and expiry, and validates authenticated inventory before encrypting and saving. SQL and privileged Data API creation reject a conflicting ID rather than upserting it. A collision cannot reset credentials, ownership, quota, revocation or compliance flags. New records do not assert unverified HIPAA, ZDR, BAA or PII assurances.

Inventory acceptance is only a precondition. Observe actual worker capability evidence before declaring readiness. Cold allocation also has a bounded inventory check; existing owned workers can be adopted without repeating that cold-start check.

This command accepts the OAuth input above. Registry projection can also read explicit encrypted API-key records. This does not mean every application registration path was rewritten or that a desktop auto-enrolls unknown accounts.

## Refresh an existing account

1. Open `npm run relay:desktops` and review the selected workspace's shard link.
2. Pause new work if repair requires a hold. Accepted work can finish.
3. Complete sign-in through the device-code panel or `galx-relay login` in Terminal.
4. Select an existing custom guest home with `CODEX_HOME=/home/operator/path/to/codex-home galx-relay use-login` if needed. Set `CODEX_HOME` to the directory containing `auth.json`; the helper accepts no path argument.
5. Verify the credential save and checkpoint. Retry sync explicitly when appropriate; do not equate local login with registry authority.
6. If a hold blocks the replacement worker after rotation, review the saved authority and explicitly resume to permit allocation. Then verify the worker-applied revision and fresh capabilities. Admission still fails closed until those checks pass. If no replacement is needed, review existing capability health before resuming.

The bridge also considers the private OAuth setup written by `galx-relay setup`, subject to the same account/expiry/validation checks. If multiple sources exist, it selects by saved-file evidence rather than assuming that local process startup synchronized authority.

The bridge polls saved credentials; it is not an independent provider refresh daemon. Reads reject unsafe paths, symlinks, unexpected ownership, malformed or expired tokens, conflicting account hints and stale credential families. An unrelated login cannot overwrite a linked account. Matching suggests an existing eligible account for review; it does not create one.

The helper requests file-backed provider CLI credentials; it does not export keyrings. The operator must finish provider sign-in. A challenge, saved file or successful fixture is not proof of live account authentication.

## Recoverable synchronization

The host validates the candidate and current encrypted registry revision. It fsyncs a private write intent before compare-and-swap replacement. The intent contains fingerprints and expected revision evidence, not plaintext tokens. Restart can finalize an already committed write or retry against unchanged original authority; newer external revisions are not overwritten.

The journal and registry are separate stores. This protocol is recoverable, not a distributed atomic transaction. A checkpoint failure produces an explicit error and must not claim saved sync state. An unchanged previously applied file cannot restore an older credential family.

Saved-file checks are normally spaced by ten seconds; current-authority checks use a one-minute interval. Transient failures back off with jitter. Manual sync provides an explicit retry; persisted state remains authoritative.

## Rejected revisions and contamination

A 401 is persisted by credential revision to suppress repeated container starts. A 403, 502 or timeout alone does not permanently reject a credential. Historical rejection journals do not retain the original HTTP exchange; do not infer its exact status from a rejected state.

September 9 investigation matched 11 rejected rows to exact synthetic integration fixtures. See [dated evidence](RELAY_SESSION_VERIFICATION_20260909.md). For that exact fixture family, cleanup is dry-run by default:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/quarantine-fixture-shards.ts
```

Review authority and counts before deliberately adding `--apply`. It conditionally revokes matching, unchanged, idle fixtures and preserves encrypted evidence and counters. Changed or busy rows are skipped. Other rejected accounts are not thereby fixtures.

## Isolated integration tests

The broad mutating suite requires `GALX_INTEGRATION_DATABASE_URL`: PostgreSQL on literal `127.0.0.1` or `[::1]`, with database name `galx_integration_test` or a `galx_integration_test_` suffix. Caller query and fragment fields are rejected. The guard adds local-only TLS-disable configuration and strips inherited Supabase Data API variables before repository initialization.

```sh
# Inject a URL for a disposable, initialized local test database first.
npm run db:test
```

Missing or production configuration must fail before repository work. Random identities and finally cleanup supplement the guard. Billing-only mode retains its separate disposable schema harness. The enrollment storage regression also uses a disposable harness; neither authorizes pointing the broad suite at production.

Related: [key rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md), [hardening](RELAY_HARDENING.md), [desktop operations](RELAY_DESKTOPS.md).
