# System topology and maintainer onboarding

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Start with the [architecture](ARCHITECTURE.md) and [federation contract](FEDERATION_STRATEGY.md). The application gateway, federation controller, single-shard workers, database authority, Cloudflare Worker, and consuming agent runtime are separate components.

## Follow one request

Trace the application key and requested model into the configured relay transport. Locate the model capability index, eligible health filters, load selection, admission receipt, selected worker generation, provider operation, and completed response. For images, inspect exact versus compatibility execution metadata. For chat, distinguish admission from stream completion.

## Follow one shard

Trace an encrypted registry credential into the controller's desired-shard projection and one isolated container. Establish authenticated capabilities before routing. Withdraw one model without restarting the worker, then restore it by fresh discovery. Credential invalidation retires the worker; an empty capability set does not.

## Follow one failure

Use the [troubleshooting guide](TROUBLESHOOTING.md). Determine whether evidence belongs to model capability, credential health, database transport, local saturation, or an accepted job. Preserve generation, inventory, lease, and receipt-scope authority. Do not use stale telemetry or ambiguous execution as permission to retry.

## Make and verify a change

Use the [maintainer execution guide](maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) and [verification guide](INFERENCE_PIPELINE_VERIFICATION.md). Keep independent I/O bounded and shared mutations serialized. Run the relevant fixture tests; live deployment/client claims require separate evidence.

For deployment use the [vNext runbook](RELAY_VNEXT_RUNBOOK.md), not legacy shared-container commands. For broader subsystem references and historical designs use the [complete documentation catalog](CATALOG.md); their scope does not extend the current federation guarantees.
