# Premium and Standard relay implementation

<!-- docs-scope: research-reference -->

Private research and delivery index. The current implementation is fully described in [account management](../../docs/reference/relay-account-management.md), [service installation](../../docs/runbooks/relay-pool-services.md) and [architecture](../../docs/ARCHITECTURE.md). [Current state](../../post-mortem/CURRENT_STATE.md) owns dated delivery/acceptance; [ADR 0153](../../docs/adr/0153-central-account-authority-isolated-relays.md) keeps its decision status separate.

## Current implementation

Accounts, encrypted credentials, manual registration, exclusive assignments, lifecycle history and account leases live only in `mazhcjisettrzbqhorvp`. Premium paid accounts handle text/Sites/images; Standard free accounts handle text only. The two execution projects contain identity/reservations/outcomes only. Each pool has its own local VM, Docker daemon, disk, runtime, fixed monitor, desktops and secrets. Central HTTPS runs on Docker Desktop; the Mac/admin remains shared trusted infrastructure. No peer query, borrowing or failover is supported.

Open **GALX Monitors → Open Premium / Open Standard**. The monitors provide Accounts, Registration and Activity, health filtering/search, rename/remove, explicit same-desktop renewal and restorable unfinished registrations. Central saved state and runtime acknowledgment remain distinct. Removal retains files/history and permanently revokes a registered account.

The installed local checkpoint has registration open, execution closed and no registered accounts. Actual paid/free sign-ins, capability qualification, activation and public application cutover remain pending. External SSH targets are not prerequisites for this local layout.

## Navigation

- [Delivered strategy and remaining activation](delivery-plan.md)
- [Central contract entry point](central-account-control.md)
- [Implemented isolation](pool-isolation.md) and [trust limits](strict-isolation.md)
- [Initial research](initial-design-2026-09-15.md) and [foundation audit](pre-service-audit-2026-09-15.md): complete original bodies preserved in history
- [Pre-installation service checkpoint](production-audit-2026-09-15.md) and [original provisioning](provisioning-status.md): dated records
- [Prototype](prototype/README.md), [SQL proof](schema-proof/README.md), [network proof](isolation-proof/README.md): reproducible historical mechanisms, not installation procedures

## Evidence and limits

[Local installation](../../post-mortem/releases/2026-09-15-relay-local.json), [native access](../../post-mortem/releases/2026-09-15-relay-monitor-access.json), [console](../../post-mortem/releases/2026-09-15-relay-monitor-console.json) and [account management](../../post-mortem/releases/2026-09-15-relay-account-management.json) record successive observations. Later evidence supersedes earlier pending delivery items without changing what an earlier experiment proved. The prototype and same-daemon proofs do not certify production provider capability, physical-host independence or customer-path acceptance.
