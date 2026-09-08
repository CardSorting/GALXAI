# Federation hardening checks

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Verify one active shard per worker and no worker database/vault/socket/home mounts. Require fresh authenticated capabilities before routing and validate model-specific overload behavior.

Cover noisy failures, authoritative denials, concurrent inventory refresh, equal health revisions, old generation health, cooldown recovery, accepted streams after capability loss, and empty capability recovery without restart. Cover signed job tenant affinity, uncertain acknowledgement, receipt scope change, and replay after capability removal.

Run `npm run test:relay:capabilities`, `npm run test:cooldown`, type checking, and relevant build checks for runtime changes. Run the isolated Docker canary for lifecycle changes. Record actual output and environment; do not copy historic assertion counts as a gate.

Inspect bounded body reads, receipt storage, polling fairness, independent control buckets, startup/drain concurrency, and shutdown deadlines. A synthetic throughput fixture does not establish production capacity. Documentation-only changes use the documentation validator.

See the [federation contract](../FEDERATION_STRATEGY.md), [runbook](../RELAY_VNEXT_RUNBOOK.md), [API recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [observability guide](../TELEMETRY_AND_OBSERVABILITY.md).
