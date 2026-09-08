# Image requests recover after an expired account cooldown

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Database health/lease authority remains scoped to this record. Federation worker lifecycle and image compatibility are separately governed by ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md). Incident/deployment observations below are dated evidence, not live availability.

Date: 2026-09-07

## Incident

DreamBees' real `createGatewayClient` / `generateGatewayImage` client called
`https://galx.ai/v1/images/generations` with `openai-gpt-image-2` and automatic
SDK retries disabled. A provider disconnect at approximately 25 seconds led to
a relay 503 when no alternate account was available. Subsequent requests failed
before dispatch with HTTP 500, `image_generation_failed`, and message `route`.
The latter response was reproduced through the same DreamBees client.

The usable account's persisted status remained `cooldown` after its deadline.
The local circuit breaker permitted a recovery probe, but
`fn_acquire_shard_lease` accepted only `healthy`. Its `SHARD_NOT_HEALTHY` reason
was consumed by the error sanitizer's internal-identifier redaction.

## Decision and deployment

Applied migration `20260907210015_galxai_expired_cooldown_probe_recovery` using
the Supabase CLI. Migration inventory confirms 89 applied and zero pending.

- Admission permits one active lease for an account in `cooldown` or `exhausted`
  whose explicit deadline has elapsed. The existing row lock serializes admission
  across gateway processes. Future or missing deadlines remain closed.
- Successful settlement clears the preceding cooldown and durably restores
  `healthy`. Failed probes, revocations, and newer cooldowns remain intact.
- Existing credential expiry, permission, token, request, rolling-window,
  concurrency, idempotency, and lease reclamation checks are preserved.
- Both functions remain service-only `SECURITY INVOKER` functions with their
  existing signatures and pinned search paths. No tables or columns change.
- The paired rollback restores the prior functions without deleting account or
  lease records. Both migration and rollback were executed in a rolled-back test
  transaction before deployment.

The router source also classifies failed image admission as unavailable rather
than synthesis failure and recognizes capacity codes before identifier redaction.
At the initial repair, this TypeScript change was verified locally and live recovery
came from the database migration. The subsequent deployment and deeper hardening
are recorded in [ADR 0124](0124-cooldown-evidence-and-stale-result-protection.md).

## Verification

- `scripts/test-shard-cooldown-recovery.ts`: passed before and after deployment;
  covers probe exclusion, idempotent replay, abandoned lease recovery, settlement,
  newer cooldowns, revocation, credential expiry, quota and function privileges.
- `scripts/test-image-admission-errors.ts`: passed.
- `npm run db:verify`: passed, with an existing unrelated wallet migration warning.
- `npm run db:test`: 94/94 passed.
- `npx tsc --noEmit`: passed.
- The broader `verify-shard-authority-live.ts` audit fails on the existing
  `fn_gateway_postflight_composite_mesh must be owner-only` check, both with and
  without this migration. That unrelated permission issue is not changed here.
- First post-repair request through DreamBees' actual client: HTTP 200 in
  28,124 ms; one base64 PNG, 1,065,798 bytes, decoded and visually inspected.
  SHA-256: `51aa2e566b0bdbf2311fc10e7e820b42a3b0c22717734750d08d9f2b0e00c0ef`.
  The image was 1254 × 1254 despite the existing client requesting 1024 × 1024;
  exact dimension enforcement is outside this recovery repair.
- The production account returned to `healthy`, with no cooldown and zero active
  leases after successful delivery.
- Follow-up request through the same client: HTTP 200 in 30,906 ms; one decoded
  PNG, 993,994 bytes. SHA-256:
  `e908c86f17b8b6f0a6163431384af60708db10b59b285e3d96bab362bd6de9aa`.

Paid Hive entry is not enabled by this repair. This verifies the external image
client path, not the complete hosted Hive purchase and persistence flow. Provider
disconnects can still occur; the repair prevents a transient failure from leaving
subsequent requests permanently blocked after cooldown expiry.
