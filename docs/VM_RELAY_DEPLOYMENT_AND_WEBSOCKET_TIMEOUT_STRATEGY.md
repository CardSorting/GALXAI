# Relay deployment and transport recovery

<!-- docs-scope: current-guide -->

Private navigation guide. [Current state](../post-mortem/CURRENT_STATE.md) owns deployment evidence; [service installation](runbooks/relay-pool-services.md) owns the complete installation and acceptance procedure.

## Current installation

Premium and Standard run locally in separate Colima Linux VMs with separate Docker daemons, disks, runtimes, monitors and credentials. Central authorization and its HTTPS proxy run on Docker Desktop. The Mac and its administrator remain shared trusted infrastructure. Persistent peer-denial rules cover direct and Mac-forwarded paths; separate Compose networks alone do not establish this boundary.

Only project `mazhcjisettrzbqhorvp` manages accounts, encrypted credentials, assignments, registration, lifecycle operations and account leases. Premium and Standard projects contain execution identity/reservations/outcomes only. Each runtime runs an in-process engine per eligible account inside its own runtime container. Monitors create manual sign-in desktops using only their own VM's Docker daemon.

Open **GALX Monitors → Open Premium / Open Standard**, or use `npm run relay:local -- open premium` and `npm run relay:local -- open standard`. The launcher verifies the installed boundary and obtains a scoped one-use browser ticket. See [account management](reference/relay-account-management.md) for registration, health, rename, removal and renewal.

## Release and activation

The local installation and management release are installed and tested. Latest dated acceptance records registration open, execution closed and no registered accounts. Manual paid/free sign-ins, provider qualification, execution activation and public application cutover remain pending. SSH targets and an externally hosted central origin are prerequisites only for a separately selected external installation.

Use the reviewed component images, preserve private state, rerun local acceptance and follow the explicit gates in the service runbook. A successful image build or monitor response does not prove provider capability. Standard always rejects Sites/images/tool aliases before provider I/O; text failures never borrow the other pool.

## Transport recovery

Use [request recovery](RELAY_API_REFERENCE.md#request-recovery). Execution identity is persisted before provider work. A restart marks incomplete old work unknown; it cannot be redispatched. Central grant renewal failure stops upstream work. Retained rows do not guarantee artifact retrieval after an engine is removed or its epoch changes. Increasing timeouts cannot repair authority, capability or uncertain execution.

## Retained deployments

The existing public application still retains the single-controller federation path. Its one-container-per-account lifecycle, maintenance holds and original signed receipt recovery remain documented in [legacy operations](maintainers/legacy-federation-operations.md) and [legacy API](reference/legacy-federation-api.md). Assigned accounts are excluded from its writers and leases. The earlier shared `docker-compose.relay.yml` layout is not a launcher for either replacement. Do not run an account under two execution owners or move accepted work between deployments.
