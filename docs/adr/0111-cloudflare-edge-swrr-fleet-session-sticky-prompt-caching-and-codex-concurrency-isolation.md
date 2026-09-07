# ADR 0111: Separate edge and Node inference transports

## Status

Clarified 2026-09-07; relay deployment and recovery are superseded by [ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md).

## Decision

The Cloudflare Worker and Node relay remain separate runtime implementations. `wrangler.toml` selects `src/workers/cloudflare/index.ts` for the Worker; `Dockerfile.relay` builds `src/relay/relay-server.ts` for the standalone relay in this repository.

The Worker includes provider REST paths using its configured credentials. The relay implements its own upstream transport, asynchronous job contract, registry refresh, and bounded failure handling. Do not describe the Worker as the relay's public alias or claim it universally emits an unsupported-session error that its current handlers do not implement.

## Consequences

Deploy and validate each runtime separately. The local Docker rollout does not establish remote ingress, Worker deployment, or application connectivity. The topology does not prove a universal Cloudflare protocol limitation or upstream datacenter block.

Earlier sibling-repository commands, fixed provider quota assumptions, cache timing claims, and seamless failover descriptions are withdrawn. See [Cloudflare strategy](../CLOUDFLARE_STRATEGY.md), [API boundaries](../API_BASE_URL.md), and the [relay runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md).
