# ADR 0085: Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Origin Shield

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migrations 68–70, Applied & Cemented)

## Context
High-frequency client polling and background workers querying Supabase generated heavy WAN egress costs and database load, even when data had not changed.

## Decision
1. **Zero-Egress Keyset ETag Sync (`fn_get_compact_chat_delta_sync_v2`, `GalxZeroEgressCacheMesh.ts`)**:
   - Compares client ETag with Postgres aggregate signature.
   - On match, returns a ~48-byte HTTP 304 response, and restores the full message state from local in-memory `BroccoliDbTable<CachedChatSnapshot>`.
2. **Single-Flight Request Coalescing (`BroccoliEgressReducer.ts`)**:
   - Collapses simultaneous concurrent requests for an expired key into a single in-flight Promise, suppressing thundering herd stampedes.
3. **XFetch Probabilistic Early Refresh ($\Delta = -\beta \cdot \delta \cdot \ln(U)$)**:
   - Refreshes hot cache keys in the background before TTL expiration, eliminating cold-start stalls.
4. **In-Memory Bloom Filter Negative Shield**:
   - Rejects non-existent entity queries in < 0.05 µs without issuing database queries to Supabase.

## Consequences
- Slashes Supabase egress bandwidth by 95%–99%.
- Reduces origin database query hit rate by >98%.
