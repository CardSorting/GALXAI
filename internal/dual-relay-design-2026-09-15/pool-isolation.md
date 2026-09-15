# Relay pool isolation

<!-- docs-scope: research-reference -->

The implemented [account contract](../../docs/reference/relay-account-management.md) keeps all account management and existing account leases in `mazhcjisettrzbqhorvp`. Premium and Standard have separate execution-only projects, local Colima VMs/kernels, Docker daemons, disks, runtime/monitor containers, desktop homes and secrets. Central HTTPS runs on Docker Desktop outside both pools.

Persistent nftables rules deny direct peer and Mac-forwarded peer access. Neither VM mounts Mac directories or receives peer/main-project credentials. Runtime engines are in-process and have no Docker socket; each monitor has only its own VM daemon authority for sign-in desktops. No cross-pool discovery, account transfer, borrowing or dispatch fallback is supported, including text.

Shared physical Mac/administrator, central account authority and organization administration remain trusted common dependencies. This is local VM isolation, not physical-host independence or autonomy from central management. [Service acceptance](../../docs/runbooks/relay-pool-services.md) owns exact checks and limitations; [current state](../../post-mortem/CURRENT_STATE.md) owns dated observations.

Earlier [logical pools](history/logical-pools-2026-09-15.md), [autonomous registries](history/autonomous-registries-2026-09-15.md), [SQL proof](schema-proof/README.md) and [same-daemon network proof](isolation-proof/README.md) remain historical research. They do not establish the installed contract or substitute for actual local acceptance. See [delivery status](delivery-plan.md) for remaining manual sign-ins, capability qualification and public application cutover.
