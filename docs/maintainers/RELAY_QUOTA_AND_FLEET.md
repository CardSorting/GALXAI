# Relay quotas and account discovery

The relay defaults to **adaptive mode with no local call cap**. Its three-hour
window measures recent requests; it does not estimate an unknown provider quota.
Provider-reported limits are shown separately. `RELAY_QUOTA_WINDOW_MAX=0` removes
the local cap; a positive value explicitly enables an operator limit.

Requests rotate across unique, available accounts, preferring accounts with fewer
in-flight requests. `RELAY_SHARD_CONCURRENCY` defaults to four concurrent requests
per account. The per-tenant burst/rate governor remains independent of provider
quota accounting.

## Exhaustion and recovery

- Provider 429 responses and quota error frames pause the affected account.
- Explicit retry/reset deadlines take precedence over estimated backoff.
- Without a deadline, backoff starts at 60 seconds and doubles to 30 minutes.
- Once the deadline passes, only one recovery probe can run on that account.
- A request never retries the same account. `MAX_UPSTREAM_RETRIES` bounds failover.
- When no account can accept work, the relay returns 503 with `Retry-After` when
  a timed recovery is possible. Expired or rejected credentials need refreshing.
- Clearing local request history does not clear provider cooldowns.

## Authoritative registry

Use `npm run shards:clear-expired -- --dry-run` to preview cleanup, then
`npm run shards:clear-expired` to clear expired credentials from the pool.
The backend `clearExpiredCredentials()` function atomically marks expired records
revoked, retaining encrypted credentials and the registry audit trail for recovery.
It skips missing/invalid expiry dates, unexpired credentials, already-revoked
records, and database-reserved in-flight work. Trusted callers can additionally
scope by `userId` or pass `excludeShardIds` for local in-flight work. It requires
`DATABASE_URL`; cleanup failures never fall back to a local-only deletion.
Dry runs are previews, so their counts can change before cleanup executes.

When database credentials are configured, the relay reads encrypted records from
PostgreSQL (or the privileged Supabase Data API), decrypts them only in memory,
and deduplicates by provider account. Newer credentials take precedence over
expired duplicates. Revoked records are excluded; expired accounts are displayed
as disabled. Request entrypoints refresh the registry at most every five seconds,
coalescing concurrent refreshes and failing closed if it cannot be refreshed.

Local auth files are used only when no registry is configured. Registry snapshots
contain routing counters and cooldown deadlines, not access or refresh tokens.
The old `scripts/project-shards.ts` now requests an in-memory sync; it never exports
credentials to a local JSON file.

Docker commands load `.env.local` so the same registry configuration is used after
restarts. To rebuild and start manually:

```sh
docker compose --env-file .env.local -f docker-compose.relay.yml up -d --build
node --import tsx --test scripts/test-relay-adaptive-quota.ts
```

The standalone relay enforces per-process concurrency. Its registry refresh is
not a distributed lease; cross-replica reservation and settlement remain the
responsibility of the existing authoritative gateway lease path.
