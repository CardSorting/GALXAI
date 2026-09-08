# Cloudflare maintainer runbook

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

## Source of truth

The Worker name and entrypoint are in [wrangler.toml](../../wrangler.toml): `galxai-edge-gateway` and `src/workers/cloudflare/index.ts`. Read that configuration and the invoked modules before changing bindings or choosing a deployment command. Do not use an old sibling-repository relay setup or infer live resources from checked-in IDs.

## Deployment boundaries

- The Next.js application owns the product API at `https://galx.ai/v1`.
- The configured Worker route under `api.galx.ai` is a separate deployment and contract.
- The federation uses a supervised host controller on loopback port 3001 and one Docker worker per active shard. Use the [vNext runbook](../RELAY_VNEXT_RUNBOOK.md); the shared Compose layout is legacy.
- R2 storage is an application integration; image generation by the relay does not verify the gallery lifecycle.

The relay rollout on 2026-09-07 verified local container isolation, authentication, and a short inference stream. It did not deploy the Worker or verify public ingress. See the [relay runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) for exact evidence and rollback steps.

## Change procedure

1. Identify the actual failing endpoint and runtime from request telemetry, response shape, and deployment configuration.
2. Inspect the active entrypoint, required bindings, and secret names without printing secret values.
3. Validate the changed runtime with its repository checks. A successful Worker build does not test the Node relay.
4. Deploy only the intended component using its configured account/environment and current CLI workflow.
5. Verify authentication, bounded failure, streaming, and cancellation on the deployed route. Record the version and observation date; retain rollback instructions.

If adding a tunnel, validate the origin address from the tunnel host, TLS termination, buffering behavior, and exact browser origin allowlist. Keep relay administration separate from inference keys. A tunnel does not replace either authentication or container isolation.

Use [Cloudflare strategy](../CLOUDFLARE_STRATEGY.md), [security policy](../relay-security.md), and [troubleshooting](../TROUBLESHOOTING.md). No production performance guarantee should be inferred from a local simulation or a configured Cloudflare binding.
