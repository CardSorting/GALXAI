# ADR 0120: Host relay ingress and deployment boundary

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

- Status: Deployment strategy superseded by ADR 0122
- Original decision date: 2026-09-05
- Reconciled with implementation: 2026-09-07

## Context

A host-based relay makes long-running provider connections available to an application through HTTP job acknowledgement and SSE. Tunnel tooling can expose a configured host origin, but neither a tunnel nor a process supervisor removes host availability dependencies.

## Current decision

The verified deployment is this repository's Docker image on host loopback port 3001. It uses non-root execution, read-only runtime files, a private checkpoint volume, and separate inference/administrator credentials. The previous personal credential and repository bind mounts are removed. Native host execution and tunnel supervision remain code paths for explicit deployments, not the isolation boundary used by the verified container.

Remote ingress requires a separately configured and verified route, TLS, and relay authentication. Changing a tunnel URL requires updating clients. Host sleep, network loss, process restarts, and upstream failures can interrupt work. This record establishes no infrastructure cost, external hostname availability, geographic performance, or uptime guarantee.

## Protocol boundary

Chat submission acknowledges a job with HTTP 202. Callers use the returned status and stream URLs with the same relay key. Transport keepalives do not prove model progress. Retry and reconnect are bounded, failed jobs stop, and crash recovery does not replay provider work. The relay reports chunk counts and explicit unknown timing values rather than invented token counts or completion estimates. Cancellation does not own wallet settlement.

The 2026-09-07 rollout verified local canary and live-container inference, authentication, registry loading, and runtime filesystem restrictions. It did not verify a public tunnel or deploy a remote application.

[ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) · [Deployment runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
