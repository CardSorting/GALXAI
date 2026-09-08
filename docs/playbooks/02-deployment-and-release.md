# Deployment and release

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Follow the current vNext runbook. Build and validate the changed application/controller/worker components separately. Save revision, image, ingress, and rollback evidence.

Drain the active topology before transferring shard ownership. Start the supervised controller, verify one worker per active shard and fresh model pools, then verify the actual public client path. A model listing, matching credential alias, or 202 acknowledgement is not successful inference.

Record chat and image results separately with execution metadata. Paid feature activation and entitlement changes remain separate from deployment verification. Do not use the legacy Compose file as a federation launcher.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
