# Relay deployment: vNext migration and legacy reference

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The active deployment guide is the [capability-aware federation runbook](RELAY_VNEXT_RUNBOOK.md). This retained URL replaces the historical shared-container instructions so existing bookmarks lead to the current procedure.

The deployment is a supervised host controller plus at most one isolated worker per eligible shard. Repair desktops are separate environments and the sole manual enrollment source. The operator signs in there and chooses **Enroll shard**; the schema requires that unique desktop binding before admission. External API/CLI/file ingestion is closed, including for retained legacy rows until explicit confirmation. Worker lifecycle remains automatic, while expired provider sessions require manual renewal in the owning desktop. Capability discovery gates routing. Enabling the documented Codex image-tool alias requires explicit worker configuration and successful image verification.

## Manual policy rollout

Apply the reviewed manual-enrollment migration before compatible controller/application readers. Preserve homes, links, signing state, holds and uncertain receipts during the supervised reload. See [the migration guide](MIGRATION_GUIDE.md) and [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md). A rollback that reopens old insertion privileges is a deliberate policy rollback, not routine availability repair. Use [current state](../post-mortem/CURRENT_STATE.md) for actual activation and remaining provider acceptance.

## Legacy boundary

`docker-compose.relay.yml` and the retained `galxai-relay` container describe the former shared deployment. They are not the vNext fleet launcher. Rebuilding that layout with the current worker will fail the one-shard guard.

Before any migration or rollback, pause new admissions, drain the active topology, and confirm the same credentials cannot execute in both topologies. Review maintenance holds: unheld workers are removed on graceful controller stop, while held workers can survive reload. Preserve checkpoint volumes, signing state and private journals. A checkpoint is not permission to replay unfinished inference.

[ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md) preserves the earlier containment decision. [ADR 0126](adr/0126-capability-aware-shard-relay-federation.md) replaces its shared lifecycle, and [ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md) records production cutover and saved rollback evidence.

For transport failures use the [request recovery table](RELAY_API_REFERENCE.md#request-recovery), not a larger timeout or blind retry. The [resilience guide](RESILIENCE_AND_DISASTER_RECOVERY.md) distinguishes lost acknowledgements, stream interruption, capability loss, and worker replacement.
