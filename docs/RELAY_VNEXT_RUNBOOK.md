# Capability-aware relay vNext

<!-- docs-scope: current-guide -->
> Private operating guide. Follow the [federation contract](FEDERATION_STRATEGY.md), [desktop guide](maintainers/RELAY_DESKTOPS.md) and [enrollment guide](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md). Dated results belong in the [verification record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md).

## Validate the implementation

Run the [hardening checks](maintainers/RELAY_HARDENING.md) appropriate to the change. Synthetic tests do not authenticate a real account, certify production capacity or authorize paid probes.

The broad `npm run db:test` suite creates its own disposable Docker database and rejects production connection overrides before repository initialization. See [test isolation](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests).

## Start the host controller

Provision the encrypted registry, vault keys and separate inference/admin keys privately. Enroll intended accounts explicitly. Bulk import and host-login discovery are retired.

```sh
npm run relay:federation
```

The launcher defaults to namespace `vnext-canary`, loopback port 3301 and image `galxai-relay:vnext`. These defaults do not isolate registry credentials: never start a second controller against credentials already owned by production. Use synthetic fixtures for a disposable canary.

The controller persists its signing secret, kernel-held ownership guard, compatibility marker, rejection revisions, maintenance holds, desktop journal, Docker mutation journal, admission receipt journal and egress state beneath `.relay/federation-<namespace>/`. Preserve this private directory across restarts. The launcher delegates one authority to [the local guardian](../scripts/relay-controller-supervisor.py), which uses an OS-managed `flock`, inherits the guard into the controller and Docker subprocesses, and lets launchd perform the only controller restart. A crash is recovered after the old process group is proven gone; a paused, ambiguous or legacy owner fails closed with a bounded private alert. Use [guarded lock recovery](../post-mortem/runbooks/controller-lock.md) for a one-time old-marker migration. Never delete `controller.guard`, force-unlock, or run the old and new launchers together.

Use `npm run relay:open` and `npm run relay:desktops` on the host. The launcher delegates an authorized session; do not enter the admin key into a browser. `/health` is liveness only. `/health/ready`, `/api/capabilities` and controller `/api/telemetry` require admin authorization.

## Configuration and bounds

| Setting/bound | Default or behavior |
| --- | --- |
| `RELAY_FEDERATION_NAMESPACE` | `vnext-canary`; production uses an explicit namespace |
| `RELAY_FEDERATION_PORT` | 3301, loopback |
| `RELAY_FEDERATION_IMAGE` | `galxai-relay:vnext` |
| `RELAY_DESKTOP_IMAGE` | `galxai-relay-desktop:v1` |
| `RELAY_CODEX_IMAGE_TOOL_ALIAS` | Enabled only by explicit `true` |
| Capability refresh / TTL | 60 seconds with 80–100% jitter / 120 seconds |
| Cold-start inventory deadline | 10 seconds, before Docker allocation |
| Worker shard concurrency | 4 by default |
| Request body / image frame | 2 MiB / 32 MiB |
| Reconciliation starts and retirements | Bounded to three concurrent operations |
| Federation worker restart authority | Controller only; Docker workers use `--restart no`, five attempts per ten minutes, then an operator alert |
| Guardian ownership wait / heartbeat / startup-reconcile progress | 5 seconds / 15 seconds / 300 seconds by default; set explicit environment budgets for a deployment with slower measured startup |
| Guardian shutdown / termination verification | 180 seconds graceful shutdown / 5 seconds after escalation before `termination_unproven` retains the guard |

Host environment settings are not all automatically propagated into workers. Inspect [driver configuration](../src/relay/docker-shard-driver.ts) and effective capability snapshots before tuning. An image build or config edit does not update a running container.

Empty capability state retains a worker for recovery. A rejected credential revision suppresses repeated cold starts. Transient failures back off. A maintenance hold blocks new work and replacement starts while retaining an existing worker; authority removal, revocation, expiry or rotation can still retire it.

## Image verification

Inventory does not prove tool support. Internal image-operation keys use `image:<model>`; callers send the model ID without that prefix. Chat and image eligibility are independent.

An administrator can intentionally POST `/api/capabilities/probe-image` on the assigned worker with an exact model and small prompt. This performs real upstream generation and can incur usage. Publication requires valid image output and current observation fences. Enabled compatibility workers also have the bounded paid cadence below.

For actual-client verification, configure the intended DreamBees checkout and its server environment:

