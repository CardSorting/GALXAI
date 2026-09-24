# Relay security reference

<!-- docs-scope: current-guide -->

Use [security boundaries](SECURITY.md), [central account management](reference/relay-account-management.md) and [manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) for the installed strategy.

Canonical accounts, credentials, assignments, management history and account leases live only in the main project. Premium has its own VM/daemon/session/execution-database boundary and cannot borrow accounts or fail over. The runtime has no central database/vault or Docker authority; the monitor has only its owning daemon authority. A common trusted physical Mac remains.

Manual provider sign-in plus central Review/Register creates a paused account. Renewal is manual sign-in and explicit save in the same registration. Operator revisions and immutable operation IDs protect changes. Removing a registered account revokes permanently; restoring an unfinished registration requires new review. History/files remain retained and failed desktop cleanup stays visible.

Ordinary customer sessions, operational viewers, operators, registrars and runtimes have separate authority. Unknown health grants no permission. Central grants expire independently when renewal fails; no uncertain generation retries automatically.

Public contracts expose capability and sanitized output only. Use [current state](../post-mortem/CURRENT_STATE.md) for delivery evidence. The retained single-controller workflows are [legacy operations](maintainers/legacy-federation-operations.md), not pool administration.
