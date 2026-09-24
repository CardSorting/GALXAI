# Relay deployment and transport recovery

<!-- docs-scope: current-guide -->

Private navigation guide. [Current state](../post-mortem/CURRENT_STATE.md) owns deployment evidence; [service operation](runbooks/relay-pool-services.md) owns the local installation and acceptance procedure.

## Current installation

The selected operating target is the owner's Mac: central authorization runs in Docker Desktop, and Premium runs in a dedicated Colima Linux VM with its own Docker daemon and disk. The Mac is a common trusted physical host, not a second failure domain or a hosted uptime service. On September 23, fresh local acceptance passed 26 checks and the user-session supervisor recovered the local services; sign-in, daemon/VM failure and sleep/wake drills remain open under ACT-018. Consult the [current state](../post-mortem/CURRENT_STATE.md) before acting. A Compose network alone does not establish this boundary.

Only project `mazhcjisettrzbqhorvp` manages accounts, encrypted credentials, assignments, registration, lifecycle operations and account leases. The Premium project contains execution identity/reservations/outcomes only. Its runtime runs an in-process engine per eligible account inside its own runtime container. The monitor creates manual sign-in desktops using only its VM's Docker daemon.

Open **GALX Monitors → Open Premium**, or use `npm run relay:local -- open premium`. The launcher verifies the installed boundary and obtains a scoped one-use browser ticket. See [account management](reference/relay-account-management.md) for registration, health, rename, removal and renewal.

## Release and activation

The two native apps are installed, Keep Premium online is enabled for the signed-in user, and fresh VM/service acceptance passed 26 checks. Restart and sleep/wake acceptance remains pending; the DigitalOcean candidate remains unprovisioned. This change does not reconfigure DNS, tunnel ingress, application URLs or execution gates. The application must not be pointed directly at the Mac loopback origin.

Use the reviewed component images, preserve private state, and run local acceptance before changing execution or ingress state. A successful image build, menu status or liveness response does not prove provider capability or continuous availability. The Premium runtime enforces workload boundaries before provider I/O; failures never borrow another deployment.

## Transport recovery

Use [request recovery](RELAY_API_REFERENCE.md#request-recovery). Execution identity is persisted before provider work. A restart marks incomplete old work unknown; it cannot be redispatched. Central grant renewal failure stops upstream work. Retained rows do not guarantee artifact retrieval after an engine is removed or its epoch changes. Increasing timeouts cannot repair authority, capability or uncertain execution.

## Retained deployments

The existing public application still retains the single-controller federation path. Its one-container-per-account lifecycle, maintenance holds and original signed receipt recovery remain documented in [legacy operations](maintainers/legacy-federation-operations.md) and [legacy API](reference/legacy-federation-api.md). Assigned accounts are excluded from its writers and leases. The earlier shared `docker-compose.relay.yml` layout is not a launcher for the Premium service. Do not run an account under two execution owners or move accepted work between deployments.
