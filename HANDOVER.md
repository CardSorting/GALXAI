# Engineering handover

Updated 2026-09-07. Use [architecture](docs/ARCHITECTURE.md) and [ADR 0122](docs/adr/0122-isolated-authenticated-relay-and-bounded-recovery.md) as the current relay baseline. Earlier simulation and sibling-repository descriptions are not deployment instructions.

## Product and strategy

GALXAI provides inference routing and an API-oriented product surface. Agent applications can use inference and tool-call output in their own runtimes. Public input must not grant tools authority over the operator's device. The standalone relay has no local model-tool executor, while the wider application/SDK has separate execution and direct-provider paths that need their own boundaries.

## Deployed relay

`galxai-relay` runs from this repository's Docker image on host loopback port 3001. The container is non-root and read-only, drops capabilities, prohibits privilege escalation, and has no host source/home/personal credential mounts. Private Docker checkpoint persistence is the only persistent writable mount. Host credential discovery is disabled.

Separate inference and administrator keys were provisioned in ignored, mode-0600 `.env.local`. `VM_RELAY_API_KEY` is the app-side inference key. `RELAY_ADMIN_API_KEYS` is for operator data and fleet controls. Do not copy their values into this handover. Application processes must load the updated adapter and environment; the relay rollout did not deploy a remote app, and no local app server was running on port 3000.

PostgreSQL remains the registry authority. The standalone relay's concurrency, retry budget, and upstream-rejection checkpoint are process-local. The three-hour usage window has no default local call cap. Credentials are excluded by expiry or upstream rejection independently of transport/quota recovery.

## Verified and incomplete

Canary and post-cutover chat/SSE, authentication, registry loading, expired-account exclusion, runtime isolation, Docker checks, client credential separation, and TypeScript passed during the rollout. Read current health/eligibility rather than relying on historical counts.

Remaining work includes cross-replica coordination, scoped registry access, network egress enforcement, remote ingress/app verification, and complete tool-protocol coverage. Do not claim exactly-once generation, automatic refunds, guaranteed seamless failover, or crash-resumable streams. Readiness is admission health, not provider authentication.

## Operations

- [Deployment, checkpoint migration, and rollback](docs/VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [Relay API and key ownership](docs/RELAY_API_REFERENCE.md)
- [Security boundary](docs/relay-security.md)
- [Fleet operations](docs/maintainers/RELAY_QUOTA_AND_FLEET.md)
- [Telemetry](docs/maintainers/RELAY_TELEMETRY.md)
- [Verification](docs/INFERENCE_PIPELINE_VERIFICATION.md)

The prior image is tagged `galxai-relay:rollback-pre-isolation` on the deployment host. The original host checkpoint directory was not deleted. Preserve state, drain before changes, and never run two active instances against one writable checkpoint volume. Rollback restores the earlier image's earlier security semantics.
