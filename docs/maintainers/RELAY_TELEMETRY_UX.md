# Capability and recovery UX

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Lead with the requested model, eligible shard count, and available next action. Show zero as unavailable, one as fragile, and multiple as redundant capacity. Allow shard/relay drill-down with separate health, capability freshness, streams, and capacity.

Distinguish pending admission, accepted execution, completed output, and uncertain execution. Do not invite another generation to recover lost bytes or a lost acknowledgement. Show the original job URL or request ID when available and honor retry guidance.

Disclose the Codex image compatibility execution and provider-managed selection. Avoid exact-model or dimension promises on that route. Label stale snapshots and clear privileged data on disconnect. Keep administrator keys in page memory and stop automatic authorization retries.

See the [federation contract](../FEDERATION_STRATEGY.md), [runbook](../RELAY_VNEXT_RUNBOOK.md), [API recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [observability guide](../TELEMETRY_AND_OBSERVABILITY.md).
