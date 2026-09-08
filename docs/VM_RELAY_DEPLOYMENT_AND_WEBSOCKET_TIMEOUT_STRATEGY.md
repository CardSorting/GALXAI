# Relay deployment: vNext migration and legacy reference

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The active deployment guide is the [capability-aware federation runbook](RELAY_VNEXT_RUNBOOK.md). This retained URL replaces the historical shared-container instructions so existing bookmarks lead to the current procedure.

The deployment is a supervised host controller plus one isolated worker per active shard. Capability discovery gates routing. Enabling the documented Codex image-tool alias requires explicit worker configuration and successful image verification.

## Legacy boundary

`docker-compose.relay.yml` and the retained `galxai-relay` container describe the former shared deployment. They are not the vNext fleet launcher. Rebuilding that layout with the current worker will fail the one-shard guard.

Before any migration or rollback, pause new admissions, drain the active topology, and confirm the same credentials cannot execute in both topologies. Preserve checkpoint volumes and signing state. A checkpoint is not permission to replay unfinished inference.

[ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md) preserves the earlier containment decision. [ADR 0126](adr/0126-capability-aware-shard-relay-federation.md) replaces its shared lifecycle, and [ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md) records production cutover and saved rollback evidence.

For transport failures use the [request recovery table](RELAY_API_REFERENCE.md#request-recovery), not a larger timeout or blind retry. The [resilience guide](RESILIENCE_AND_DISASTER_RECOVERY.md) distinguishes lost acknowledgements, stream interruption, capability loss, and worker replacement.
