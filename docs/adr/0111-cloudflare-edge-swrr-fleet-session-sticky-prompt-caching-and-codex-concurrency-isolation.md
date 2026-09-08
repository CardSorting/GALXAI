# ADR 0111: Separate edge and Node inference transports

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status

Clarified 2026-09-07; relay deployment and recovery are superseded by [ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md).

## Decision

The Cloudflare Worker and Node relay remain separate runtime implementations. `wrangler.toml` selects `src/workers/cloudflare/index.ts` for the Worker; `Dockerfile.relay` builds `src/relay/relay-server.ts` for the standalone relay in this repository.

The Worker includes provider REST paths using its configured credentials. The relay implements its own upstream transport, asynchronous job contract, registry refresh, and bounded failure handling. Do not describe the Worker as the relay's public alias or claim it universally emits an unsupported-session error that its current handlers do not implement.

## Consequences

Deploy and validate each runtime separately. The local Docker rollout does not establish remote ingress, Worker deployment, or application connectivity. The topology does not prove a universal Cloudflare protocol limitation or upstream datacenter block.

Earlier sibling-repository commands, fixed provider quota assumptions, cache timing claims, and seamless failover descriptions are withdrawn. See [Cloudflare strategy](../CLOUDFLARE_STRATEGY.md), [API boundaries](../API_BASE_URL.md), and the [relay runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md).