```sh
DREAMBEES_ROOT=/path/to/DreamBees-Rooms \
DREAMBEES_IMAGE_OUTPUT=/tmp/dreambees-verified.png \
node --env-file=/path/to/DreamBees-Rooms/.env.local --import tsx scripts/verify-dreambees-image.ts
```

This invokes the real client. Validate bytes, decode and visually inspect the artifact; test public metadata removal and response allowlists separately. Keep output and operational evidence private. Successful delivery does not verify application asset persistence or a paid-entry transaction.

## Production cutover checklist

The shared-to-federation cutover was performed on September 7; it is not a pending setup step. For an existing federation deployment:

1. Record source revision, configured images, running image IDs, ingress, holds and current workload.
2. Validate the candidate and retain known-good rollback images and private state.
3. Review existing holds. Apply a hold when an existing worker must survive controller reload; verify it before stopping the controller.
4. Stop admissions and allow accepted work to settle. Graceful stop drains/removes unheld workers; held workers can be adopted after restart.
5. Start one supervised controller for the namespace. Verify registry authority, ownership/generations, capabilities, desktop links and restored holds.
6. Replace workers or desktop containers deliberately when their image/configuration must change; a controller restart alone does not upgrade them.
7. Verify the affected downstream behavior, then explicitly resume appropriate holds. Resume does not clear rejection or cooldown.

For a first migration from a shared relay, drain and stop that process before assigning its credentials to workers. `docker-compose.relay.yml` is a legacy shared launcher and cannot substitute for the federation launcher.

Rollback uses the saved compatible source/image/configuration and private state after stopping competing ownership. Inspect current holds and accepted work first. Do not blindly restart a historical shared container, clear rejection journals or run two topologies with the same credentials. Billing and entitlement changes remain separate from deployment.

## Sites generation rollout and recovery

[Sites operations](maintainers/SITES_OPERATIONS.md) owns current included generation, paid eligibility, shared fair admission, fresh local-profile checks and retained receipt recovery. Original fixed/metered operations keep their historical settlement contract only. Opaque supplier quota is accepted in this mode; no supplier ceiling assertion is required. Build and replace compatible workers before enabling application admissions. The forwarding option remains relevant to explicitly selected legacy metered jobs.

Preserve signing state and receipt volumes. The durable text receipt endpoint can survive worker replacement; stream and cancellation still target the admitting generation. Pause new content work before incompatible rollback, and retain application code capable of settling previously accepted fixed holds.

## Parent and subagent request contract

Use one idempotency key per logical operation and preserve payload, principal and returned scope. Save signed job URLs after acceptance; poll, stream or cancel that job instead of submitting new inference. `X-Galx-Task-Id` correlates parent/child work without granting authority.

