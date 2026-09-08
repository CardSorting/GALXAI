# Federation request telemetry

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Use the controller capability view for topology and private worker telemetry for execution traces. `/metrics` and worker telemetry routes are not implicitly exposed by the controller.

Correlate request/task IDs, requested model, execution metadata, worker generation, admission outcome, and status URLs. Separate accepted work from completed work and uncertain execution. Chunk counts are not token counts; concurrent task durations are not additive wall time.

Observe model pool redundancy and evidence expiry separately from process liveness. Keep snapshots visibly stale when disconnected. Telemetry cannot change authoritative account health and must not expose provider credentials or prompt content.

See the [federation contract](../FEDERATION_STRATEGY.md), [runbook](../RELAY_VNEXT_RUNBOOK.md), [API recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [observability guide](../TELEMETRY_AND_OBSERVABILITY.md).
