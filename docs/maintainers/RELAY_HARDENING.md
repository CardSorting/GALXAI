# Relay hardening checks

<!-- docs-scope: current-guide -->
> Private validation guide. Choose checks for the changed boundary; record revision, environment and results rather than treating historical test counts as a gate.

## Isolated services and account management

```sh
npm run test:relay:services
npm run test:relay:authorization-db
npm run test:relay:access
node --test scripts/test-relay-monitor-model.mjs
npx tsx scripts/verify-relay-pool-monitor.ts
```

The service/central database suites cover fixed principal scope, peer denial, account class, central-only custody, exclusive assignment, legacy writer/lease exclusion, runtime grants/epochs, operation replay and revision conflicts. Management coverage includes rename synchronization, permanent account removal, unfinished-registration restore, review/ticket invalidation, retained history, failed desktop cleanup and denial of removed desktop controls. Standard Sites/image/provider-hosted-tool requests must make zero provider calls. Execution persistence is verified against its separate disposable schema; it cannot create an account ledger.

The service suite also runs `scripts/test-standard-pool.ts`: real local HTTP/WebSocket fixtures verify Standard's one-job account limit beyond `202`, fair ordering across model subsets, immediate provider-limit exclusion, checkpoint recovery, current projected cooldowns, bounded central-denial backoff, duplicate lock ownership, retained unknown work and Premium compatibility. These fixtures use synthetic central/store dependencies; they complement existing database authorization tests rather than proving new database behavior. No schema change is required for [Standard scheduling](../reference/standard-relay-scheduling.md).

The scheduler recovery cases additionally exercise clock changes/damaged history, stale reservation release, a pool-wide five-second recovery budget with healthy traffic, per-job quota observation deduplication, late/shorter reset hints, successful recovery persisted after grant cleanup, fresh quota during otherwise successful output, cancellation during lookup and stale/future projection denial. Do not infer remaining provider quota or real throughput from these fixtures.

The browser fixture exercises both monitors, search/status/health filters, issue ordering, empty/unavailable states, rename conflict, removal dialogs, failed-stop cleanup, restore, viewers and sign-out. Inspect responsive layout, keyboard focus and accessibility, not only screenshots. Launcher tests verify fixed destinations and ticket handling. These fixtures do not perform real provider sign-in.

`npm run relay:local -- verify` is separate actual-installation acceptance: VM/daemon identities, no host mounts, reviewed running images, peer firewalls, TLS, scoped roles and Standard denial. It writes private evidence and does not open execution. Current acceptance and image IDs are linked from [current state](../../post-mortem/CURRENT_STATE.md). For exact service bounds, rollout and rollback use [service installation](../runbooks/relay-pool-services.md).

## Automatic agent tool checks

`npm run test:agent:tools` verifies automatic continuation, argument repair after rejection, schema validation, duplicate-call exclusion, cancellation, missing executors, step bounds and session separation. The service suite exercises complete SDK → relay → synthetic provider → callback → continuation chains over JSON and SSE in both pools. It checks call/result identity, Standard rotation between steps, omitted private metadata, discarded partial arguments, and rejection of hosted tools, orphan results, incomplete function output and approval frames. These are fixture checks, not real free/paid account qualification.

## Retained federation regressions

```sh
npm run test:relay:capabilities
node --import tsx --test scripts/test-codex-image-tool.ts scripts/test-relay-client-auth.ts
node --import tsx --test scripts/test-relay-enrollment.ts scripts/test-desktop-enrollment.ts
npm run test:relay:manual-db
node --import tsx --test scripts/test-public-information-boundary.ts scripts/test-image-public-http.ts scripts/test-relay-client-auth.ts
npm run test:relay:desktop-login
npx tsc --noEmit
python3 scripts/verify-docs.py
```

The capability suite covers lifecycle, desktop/credential recovery, maintenance, monitor authorization, telemetry and HTTP/adaptive-quota behavior. The image transport fixture tests the exact standalone Codex request, metadata re-encoding, response bounds, malformed artifacts, denial, cancellation and single dispatch. The HTTP fixture exercises image verification, ordinary-key probe denial and delivery without a chat-model dependency. These use local fixtures, never production tokens. Enrollment tests cover retired entrypoints, validation and isolation. Explicit enrollment also needs desktop-session and exact-Origin checks, unknown-field rejection, expected-link fencing, stopped/missing workspace denial, repeated requests, wrong-desktop/account rejection and preservation of revoked or unconfirmed authority. Automatic sync must never enroll an unknown account or independently renew its provider session. Public-boundary tests inspect adversarial bodies, headers, errors and artifacts. Guest tests exercise CLI/source handling without a real account sign-in.

## Legacy controller recovery drills

```sh
npm run test:relay:guardian
npm run test:relay:launcher
node --import tsx --test scripts/test-relay-launcher-worker-recovery.ts
node --import tsx --test scripts/test-relay-docker-recovery.ts scripts/test-relay-admission-durability.ts
```

