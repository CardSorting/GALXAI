# ADR 0038: Distributed Edge KV Rate Governance & Stale-While-Revalidate Model Catalog Caching

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
High-velocity agent swarms generate bursts of hundreds of concurrent invocations per second. Processing rate-limit lookups and model catalog discovery (`GET /v1/models`) via database roundtrips creates connection exhaustion, increases latency, and degrades availability during traffic spikes.

## Decision
1. **Edge-Native Sliding-Window Rate Limiting (`RATE_LIMIT_KV`)**:
   - Cloudflare Workers KV is partitioned for production (`97100b97dbcc429793d6b97bc53a172e`) and staging (`87c64242cba24f9ead628148df6b02f1`).
   - Implements a sliding-window token bucket algorithm directly within V8 edge isolates, throttling clients at 120 req/min with automatic TTL expiration.
   - Operates with fail-open resilience to prevent transient edge failures from rejecting legitimate client traffic.

2. **Stale-While-Revalidate (SWR) Model Catalog Caching (`EDGE_CACHE`)**:
   - Model catalog queries (`GET /v1/models`) are cached globally in KV with a 300-second TTL.
   - Subsequent calls return immediate cache hits (`x-galx-cache: HIT`) in $<10\text{ms}$ at the nearest edge PoP.
   - Background asynchronous edge promises refresh the cache upon expiration, guaranteeing that client requests never block on cold upstream catalog lookups.

3. **Fast-Path API Key Prefix Validation**:
   - Keys with invalid prefixes (`galx_live_...` or `galx_test_...`) are rejected with `HTTP 401 Unauthorized` in $<1\text{ms}$ at the edge without querying database credentials.

## Consequences

### Positive
- **100% Elimination of Rate-Limiting DB IOPS**: Database connection pools are completely shielded from high-velocity rate limit checks.
- **Sub-10ms Catalog Resolution**: `/v1/models` returns instantly from edge PoP memory across all 300+ regions.
- **Fail-Open Fault Tolerance**: If Cloudflare KV experiences transient degraded performance, the gateway seamlessly fails open rather than interrupting inference streams.