The [API recovery table](RELAY_API_REFERENCE.md#request-recovery) governs conflicts, uncertain admission and generation loss. Admission identity tombstones retain ten minutes of completed records across controller restart, with 1,000 keys; response bodies remain process-local within the 32 MiB aggregate and 8 MiB per-response cache. They are not durable exactly-once execution. Image synthesis is not automatically replayed after an uncertain outcome.

## Recovery supervision and failure isolation

The guardian emits private, redacted events for `authority_established`, `event_loop_stalled`, `controller_progress_stalled`, `ownership_wait_exceeded`, `restart_budget_exhausted`, `termination_unproven` and missing required capabilities. Process liveness, controller progress and capability readiness are separate signals. A provider outage or an empty capability snapshot is a readiness failure and does not by itself restart the controller. The guardian applies a five-attempt ten-minute restart budget and bounded termination escalation; inspect the blocked stage before raising a budget or restarting manually.

Every federation worker Docker CLI has a bounded deadline and returns only after the child and its pipes close. A timeout or output overflow terminates the subprocess; if cleanup cannot be proven, the controller reports `command_cleanup_unproven` and the guardian retains ownership while containing the process group. Docker-daemon mutations are recorded before `run`, `stop` or `rm`; a pending entry blocks conflicting work until a later inventory read proves the safe outcome. Generation and immutable container-ID checks prevent delayed commands from affecting a replacement worker.

Federation worker containers are created with Docker restart policy `no`; the lifecycle controller owns stop, removal and replacement. Unexpected stopped or missing workers use exponential backoff and a five-attempt ten-minute budget. `worker_restart_budget_exhausted` is a bounded outage requiring private worker and dependency inspection; it does not silently turn into an endless restart loop. Desktop containers are a separate resource with their own desktop-manager policy.

Admission receipts persist only a hash, expiry and state. A pending receipt becomes `unknown` after controller loss and never authorizes replay; completed response bodies remain process-local. If receipt storage is missing, malformed, read-only or full, new admissions fail closed with `admission_storage_unavailable`. A retained worker is adopted after controller restart before any replacement is considered. The [recovery evidence](../post-mortem/incidents/2026/2026-09-13-image-generation/controller-recovery-verification-20260914.json) records the actual launcher and worker lifecycle drills.

## Throughput and failure isolation

Job polling uses bounded batches, per-worker fairness and per-job backoff. Job recovery has a separate rate bucket from new inference. Reservations from stale generations do not consume replacement capacity. Docker inventory reads, telemetry bodies, starts and drains have bounds so one failed worker does not block the entire fleet.

Shutdown rejects new admissions and bounds accepted front-door I/O. Maintenance holds deliberately change worker retirement behavior. Observation fencing prevents stale success, inventory or health replay from clearing a newer denial. These tests establish correctness and bounded scheduling, not a production throughput SLA.

## Explicit Codex image-tool compatibility alias

The canonical customer capability is `openai-gpt-image-latest`; legacy aliases are compatibility names for it. Internally, enabled OAuth workers execute `gpt-image-2` through `gpt-5.6-terra` with `image_generation`. The provider selects the image model. Native API-key execution remains exact.

Fresh inventory and successful image evidence are required. Evidence expires after one hour; real success renews it. Idle enabled workers perform a paid startup probe and successful renewal no more often than every 50 minutes, with failed probes backing off 10, 20, then 40 minutes. Use spare capacity. See [the full contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

Execution identifiers and diagnostics remain in internal transport and administrator records. Public gateway responses must strip them from bodies and headers and sanitize image artifacts.

## Supervised macOS deployment

`node --import tsx scripts/install-federation-service.ts` prepares and validates a launchd plist in the ignored state directory. Its explicit `--install` option installs the service; it refuses to overwrite an existing installed plist. The plist reads server configuration from the repository environment without embedding credentials.

The installer preflights Python `fcntl`/`selectors` support and configures launchd to retry only unsuccessful exits. A healthy intentional stop does not create a restart loop. The guardian itself never retries a child, and its restart budget emits a bounded alert when repeated failures exhaust the window. Keep `controller.guard`, the compatibility marker and all journals in the same private local filesystem; a network or unsupported filesystem fails closed.

The September 9 deployment used `com.galxai.federation.production`, namespace `production`, loopback port 3001 and worker image tag `galxai-relay:image-frame-fix`. These are dated deployment observations; inspect the active supervisor before changing it.

## Guardian rollout and rollback

Treat the ownership change as a staged deployment. First run the guardian, actual-launcher and retained-worker drills in a disposable namespace, then prepare the launchd plist without installing it. For an existing namespace, stop admissions, record the private state and worker generations, stop the old job, and verify its controller and descendants have ended, the listener is unowned and the legacy `controller.lock` contents are unchanged. Archive that exact legacy marker in private evidence only after the final recheck; never run old and new launchers together.

Start the new job with the same namespace and state directory. Confirm `authority_established`, a stable listener, registry freshness, required capability readiness, unchanged worker generations and one real test request before widening traffic. Keep the old plist, compatible controller build, private state backup and worker images available until that acceptance completes. If the new job fails, stop it and prove its process group and inherited descriptors are gone before archiving its marker; restore the prior plist/build and let the old launcher create its own marker. Do not force-unlock or delete a guard. A rollback that cannot prove exclusive ownership is a bounded outage requiring operator intervention.

The current evidence covers the disposable stages only. No production plist, marker migration or disruptive rollback was applied during this recovery work.

## September 8 image-frame repair

A real client image larger than the former frame limit succeeded after the separate 32 MiB response-frame repair. The exact request, artifact digest and component deployment evidence are retained in [the session verification record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md#september-8-image-frame-evidence).

## Image resilience follow-up

[ADR 0130](adr/0130-image-receipts-and-uncertain-outcomes.md) defines single-dispatch images and uncertain-result recovery. The September 9 controller reload and worker-image build do not prove deployment of every application or DreamBees change, nor replacement of a retained worker. Check the dated component matrix before claiming rollout.
