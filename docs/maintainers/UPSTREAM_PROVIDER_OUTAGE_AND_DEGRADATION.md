# Upstream outage response

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Determine whether the failure affects a model, credential, worker, controller, or provider. A generic `route`, 403/404, timeout, or 5xx is not authoritative proof of model denial. Throttling requires backoff, not forced credential destruction.

Inspect eligible pools and fresh evidence. Keep healthy pools serving while invalid workers drain. Do not route to a different model merely because it has spare capacity. A successful old request cannot clear a newer denial or cooldown.

Reconcile accepted or uncertain operations before resubmission. Use original signed job URLs for transport recovery. Restore access through fresh discovery or an authorized credential revision, and verify the actual affected client before closing the incident.

See the [federation contract](../FEDERATION_STRATEGY.md), [runbook](../RELAY_VNEXT_RUNBOOK.md), [API recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [observability guide](../TELEMETRY_AND_OBSERVABILITY.md).
