# Traffic and model-specific scaling

<!-- docs-scope: current-guide -->

Private procedure under [the federation contract](../FEDERATION_STRATEGY.md) and [manual desktop authority](../adr/0152-manual-desktop-only-shard-authority.md).

Inspect requested-model eligibility, evidence freshness, active streams, queue depth, holds and local capacity. Retained records and running desktops are not serving capacity. Heterogeneous model support is expected; adding an unrelated account may not help the unavailable capability.

Add accounts only through manual **Relay Desktops → Sign in → Enroll shard**. Confirm eligible legacy accounts explicitly. External APIs, CLI imports, token files and host caches cannot populate the managed fleet. Each account retains its unique owning desktop for future manual sign-in; a local relink does not transfer that ownership.

Preserve model-first admission, generation-scoped reservations, bounded polling and separate worker control traffic. Automatic reconciliation can allocate a confirmed eligible account after inventory preflight, but it cannot renew an expired provider session. Saved-file sync only verifies and persists a manually completed login.

Empty capability workers remain for rediscovery. Unheld invalid-worker drain must not block healthy pools. Holds retain an existing worker while blocking new work and replacements; registry revocation, expiry, removal and rotation still win. After repair, explicitly review/resume the hold and verify the new applied revision. Do not clear counters or replay unknown requests to measure capacity.

Measure admission delay and completed-result latency against the observed workload and source revision. Synthetic scheduling results are not production throughput guarantees. Multi-host control requires its own ownership/fencing design before horizontal deployment.

Use [enrollment/recovery](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [the operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery](../RELAY_API_REFERENCE.md#request-recovery) and [current state](../../post-mortem/CURRENT_STATE.md).
