# Cloudflare implementation and deployment boundaries

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Reviewed against repository configuration on 2026-09-07. Cloudflare components and the local relay have independent lifecycles. Configuration checked into source is not proof of an active remote deployment.

## Worker

[wrangler.toml](../wrangler.toml) configures `galxai-edge-gateway`, with [src/workers/cloudflare/index.ts](../src/workers/cloudflare/index.ts) as its entrypoint and a route under `api.galx.ai`. Worker source includes gateway, routing, caching, queue, webhook, and coordination modules. Inspect the entrypoint and enabled bindings before assuming that every module participates in a request.

The application API at `https://galx.ai/v1` is a separate contract. The Worker is not an interchangeable DNS alias for the application or the Node relay. Its provider REST paths use Worker configuration; do not assume it shares the relay's PostgreSQL projection, job protocol, or process-local retry state.

## Relay ingress

The selected Premium operation runs on the owner's Mac, with loopback-only monitor/runtime ports; no Cloudflare publication or hosted application cutover is implied. [Service operation](runbooks/relay-pool-services.md) owns local recovery and acceptance. Any existing external ingress remains separately governed and unchanged. No tunnel may bypass its scoped authorization.

The retained public application path uses a supervised host controller and one Docker worker per eligible unassigned account. Its ingress targets that controller; see [legacy operations](maintainers/legacy-federation-operations.md). This topology differs from the new in-process account engines inside each fixed pool runtime.

[ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md) records the September 7 public tunnel cutover to `http://host.docker.internal:3001` and successful DreamBees image verification. This is dated deployment evidence, not a current reachability assertion. Preserve authentication, streaming, cancellation, and ownership during a new ingress change.

## Image storage

The application [R2AssetAdapter](../src/workers/cloudflare/GalxR2AssetAdapter.ts) handles user/session image storage. The relay returns image results; it does not itself establish the application's R2 lifecycle. See [ADR 0121](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) for bounded manifests, concurrent-write limitations, and nontransactional deletion.

## Operations

Deploy the Worker, application, and relay independently using their respective configuration and validation. Use deployment-scoped secrets; never copy personal credential directories or provider tokens into a client bundle. Registry authority and raw-token projection rules remain governed by ADR 0115. No global throughput, latency, pricing, or compliance guarantee follows from choosing Cloudflare.

See the [Cloudflare maintainer runbook](maintainers/CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md), [deployment guide](DEPLOYMENT.md), and [API base URL guide](API_BASE_URL.md).
