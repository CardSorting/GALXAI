# ADR 0159: Local Mac relay operation with bounded availability

<!-- docs-scope: decision-record -->

Date: 2026-09-22. Status: accepted by the owner's explicit instruction to use
the existing local environment after hosted options proved unaffordable or
unworkable. Delivery: native apps installed and the user-session supervisor
enabled after 26 local acceptance checks on 2026-09-23 UTC. Sign-in, restart,
sleep/wake and duplicate-owner drills remain open. Owner: Relay operator.

## Context

The DigitalOcean deployment candidate is not provisioned, and the owner has
directed that relay operation remain on the existing Mac rather than depend on
a paid remote host. The existing isolated Premium stack already separates its
Linux VM and Docker daemon from the central service, but manual startup and
menu-only login behavior do not recover that stack after a host or daemon
restart.

## Decision

Use the owner's Mac as the operational host for the local Premium relay and
monitor. The existing central Docker Desktop service and Premium Colima VM
remain the service boundary. This decision selects local operation; it does
not establish a public route, open an execution gate, or qualify an upstream
account or model.

When the owner enables **Keep Premium online**, a per-user macOS LaunchAgent
starts at sign-in and keeps a small Node supervisor alive. The supervisor
checks central, relay and monitor health, starts Docker Desktop and the accepted
Premium VM when needed, preserves the existing identity/isolation/image checks,
and retries failed recovery with bounded exponential backoff and jitter. Local
Compose services use `unless-stopped` restart policies. The native menu shows
both relay and monitor status and keeps **Open at Login** separate from the
service supervisor setting. It also reports supervisor liveness, power and
the next bounded retry estimate. A private heartbeat distinguishes a planned
backoff from a supervisor that stopped reporting. Login preference changes
validate the expected job identity before removing any existing file.

Central services require their configured Docker health checks. The monitor
and relay also require their fixed local liveness probes. If either listener
stays unavailable after its startup wait, the supervisor restarts only that
running service; missing or stopped services are started through Compose. Relay
restart follows the authorized heartbeat handoff, a wait beyond the central
claim fence, and fresh central/runtime checks. Ambiguous container state fails
closed into bounded backoff. The supervisor does not replay account operations
or inference requests.

The service remains dependent on this Mac, its user session, power, network and
local storage. Local Compose health checks and the supervisor distinguish a
running process from the authority and TLS path responding; they do not prove
database, account or provider readiness. An unhealthy local service can be
restarted by the supervisor under bounded retries. The menu reports a fixed
recovery category, retry estimate and whether the AC idle-sleep assertion
process is active. That assertion does not provide unattended pre-login
startup, keep a closed laptop awake, override low-battery/system sleep, or
create a second failure domain. The owner should leave the Mac on power with
the lid open for the best availability. Fresh service acceptance and real
workload qualification remain separate.

This partially changes ADR 0153's operational deployment target. Its central
account authority, credential separation and own-pool execution boundaries
remain in force. Unprovisioned cloud files and scripts are retained but are no
longer the active runbook path.

## Consequences

Local recovery avoids a recurring host charge and uses familiar desktop
patterns: a menu-bar status surface, separate login/service controls, and
`launchd` restarting a user-owned supervisor. It also inherits laptop
availability limits and does not provide cloud-host uptime. Public application
traffic must not be pointed at a loopback address; any external ingress remains
a separate, already-reviewed boundary and is not changed here.

## Verification and follow-up

The native apps are installed for the owner and the per-user LaunchAgent is
loaded. Fresh local acceptance passed 27 identity, isolation, image, monitor
role and TLS checks. The September 23 [readiness hardening record](../../post-mortem/releases/2026-09-23-local-relay-readiness-hardening.json)
retains the health probes, test/build results and current local status; the
September 23 [targeted recovery audit](../../post-mortem/releases/2026-09-23-local-relay-targeted-recovery.json)
records service-scoped recovery behavior, focused tests and the live status
check. The recovery branch was not fault-injected, so ACT-018 remains open. The
[current-state record](../../post-mortem/CURRENT_STATE.md) remains the latest
host observation. The earlier [supervisor acceptance](../../post-mortem/releases/2026-09-23-local-relay-supervisor-acceptance.json)
and [menu recovery audit](../../post-mortem/releases/2026-09-23-local-relay-menu-ux-hardening.json)
preserve prior evidence rather than being rewritten.

Still required under ACT-018: sign-in recovery, Docker Desktop/Colima restart
recovery, the unhealthy-service restart branch, sleep/wake behavior and
absence of duplicate runtime ownership. Do not treat current health as proof
of those failure drills or upstream workload qualification. Leave public
application cutover and execution-gate changes to their separate acceptance
and authorization steps.

See the [local service runbook](../runbooks/relay-pool-services.md) and
[current state](../../post-mortem/CURRENT_STATE.md).
