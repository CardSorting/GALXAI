# Traffic and model-specific scaling

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Inspect eligible shard count per model, capability freshness, streams, and local capacity. Scale the scarce requested capability, not just total worker count. Heterogeneous capabilities are expected; do not force every shard to expose every model.

Preserve model-first selection, generation-scoped reservations, bounded polling, and separate worker control traffic. Empty capability workers remain for rediscovery. Invalid worker drain must not block healthy pools.

Measure queue/admission delay and completion latency with workload and revision. Synthetic scheduler results are not a production throughput claim. Add multi-host ownership authority before horizontal controller deployment.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
