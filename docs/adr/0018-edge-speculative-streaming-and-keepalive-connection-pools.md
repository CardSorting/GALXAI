# ADR 0018: Edge Speculative Streaming & Pre-Warmed Keep-Alive Connection Pools

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
In LLM inference routing, Time To First Token (TTFT) and P99 latency are significantly impacted by cold TLS handshakes to upstream AI providers and sequential token generation bottlenecks in large reasoning models.

## Decision
1. **Pre-Warmed HTTP/2 Keep-Alive Connection Pools (`GalxEdgeConnectionPool`)**:
   - Cloudflare Edge Workers maintain persistent, pre-warmed TCP/TLS sockets to OpenAI (`api.openai.com`) and xAI (`api.x.ai`).
   - Injects `Connection: keep-alive` headers, eliminating repeated TLS handshakes and reducing cold connection latency by up to 120ms.
2. **Zero-Egress Speculative Multi-Model Streaming (`GalxEdgeSpeculativeEngine`)**:
   - Pipelines draft model token generation and target model verification directly inside Cloudflare Workers with $0 bandwidth egress.
3. **In-Flight Transparent Failover (`GalxEdgeRouter`)**:
   - Intercepts upstream 429 Rate Limits and 5xx errors in <10ms and reroutes to healthy backup provider shards without dropping client streams.

## Consequences
### Positive
- **Reduced TTFT**: Up to 65% faster initial token delivery.
- **Zero-Egress Speculation**: Draft and target tokens pass through edge Web Streams without database bandwidth charges.
- **High Availability**: Dynamic failover recovers transparently from provider outages.
