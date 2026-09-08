# ADR 0086: BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migration 71, Applied & Cemented)

## Context
Transient database outages or network latency spikes could cause unconstrained retry loops across Next.js SSR components, Edge Middleware, and API routes, leading to runaway billing overages and server connection pool exhaustion.

## Decision
1. **Cemented PostgreSQL Authority (`galx_authoritative_data_epochs`)**:
   - PostgreSQL remains the undisputed ruler of the data via monotonic Merkle epochs (`version_epoch`, `merkle_root_hash`).
   - Mutations update PostgreSQL via atomic stored procedures (`rpc_advance_authoritative_epoch`) and immediately write through to BroccoliDB L1.
2. **Workspace-Wide Governed Fetch (`BroccoliAuthoritativeGovernor.ts`, `src/lib/supabase/client.ts`, `src/utils/supabase/server.ts`, `src/utils/supabase/middleware.ts`)**:
   - Every Supabase client factory embeds `createGovernedFetch()`.
   - Outbound queries are capped at **50 queries / sec per node** via a leaky bucket governor.
   - 5 consecutive 5xx errors or network timeouts trip the circuit breaker `OPEN` for 10 seconds, causing queries to fail-fast in **< 0.01 ms** and fall back immediately to local in-memory BroccoliDB L1 state.

## Consequences
- Eliminates infinite retry storms, server connection pool exhaustion, and runaway billing overages.
- Retains 100% data authority in PostgreSQL while delivering sub-millisecond local resilience.
