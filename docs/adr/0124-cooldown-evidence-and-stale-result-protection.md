# Cooldowns require attributable evidence and current lease authority

Date: 2026-09-07

## Problem

Following the DreamBees recovery repair in ADR 0123, a deeper audit found that
unrelated numbers in error messages, model rejections, caller cancellation, and
relay failures could damage account health. Delayed health writes could overwrite
recovery or operator changes. Failed recovery probes did not reliably establish a
new durable deadline, and HTTP-date Retry-After values could be misread as seconds.

## Decision

Use established circuit-breaker practices: classify attributable failures, require
corroboration for ordinary transient failures, admit one recovery probe, and reject
stale results. Netflix's historical [Hystrix implementation](https://github.com/Netflix/Hystrix/wiki/How-it-Works)
uses failure thresholds and a trial request; Microsoft's
[circuit-breaker guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
describes exception filtering and limited recovery traffic. Our thresholds are
application choices, not claims of parity with those systems.

| Trigger | Result |
| --- | --- |
| Model/request rejection, generic 403, caller cancellation | Release capacity without changing credential health |
| Relay-owned failure | Do not blame the gateway's independently selected account |
| First ordinary transient provider failure | Record evidence; require three recent local failures before opening |
| Explicit provider backoff or failed recovery probe | Open immediately and preserve the retry deadline |
| Expired explicit cooldown | Database row lock admits one active probe across gateway processes |
| Successful current probe | Restore healthy and clear its preceding deadline |
| Expired lease, changed credential revision, newer fencing token, pause/revocation | Ignore stale health mutation while preserving settlement semantics |
| Invalid SQL, constraint/permission error, serialization conflict | Do not count as database availability failure |

Migration `20260907211705_galxai_cooldown_health_evidence_and_fencing` adds a
nullable lease health-revision snapshot. Existing leases without a snapshot cannot
change health. Function signatures, service-only privileges and pinned search paths
are preserved. Database time is sampled after lock acquisition when callers omit
the optional clock override. Failed probes persist bounded exponential backoff
with positive jitter; duplicate settlement cannot extend it.

Automatic health writes compare both fencing token and registry revision under
ordered row locks. Local warmup states map to existing database enum values.
Explicit provider deadlines are written before settlement so the failed-probe
fallback cannot shorten them. This is guarded ordering, not one transaction across
all accounting and health operations. Operator/admin writes retain their separate
authority.

Retry-After accepts strict numeric seconds or HTTP dates. Supported reset headers
also accept duration units. Explicit headers outrank incidental body text, and
jitter never schedules an earlier retry. This follows the reasoning in AWS's
[timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/),
including caution around retrying operations with uncertain side effects.

Image admission is non-queueing: no unobserved promise can later acquire an orphan
lease. Pre-dispatch exhaustion returns 503, `image_capacity_unavailable`, a readable
retry message, matching Retry-After and JSON seconds, and request IDs. Ambiguous
dispatch failures set `X-Should-Retry: false`; this advises compatible SDKs but does
not guarantee exactly-once execution. Caller cancellation reaches the adapter and
response-body reads. Fabricated fixed quota headers are removed.

## Verification

- `npm run test:cooldown`: 15 passing checks; added to Vercel preflight CI.
- Live rollback-only recovery fixture passes before and after migration.
- Isolated PostgreSQL schema: 24 concurrent admissions produce exactly one probe;
  neutral and duplicate settlement, failed-probe backoff, abandoned probes,
  expired success and credential rotation are covered. Temporary schema removed.
- Candidate migration and rollback exercised in a rolled-back transaction;
  rollback restores exact prior function definitions.
- Adaptive quota: 11 passing; fault-tolerance suite: 9 passing; relay transport:
  7 passing, including provider status retention and cancellation during body read.
- Database integration: 94/94 passing. Typecheck and production build pass locally.
- Lint: zero errors, six existing warnings. Migration verifier: zero errors,
  one existing wallet search-path warning. Supabase security advisor: no issues.
- Migration inventory after apply: 90 applied, zero pending, zero remote-only.

## Limits and operational follow-up

Recent-failure corroboration is local to a gateway process; the database recovery
probe exclusion is global. Standalone relay concurrency remains process-local.
This pass does not redesign the entire database connection breaker or promise
provider availability. The broader authority audit still reports the pre-existing
`fn_gateway_postflight_composite_mesh must be owner-only` failure, reproduced
without this migration. The affected lease functions pass their privilege checks.

Paid Hive remains disabled. Successful image delivery alone does not verify its
complete purchase and persistence flow.

## Rollout evidence

The database migration is applied. Preview deployment failed during page-data
collection because the preview environment lacks the existing vault key; compilation
and type validation succeeded. The production-environment candidate completed its
build and reached Ready before promotion to `galx.ai`:
`dpl_3yGgrQP83hhPmjchZ3F8f1Abns6p`,
`https://galxai-2g6pz58z6-cardsortings-projects.vercel.app`.
Its unique URL required Vercel SSO, so the actual external client check followed
promotion. Previous gateway target for rollback:
`https://galxai-2xn0n44a8-cardsortings-projects.vercel.app`.

The relay candidate ran on loopback port 3301 with a separate copied checkpoint.
An initial direct test used a gateway-only model alias and received provider 400;
the corrected upstream model returned HTTP 200 in 24,561 ms with a 1,081,262-byte
base64 image. This also demonstrated that the preceding model rejection did not
disable the account. The canary was stopped, then the live relay was replaced and
reported healthy. Its original checkpoint volume was preserved, and the previous
image is retained as `galxai-relay:rollback-cooldown-20260907`.

DreamBees' actual `createGatewayClient` / `generateGatewayImage` client then called
`https://galx.ai/v1/images/generations` successfully: HTTP 200 in 24,806 ms,
one 1,002,852-byte PNG, decoded and visually inspected. Request ID:
`img_5cc6316c-37a0-4a5f-b38e-2e78127dc91c`. SHA-256:
`a412d41af677351db3f3bc322d0d5284389064da23b805f183223bc61390c7b3`.
The database account was subsequently `healthy`, with a null cooldown and zero
active leases. No paid Hive switch was changed.
