# Inference pipeline verification

Reviewed 2026-09-07. Verify each boundary independently; a module test is not a live deployment test.

## Boundaries

1. Application authorization and routing: `src/app/v1`, `GalxModelRouter`, provider adapters.
2. App-to-relay authentication: `OpenAIAdapter` sends the relay inference key for chat, stream attachment, and images, without provider credentials in those relay requests.
3. Registry projection: `src/relay/shard-registry.ts` reads configured encrypted authority and fails closed when required refresh fails.
4. Relay transport: bounded HTTP intake, local shard selection, provider attempts, asynchronous chat status/SSE, and synchronous image output.
5. Operator access: separate administrator keys, origin rules, bounded telemetry, and explicit recovery states.
6. Runtime containment: deployed non-root/read-only container and actual mount/resource settings.
7. Application/external execution and storage: separate code paths requiring separate verification.

## Repeatable checks

```sh
node --import tsx --test scripts/test-relay-hardening.ts scripts/test-relay-adaptive-quota.ts scripts/test-relay-client-auth.ts scripts/test-relay-telemetry.ts
npx tsc --noEmit
node --env-file=.env.local --import tsx scripts/test-relay-docker.ts
```

Mock transport tests need local sockets. The Docker suite checks a running deployment and may start the container if absent. Live image tests use provider/storage resources and are not implied by passing chat tests.

A live chat smoke test must authenticate, receive 202, attach with the same principal, and observe completed output without an SSE failure. Check 401/403 separation and actual registry eligibility. A liveness probe, successful TCP connection, or job acknowledgement alone is insufficient.

## Dated evidence

The 2026-09-07 rollout used a separate canary and repeated inference/SSE after production cutover. Registry loading and expired-account exclusion passed. Runtime inspection confirmed UID 1000, read-only root files, dropped capabilities, and only a named checkpoint volume. The prior image and checkpoint were retained for rollback. TypeScript and the relay/client/Docker checks passed as recorded in the [runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md).

The current document intentionally does not publish account IDs, generated artifacts, token values, timing promises, or a permanent assertion count. Re-run checks against the target image. Simulation results do not establish production throughput or exactly-once recovery.
