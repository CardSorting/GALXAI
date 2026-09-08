# Relay access and containment

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The current [security guide](SECURITY.md) defines controller, worker, application, and tool-execution trust boundaries. The [API reference](RELAY_API_REFERENCE.md) defines route authentication and job ownership.

One active shard has one isolated worker. Only the host controller receives registry/vault and Docker authority; workers receive a single provider credential and scoped internal keys. Inference access does not grant administration, and task correlation does not grant tenant identity.

Use the administrator capability view for operational diagnosis. Worker metrics and probe routes remain private and are not implicitly forwarded by the controller. Image probes perform real upstream work. Never expose server credentials through browser bundles or URLs.

Preserve generation fences, signed-job affinity, and receipt scope during recovery. A checkpoint, model response, or stale health snapshot cannot grant replay or local tool execution authority. Follow the [runbook](RELAY_VNEXT_RUNBOOK.md) for supervised deployment and rollback.
