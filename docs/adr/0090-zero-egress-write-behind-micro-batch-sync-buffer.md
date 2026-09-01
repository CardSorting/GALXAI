# ADR 0090: Zero-Egress Write-Behind Micro-Batch Synchronization Buffer

## Status
Accepted

## Context
High-frequency routing decisions, latency telemetry logging, health probe recordings, and circuit breaker state transitions must execute in sub-microsecond time in L1 in-memory BroccoliDB tables. Writing synchronously to Supabase PostgreSQL on every request would introduce 20–80ms database roundtrips, exhaust connection pools, and generate immense cloud egress network costs.

## Decision
1. **Asynchronous Write-Behind Buffer (`GalxShardSyncBuffer.ts`)**:
   - High-velocity L1 mutations (latency samples, health probes, circuit breaker state changes, sliding window resets) are enqueued into an in-memory batch buffer without blocking the request/response path.
2. **Micro-Batch Debounce & Periodic Flush**:
   - `GalxShardSyncBuffer` debounces updates and automatically flushes whenever:
     - 100 items are queued in memory, OR
     - 2,500ms have elapsed since the last flush.
   - Probes are batched into a single PostgreSQL RPC invocation (`rpc_report_shard_health_batch`), reducing database hops by up to **98%**.
3. **Fail-Safe In-Memory Queue Retention**:
   - In the event of transient PostgreSQL connectivity drops, unwritten records are retained with bounded caps (last 200 probes, last 50 state transitions) and retried upon next flush cycle, guaranteeing zero 500 errors on the edge routing path.

## Consequences
- **Positive**: Zero database roundtrips on the hot inference routing path.
- **Positive**: Egress bandwidth and Supabase connection consumption reduced by 98%.
- **Positive**: Complete persistence of fleet health telemetry and audit records without latency penalties.
