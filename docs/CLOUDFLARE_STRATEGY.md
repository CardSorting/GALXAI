# Cloudflare implementation and deployment boundaries

Reviewed against repository configuration on 2026-09-07. Cloudflare components and the local relay have independent lifecycles. Configuration checked into source is not proof of an active remote deployment.

## Worker

[wrangler.toml](../wrangler.toml) configures `galxai-edge-gateway`, with [src/workers/cloudflare/index.ts](../src/workers/cloudflare/index.ts) as its entrypoint and a route under `api.galx.ai`. Worker source includes gateway, routing, caching, queue, webhook, and coordination modules. Inspect the entrypoint and enabled bindings before assuming that every module participates in a request.

The application API at `https://galx.ai/v1` is a separate contract. The Worker is not an interchangeable DNS alias for the application or the Node relay. Its provider REST paths use Worker configuration; do not assume it shares the relay's PostgreSQL projection, job protocol, or process-local retry state.

## Relay and optional ingress

The standalone relay lives in [src/relay](../src/relay), builds with [Dockerfile.relay](../Dockerfile.relay), and runs through [docker-compose.relay.yml](../docker-compose.relay.yml). The verified deployment binds `127.0.0.1:3001`. Its container isolation, keys, recovery limits, and health semantics are defined by [ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md).

A public tunnel or reverse proxy is optional additional infrastructure. It must preserve authentication, streaming, cancellation, and origin policy. The local Docker rollout did not verify a public tunnel, Worker deployment, or application-to-relay path from a remote host. An application on another machine cannot reach this relay through its own `localhost`.

This topology is a repository implementation decision, not a claim that Cloudflare universally cannot support a particular upstream protocol. Do not attribute unverified failures to provider network blocking or platform runtime limits.

## Image storage

The application [R2AssetAdapter](../src/workers/cloudflare/GalxR2AssetAdapter.ts) handles user/session image storage. The relay returns image results; it does not itself establish the application's R2 lifecycle. See [ADR 0121](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) for bounded manifests, concurrent-write limitations, and nontransactional deletion.

## Operations

Deploy the Worker, application, and relay independently using their respective configuration and validation. Use deployment-scoped secrets; never copy personal credential directories or provider tokens into a client bundle. Registry authority and raw-token projection rules remain governed by ADR 0115. No global throughput, latency, pricing, or compliance guarantee follows from choosing Cloudflare.

See the [Cloudflare maintainer runbook](maintainers/CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md), [deployment guide](DEPLOYMENT.md), and [API base URL guide](API_BASE_URL.md).
