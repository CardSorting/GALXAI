# Deployment boundaries

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Deploy the application gateway, federation controller, and shard worker image as separate components. Use the [vNext runbook](RELAY_VNEXT_RUNBOOK.md) for validated commands, configuration, cutover, and rollback.

| Component | Deployment responsibility |
| --- | --- |
| Application gateway | Build and deploy the application; verify its configured relay URL/key and public API behavior |
| Federation controller | Supervise the host process with persistent signing secret, registry access, exclusive ownership lock, and Docker access |
| Shard workers | Controller creates one isolated container per active shard from the selected image |
| Ingress | Route the authenticated relay hostname to the controller front door |
| Cloudflare Worker | Separate deployment and route verification; application deployment does not publish it |

## Release sequence

1. Run targeted capability and cooldown/client regressions, type checking, and relevant build checks.
2. Build the worker image and run the isolated three-shard synthetic Docker canary.
3. Record the current image, ingress target, controller revision/configuration, and rollback path without exposing secrets.
4. Drain any legacy shared relay before assigning its credentials to vNext. Never run both topologies against the same shards.
5. Start the supervised controller and verify ownership, freshness, model-specific capacity, and administrator access.
6. Verify public chat completion and the actual image client independently. An inventory listing or HTTP 202 is insufficient.
7. Record deployment and client evidence with a date and revision. Billing/entitlement activation is a separate action.

`docker-compose.relay.yml` is the retained legacy shared layout, not a vNext launcher. New workers reject multiple shard assignments. The old CLI lifecycle commands must not be assumed to manage the federation service.

The September 7 cutover and successful DreamBees image verification are recorded in [ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md). All observed pools had one eligible shard; paid Hive remained disabled. Recheck current state before a new release. Multi-host deployment requires shared ownership leasing beyond the existing single-host lock and Docker uniqueness constraint.
