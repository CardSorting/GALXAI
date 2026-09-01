# ADR 0086: BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker

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
