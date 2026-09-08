# ADR 0001: Unified Pooled Quota Cycling Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
Traditional AI gateway architectures suffer from quota fragmentation:
1. Users or background jobs configure static API keys tied to individual upstream accounts.
2. During traffic spikes, single keys hit upstream rate limits (HTTP 429), while adjacent credentials sit completely idle.
3. Exposing internal quota sharing or sharding mechanisms to end-users creates severe cognitive overhead, complex key management UIs, and user friction.

## Decision
We eliminated all private versus pooled bifurcation in user-facing endpoints and core dispatchers. All upstream credentials registered into the GALXAI compute substrate are unified into a single pooled quota fleet.

### Key Architectural Tenets:
1. **Seamless Public Experience**: End users interact with standard OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/images/generations`, `/v1/models`) using a single `galx_live_...` developer gateway key. The underlying quota cycling remains invisible.
2. **Adaptive Hydraulic Headroom Cycling (P-AHT)**: The routing engine evaluates live token bucket headroom, concurrency load ratios, circuit health, EWMA latency, and dynamic reliability weights to select the optimal upstream credential for every request:
   $$\text{Score} = \left(\frac{\text{unreservedTokens}}{\text{maxTokens}}\right)^{1.2} \times \left(1 - \frac{\text{inFlight}}{\text{maxConcurrency}}\right) \times \text{HealthMultiplier} \times \text{ReliabilityWeight} + \text{jitter}$$
3. **Smooth Weighted Round-Robin (SWRR)**: Implemented Envoy/Nginx-grade smooth interleaving with dynamic weights to ensure burst-free traffic distribution across homogeneous accounts.
4. **Transparent Failover**: If an upstream shard encounters a transient 429 or 503 error, the router automatically fails over to the next candidate shard in $< 15\text{ms}$ without surfacing errors to the client.

## Consequences
- **Positive**: Eliminates 429 rate limit outages across all tenant applications; allows GALXAI to offer competitive discounts across flagship models; drastically simplifies the client integration workflow.
- **Positive**: Clean separation between developer gateway keys and encrypted upstream shard credentials.
- **Compliance**: Instant 1-click retraction ensures that if an upstream credential owner revokes permission, all active leases on that shard are terminated in $< 40\text{ms}$.
