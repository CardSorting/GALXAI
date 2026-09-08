# Keep observations separate from health authority and bound recovery work

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Database health/lease authority remains scoped to this record. Federation worker lifecycle and image compatibility are separately governed by ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md). Incident/deployment observations below are dated evidence, not live availability.

Date: 2026-09-07

## Findings

The follow-up to ADR 0124 found an overlooked competing authority:
`fn_report_shard_health_cf` still updated account status, cooldown deadlines,
failure counters and registry revisions from unfenced telemetry. Two old failures
could reopen a recovered account, and old successes could clear a newer cooldown.
The function also locked each account and repeatedly scanned its probe history.

Additional findings:

- The connection breaker admitted every caller while half-open. A delayed success
  could close a newer outage, and delayed failures could extend its deadline.
- Local checkout saturation and query-specific statement deadlines were treated
  as evidence of database-wide transport failure.
- Arbitrary SQL was automatically retried after ambiguous timeout errors.
- Concurrent lease release callbacks repeated authoritative I/O before either
  retired the local lease. Expired callbacks could publish local health changes.
- A slow flush allowed the pending buffer to grow without a hard bound. The batch
  limit triggered flushing but did not limit the actual payload to the database's
  100-observation maximum. Telemetry failure replayed successful health writes.
- The telemetry repository reported successful remote ingestion after both remote
  paths failed. Its local observation table also retained samples without a bound.

## Decisions

Migration `20260907215504_galxai_observation_only_health_ingestion` makes telemetry
append-only. It performs bounded validation followed by one set-based insert,
returns an empty `statusTransitions` list, and never changes an account. UUID
observation IDs deduplicate replay; legacy callers without UUID IDs remain accepted.
The schema, RLS and service-only SECURITY INVOKER signature are unchanged. Types
now describe the existing `probe_timestamp_ms` and `created_at` columns accurately.
The rollback restores the exact prior function, including its legacy authority
behavior, so prefer keeping this migration during application rollback.

Database execution now reserves a single-use permit tied to a breaker epoch.
Opening or recovering invalidates older completions. Only one half-open operation
can execute per process. Local backpressure is checked before reserving a permit
and does not manufacture outage evidence. A neutral probe releases its slot.
Recent transport failures still open the circuit; query-specific SQL failures do
not. Connections are reusable after successful rollback of ordinary SQL errors.
The generic SQL wrapper executes once; operation-specific callers own retry safety.

Tenant transaction setup now separates the unparameterized SET commands from the
single parameterized claims SELECT, avoiding PostgreSQL's multiple-command bind
error. Claims are serialized before admission, so invalid metadata cannot strand
the recovery permit. The explicit user ID and role override auxiliary metadata;
role setup errors fail the transaction. A live read-only test confirmed the
authenticated role and expected claims inside the transaction and role cleanup
afterward.

Lease settlement uses one in-flight promise per lease, retired on success or
failure. Duplicate callbacks share I/O; a failed operation remains retryable.
Already-expired callbacks settle usage without publishing health evidence, and
stale callbacks cannot blacklist a model after credential replacement. Durable
fencing and revision checks from ADR 0124 remain in force.

The background buffer retains at most 1,000 pending probes and 500 coalesced shard
transitions, plus at most 100 in-flight items per lane. Each database payload is
at most 100. Health and telemetry have independent exponential retry schedules
(1–30 seconds plus up to 249 ms jitter), so telemetry retry backoff does not delay
eligible health work. A successful lane is not requeued when the other fails.
Invalid or old best-effort observations are dropped before the server's five-minute
validation limit. Diagnostics expose dropped counts and both retry deadlines.
The repository retains at most 2,000 local observations. These queues are best-effort
projections, not durable accounting; loss under sustained overload is explicit.

## Familiar patterns and scope

This applies bounded work, separate overload handling, and recovery probes from
Netflix's historical [Hystrix design](https://github.com/Netflix/Hystrix/wiki/How-it-Works).
It follows [node-postgres pooling guidance](https://node-postgres.com/features/pooling)
on bounded reusable connections and returning checked-out clients, and the retry
reasoning in [AWS's backoff guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/).
Removing account update locks from observation ingestion uses PostgreSQL's
[row-lock compatibility](https://www.postgresql.org/docs/current/explicit-locking.html).
These are engineering patterns, not a claim of parity with a particular app.

The connection breaker and settlement promise cache are process-local. The
database lease fences remain the cross-process authority. In-flight telemetry can
still occupy a pool connection until its configured deadline; independent retry
schedules do not create separate physical pools. Existing repository-level fallback
may still retry an operation; the generic wrapper change is not an exactly-once
guarantee. No production QPS or latency multiplier is claimed.

## Verification

- `npm run test:cooldown`: 19 passing tests, included in existing CI.
- 1,000 concurrent recovery calls admit one query; stale and duplicate completions
  are ignored. Checkout overload makes no database call or breaker transition.
- 100 simultaneous release callbacks share one authoritative settlement.
- A 10,000-event burst keeps pending buffers within bounds and limits batch size;
  a failed telemetry lane does not replay successfully committed health state.
- Rollback-only PostgreSQL fixture: 100-event batches leave all account fields
  unchanged in healthy, cooldown, paused and revoked states; UUID replay inserts
  zero duplicates; legacy inputs, validation and function privileges pass.
- Migration rollback restores the exact prior function definition.
- Private-schema contention fixture: 1,600 observations in 16 batches completed
  in 776 ms while an account `FOR NO KEY UPDATE` lock was held, with a 500 ms lock
  timeout on ingestion. The schema was removed. This proves lock compatibility in
  the fixture, not production throughput capacity.
- Database integration: 94/94 passing. Typecheck passed. Lint: zero errors and six
  pre-existing warnings. Migration verifier: zero errors, one existing wallet
  search-path warning. Security advisor: no issues.

Paid Hive remains disabled. The broader pre-existing authority audit issue noted
in ADR 0124 is outside these function changes.

## Rollout

The telemetry migration is applied. Inventory confirms 91 applied migrations,
zero pending, and zero remote-only entries. The post-deployment observation
fixture passes. The previous gateway target for application rollback is
`https://galxai-2g6pz58z6-cardsortings-projects.vercel.app`.

The final production build passed compilation, type validation and page generation,
reached Ready, and was promoted to `galx.ai`:
`dpl_51ZgPPPTz1adSonhL84NFHAt9Amm`,
`https://galxai-jwjoytn6u-cardsortings-projects.vercel.app`.

DreamBees' actual image client returned HTTP 200 in 29,911 ms through the promoted
gateway, with one 1,001,032-byte PNG, decoded and visually inspected. Request ID:
`img_078d623e-23fd-45ec-822e-6a052a782fb8`. SHA-256:
`62c75f5ddb4ccfc711be1903009b92d911ddba5b94ee753ba9965c61acfbe4c0`.
The account was healthy afterward, with null cooldown and zero active leases.
The post-deployment security advisor reported no issues. The 94-test integration
suite also passed after the final transaction fix and installed migration.
