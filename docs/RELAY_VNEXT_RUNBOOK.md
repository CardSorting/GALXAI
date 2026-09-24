# Relay operations and implementation entry point

<!-- docs-scope: current-guide -->

Private operator navigation for the implemented central authority and isolated Premium relay. Use [current state](../post-mortem/CURRENT_STATE.md) before intervention. The complete installation, gates and rollback procedure is [relay pool services](runbooks/relay-pool-services.md); the full account/health protocol is [central management](reference/relay-account-management.md).

## Validate the implementation

Run `test:relay:services`, `test:relay:authorization-db`, `node --test scripts/test-relay-monitor-model.mjs` and the synthetic monitor browser verifier for affected source changes. Database changes also require `db:verify` and `db:test` in disposable fixtures. `npm run relay:local -- verify` checks installed image pins, own-installation authorization, TLS and host isolation. It performs no provider generation. Keep build, installation and actual acceptance separate.

## Start the host controller

The new installation uses `npm run relay:local -- up`, not `relay:federation`. Central/TLS runs on Docker Desktop; Premium has its own Colima VM, runtime and monitor. Open **GALX Monitors** or use `npm run relay:local -- open premium`.

Native openers start only the requested pool and shared central dependency, verify saved identities/isolation/images and issue a scoped one-use ticket. A stopped runtime waits for the central ownership handoff interval before claiming a new epoch. Never delete identities or disable the fence to accelerate startup.

The retained single-controller service still uses its existing guardian and launchd boundary. Its complete procedure is [legacy federation operations](maintainers/legacy-federation-operations.md#start-the-host-controller). Never start it against assigned pool accounts or point it at the new service images.

## Configuration and bounds

| Component | Current configuration authority |
| --- | --- |
| Local image set | [Reviewed manifest](../docker/relay-pools/local/images.json), verified by exact image ID |
| Central | Its own private main-project/vault config and local HTTPS proxy |
| Premium runtime/monitor | Only Premium execution/principal/desktop config in its VM |
| Application integration | Server-only Premium isolated mode or independent Premium image switch |

The account contract records ownership/grant/health timing. Runtime engines execute in-process inside a fixed pool container; per-account Docker workers and `RELAY_FEDERATION_*` settings belong to the [legacy configuration](maintainers/legacy-federation-operations.md#configuration-and-bounds). Historical `staged-20260915` images are permanently closed; the service baseline and later management images have separately reviewed pins.

## Image verification

Premium handles text, Sites and image requests. Registration verifies account class and inventory; neither guarantees an image result. Availability checks are non-consuming and read actual in-process evidence. Missing or expired image evidence is unknown; chat inventory does not prove denial. Perform a separately authorized, small real image request after manual registration, activation and account enablement, then decode/inspect the sanitized artifact and verify its owned product persistence. No automatic paid probe runs in isolated execution. Keep the existing HTTP 403 incident separate from a claim that all paid accounts are qualified.

## Production cutover checklist

1. Inspect the exact central migration history, component image pins, installation identities and original-operation state.
2. Install only reviewed, destination-specific configurations and images; preserve TLS trust, homes, keys and state.
3. Verify the Premium VM boundary and monitor. Local hosting is already implemented; do not fabricate SSH evidence.
4. Manually register a paid Premium account. Save it according to the current activation policy.
5. Use the explicit `relay:services:gates -- serve-local` procedure, which reruns local acceptance and requires registrations. Enable intended accounts separately and wait for matching confirmation.
6. Qualify Premium text/Sites/images through its endpoint. Preserve unknown outcomes.
7. Point the application at reachable, authenticated service origins only in a deliberate compatible cutover. A deployed application cannot use this Mac's loopback URLs.

The external-host `serve` mode remains a separate optional procedure with actual SSH targets and private HTTPS. Local installation does not change public traffic. Use [deployment boundaries](DEPLOYMENT.md) for component acceptance and rollback.

## Sites generation rollout and recovery

Sites chooses Premium only in isolated mode. Product inclusion, fair usage and historical settlement remain in [Sites operations](maintainers/SITES_OPERATIONS.md). Keep original origin, request identity and receipt reader. No epoch/account loss permits resubmission through another deployment. Legacy retained-volume receipt behavior is documented separately and is not a new-runtime guarantee.

## Parent and subagent request contract

Preserve one idempotency key per logical operation, its payload, verified owner and original destination. Task IDs do not grant authority. Settlement retry is distinct from execution retry. Use [API recovery](RELAY_API_REFERENCE.md#request-recovery); never evade an unknown result with a new key.

## Recovery supervision and failure isolation

Central grants expire independently when renewal fails. Local startup uses saved VM identities and central epoch handoff; runtime containers use restart policy `no`. Restore the dependency and reopen through the local launcher after inspection. Preserve unresolved execution rows and leases. New pool runtimes do not use the legacy guardian, Docker mutation journal or per-worker restart budget.

For an incident in the still-running legacy controller, use [legacy recovery supervision](maintainers/legacy-federation-operations.md#recovery-supervision-and-failure-isolation) and [guarded lock recovery](../post-mortem/runbooks/controller-lock.md). Never apply legacy marker repair to Colima ownership or central epochs.

## Throughput and failure isolation

Premium has bounded local admission bookkeeping and in-process account engines; central leases govern account usage. Unknown terminal persistence blocks new admission. Local acceptance proves tested boundaries, not a throughput SLA or physical independence.

## Explicit Codex image-tool compatibility alias

The public image alias remains a capability name, with provider-managed underlying identity. Only assigned Premium execution can perform its explicit centrally granted image trial. The shared engine sanitizes bytes; public DTOs omit operational identifiers. [The contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility) defines current behavior; the legacy candidate's probe cadence is not enabled in the new runtime.

## Supervised macOS deployment

**GALX Monitors** is the native menu launcher for the new local services; `relay:monitors:install` installs its fixed apps. Open-at-login starts the menu only, and quitting it leaves services running. `relay:local -- stop` stops the local pools and central stack while retaining disks/homes/state. The legacy launchd installer remains [separately scoped](maintainers/legacy-federation-operations.md#supervised-macos-deployment).

## Guardian rollout and rollback

Guardian rollout applies only to the retained legacy federation. Follow its [complete procedure](maintainers/legacy-federation-operations.md#guardian-rollout-and-rollback) when that exact component is affected. New-service rollback closes gates, preserves central assignments and journal/history, and restores compatible reviewed image pins without reviving removed accounts.

## September 8 image-frame repair

The [dated legacy evidence](maintainers/RELAY_SESSION_VERIFICATION_20260909.md#september-8-image-frame-evidence) remains historical. It does not establish new-pool image access or current production image health.

## Image resilience follow-up

Image receipts, library persistence and public sanitation remain separate product contracts. The September 16 text qualification and subsequent Premium image qualification are separate dated observations. App routing, owned library persistence and downloads require their own release acceptance. Use [current state](../post-mortem/CURRENT_STATE.md) and the [image incident runbook](../post-mortem/runbooks/image-generation.md) rather than replaying an earlier successful request.

## Registry reservation recovery

The retained broad-registry controller has the [existing egress reservation procedure](maintainers/legacy-federation-operations.md#registry-reservation-recovery). New runtimes instead use narrow central projection/grants and their own execution database; never distribute main-project/vault authority to repair a projection failure. Central outage requires restored authorization, not local account creation or counter resets.
