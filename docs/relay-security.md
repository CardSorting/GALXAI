# Relay security reference

<!-- docs-scope: current-guide -->

Private navigation to [security boundaries](SECURITY.md), [manual enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md).

Only explicit enrollment from a manually created Relay Desktop can establish managed shard authority. The operator signs in inside it; the host validates the saved login and commits the unique binding. External API/CLI/file ingestion is closed. Service-role insertion and credential replacement are denied, and unconfirmed records cannot receive new leases or enter the controller's eligible projection.

Renew expired provider sessions manually in the same bound desktop. Saved-file sync only validates and persists that login with revision checks and a recoverable checkpoint. It cannot renew the provider session, enroll another account or transfer a binding. Preserve the owning home; revoked and ambiguous accounts remain blocked.

Read-only monitor sessions, desktop administrator sessions, application accounts and inference keys have separate authority. Hosts and origins are checked; token uploads are not an enrollment contract. Holds do not override expiry, revocation or changed authority. Keep private journals and uncertain receipts through recovery.

Public responses expose allowed customer fields and sanitized images. Operational topology, upstream diagnostics and credential sources remain private. Consult [current state](../post-mortem/CURRENT_STATE.md) for actual deployment and acceptance; security fixtures do not prove live provider capability.
