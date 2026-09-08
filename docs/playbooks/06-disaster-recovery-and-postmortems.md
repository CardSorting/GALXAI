# Recovery and postmortems

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Recover under the authority that owns the failed state. Preserve controller signing material and worker checkpoint volumes, but do not treat either as a durable exactly-once execution log.

For topology rollback, pause admissions, drain and stop the active workers, confirm credentials are no longer in use, and restore the saved image/ingress. Never run legacy and vNext workers for the same shard simultaneously. Verify the actual client after restoration.

Record impact by model, timeline, revisions, execution uncertainty, root cause, recovery evidence, and a bounded regression that would detect recurrence. Database restoration, application assets, and financial settlement require their own runbooks.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
