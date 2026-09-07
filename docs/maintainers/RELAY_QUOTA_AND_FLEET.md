# Relay fleet and credential recovery

Reviewed 2026-09-07. The standalone relay reads a refreshed registry projection and schedules locally. It does not acquire the platform pool's database lease per attempt. Per-process concurrency and rejection state must not be presented as global coordination.

## Selection and quota

The default adaptive mode has no local call cap. The three-hour window measures recent requests. Provider-reported quota, an optional `RELAY_QUOTA_WINDOW_MAX`, cooldown, credentials, and active slots are separate constraints. Unknown provider quota is not estimated from local usage.

Selection favors fewer in-flight requests with rotating ties. `RELAY_SHARD_CONCURRENCY` defaults to four. Retry selection excludes already attempted shard IDs and is also bounded by attempt count, shared retry credits, and a job deadline. No eligible alternate ends recovery.

Quota feedback pauses an account. Explicit reset/retry deadlines take precedence over estimated cooldown, which starts at 60 seconds and doubles up to 30 minutes without provider guidance. Recovery admits one probe under the implemented local conditions. Resetting local history does not clear provider cooldowns or rejection.

## Registry and credentials

Configured registry mode reads PostgreSQL or the privileged Data API and decrypts only in process memory. Refresh is coalesced with a five-second freshness interval. An empty registry replaces the projection; failure does not restore personal credentials. Revoked/retracted rows and unusable decryption results are excluded. Expiry is derived from available registry/secret/JWT metadata, using the earliest expiry at installation.

Upstream authentication rejection disables the local credential and attempts an immediate fingerprint checkpoint. Concurrent quota/transport failure cannot reopen it. Changed credentials can restore eligibility when rotation can be identified. An eligible account is not proof of current provider access. Rejection is not durably written to the registry by this relay, so another relay does not immediately learn it.

The deployed container has no personal auth-file mount and disables host discovery. Explicit local development can opt into discovery only outside registry mode. `scripts/project-shards.ts` requests a fleet sync with an administrator key; it does not export plaintext credentials.

## Operator recovery

1. Inspect the reason: expired/rejected credential, timed cooldown, registry failure, or full slots.
2. For expired/rejected credentials, sign in or rotate through the supported registry enrollment path. Use `npm run shards:import` for explicit operator credential import, then sync.
3. For cooldown, respect provider retry information. For registry failure, restore authority connectivity rather than loading stale local rows.
4. Verify one small request; do not treat an availability display as a provider probe.

`npm run shards:clear-expired -- --dry-run` previews registry cleanup. The mutating command marks eligible expired rows revoked while retaining encrypted material and audit history; it skips reserved in-flight records and supports trusted caller exclusions. It requires direct database access. Preview counts can change before mutation. This is a separate database administration action, not the relay's automatic expiry exclusion.

[Deployment](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) · [API](../RELAY_API_REFERENCE.md) · [Security](../relay-security.md)
