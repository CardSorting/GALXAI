# Federation fleet and quota

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Inspect `/api/capabilities` with the controller administrator credential. Review model eligible counts before total fleet load. A model with one shard is fragile even if other model pools are idle.

Credential registry state and Docker ownership determine worker lifecycle. Capability loss changes the index without restart; empty workers remain for recovery. Invalid credentials retire and remain suppressed until their credential revision changes. Do not manually clear cooldowns or delete registry rows to force readiness.

Provider backoff, local concurrency, database lease health, and product entitlements are separate signals. Preserve attributable evidence and deadlines. Alias verification consumes image quota and uses spare capacity; chat inventory alone cannot grant image access.

Use the vNext controller to reconcile the fleet. Legacy shared-container CLI operations do not manage this topology. Multi-host scaling needs shared ownership leasing before introducing another controller.

See the [federation contract](../FEDERATION_STRATEGY.md), [runbook](../RELAY_VNEXT_RUNBOOK.md), [API recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [observability guide](../TELEMETRY_AND_OBSERVABILITY.md).