These use real guardian, launcher, controller, HTTP and WebSocket processes in disposable private directories. The worker drill retains one synthetic worker generation across a controller `SIGKILL`, completes an already-dispatched stream exactly once, then exercises an externally detected event-loop stall. The Docker and admission drills reproduce a TERM-ignoring CLI, immutable container-name reuse, uncertain daemon mutations, durable pending receipts and unavailable receipt storage. Preserve the emitted timing JSON and any retained failure directory when a run fails; do not delete a guard or journal to make a test pass.

Federation workers use Docker restart policy `no`; the lifecycle controller is their sole restart authority. Unexpected exits or inventory disappearance are retried with backoff, capped at five attempts in ten minutes, and then surface `worker_restart_budget_exhausted` for operator action. Provider capability loss remains a readiness signal and does not trigger worker or controller restart.

## Legacy storage and real containers

```sh
node --import tsx --test scripts/test-shard-enrollment-storage.ts
npm run test:relay:docker
node --import tsx scripts/test-relay-lifecycle-docker.ts
```

The storage harness starts disposable PostgreSQL with local `initdb`/`pg_ctl` and verifies that generic SQL/Data API saves cannot enroll, plus targeted fixture quarantine. Its Data API rejection test asserts that no HTTP request occurs. It does not replay the complete production schema; `npm run test:relay:manual-db` supplies migration replay, role/trigger/function denial, provenance constraints, bound renewal and rollback/reapply coverage in a separate disposable database. The broad `npm run db:test` creates its own disposable Docker database and rejects production connection overrides; see [test isolation](RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests).

Docker canaries use synthetic inventories/credentials. The federation canary removes containers but retains checkpoint volumes under its existing driver behavior. The lifecycle canary removes its containers and checkpoint volumes. Desktop previews use a scoped test manifest for retryable cleanup. Never expand cleanup to normal production workspaces.

The isolated lifecycle canary was run on 2026-09-14 against the local Docker daemon with the candidate image `galxai-relay:act019-d228-clean-20260914` and unique disposable namespaces. It passed worker restart/rejection retention, removed the rejected worker, adopted the surviving worker after controller recreation, fenced stale health, and prevented allocation for a cold rejected credential. The same clean image was then deployed through the existing launchd → launcher → guardian → controller chain with a preserved production state volume and effective worker restart policy `no`; the measured deployment canaries and current limitation are in the [ACT-019 acceptance record](../../post-mortem/incidents/2026/2026-09-13-image-generation/act019-deployment-acceptance-20260914.json). Host reboot, Docker-daemon restart, delayed startup, full/read-only retained storage and deployed retained-state restoration remain open under [ACT-018 evidence](../../post-mortem/incidents/2026/2026-09-13-image-generation/act018-isolated-drills-20260914.json).

## Build and browser checks

Run `npm run build` and relevant source lint. For changed guest/worker code, build the corresponding image and test that candidate explicitly. A successful build does not replace a running container.

Exercise session issuance, origin/host restrictions, ordinary-key denial, anonymous asset/data denial, read-only monitor isolation, renewal/revocation, link/generation races and display backpressure. Exercise actual guest input when changing its transport. Inspect native accessibility and layout at desktop and phone widths.

Scan rendered public pages and browser assets for selected private markers and inspect raw public HTTP responses/artifacts before claiming a clean public boundary. Public documentation source is [content.ts](../../src/lib/docs/content.ts); private repository docs must not be bundled there.

## Acceptance limits

Fixtures do not prove provider approval, current upstream compatibility, physical phone input, guest semantic accessibility or paid application completion. The controller drills also do not prove a host reboot or Docker-daemon restart contract. Real inference can incur usage and needs its own bounded verification. Record exact deployments separately from local tests; see [the session record](RELAY_SESSION_VERIFICATION_20260909.md) and [the controller recovery evidence](../../post-mortem/incidents/2026/2026-09-13-image-generation/controller-recovery-verification-20260914.json).

## Historical Sites fixed-price boundary

Run `npm run test:sites` and `npm run test:sites:db` for original fixed/metered operation recovery, plus the application/companion type checks and packaged worker verification in [Sites operations](SITES_FAIR_USAGE.md#verification-and-rollout). Test missing usage with confirmed completion, unknown completion, duplicate settlement, changed tariffs, account isolation, concurrent daily admission, pause/recovery, old-worker rejection and restart with retained receipts.

Fixed-mode tests do not need actual supplier quota figures or an enforced supplier token ceiling. They must not fabricate completion, usage or deployment evidence. The [September 11 record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/opaque-provider-verification.json) dates the completed local checks.

New included Sites generation, conversations and managed publication use the checks in [Sites operations](SITES_OPERATIONS.md) and [fair usage](SITES_FAIR_USAGE.md). Historical billing checks alone do not verify the active product path.
