# ADR 0112: Registry-backed provider routing and relay transport

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

- Status: Superseded for relay behavior by ADR 0122; registry authority is specified by ADR 0115
- Original decision date: 2026-09-03
- Reconciled with implementation: 2026-09-07

## Context and retained decision

Provider credential type determines the supported transport. The application adapter contains provider REST, native Codex WebSocket, and relay paths. The standalone relay resides in this repository at `src/relay/relay-server.ts`; a sibling checkout is not a deployment dependency.

PostgreSQL is the durable credential registry. Backend services decrypt authorized records for provider dispatch. Device credential files are explicit import/development inputs, not the deployed relay's credential authority. The app now authenticates relay requests with a relay inference key, not a provider credential.

## Current behavior

The standalone relay opens a WebSocket per chat attempt and performs its own local shard selection from a refreshed registry projection. It chooses low in-flight load with rotating tie-breaking, not the platform pool's database-fenced lease algorithm. The default three-hour request window is observational and has no local cap. Operator caps and provider-reported cooldowns are separate inputs.

Expired/rejected credentials are excluded. Quota failures cool down the affected account; transport failures can open a local circuit. Alternate-account recovery has bounded retries, a shared retry budget, and a wall deadline. No alternate account, exhausted credits, or a terminal request ends recovery. Mid-stream continuation is best effort and can fail or change the answer.

## Superseded claims

This record no longer specifies a fixed provider request allowance, guaranteed uninterrupted output, a fixed failover latency, permanently warm sockets, proxy cloaking, or operation while the host is unavailable. It does not establish full OpenAI API compatibility or global relay concurrency.

[ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) was the prior relay baseline; the current relay contract is established by ADRs 0126–0127 above. [ADR 0115](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) governs registry custody and platform lease procedures. [Relay runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) contains actual deployment and verification steps.
