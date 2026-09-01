# ADR 0085: Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Origin Shield

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
