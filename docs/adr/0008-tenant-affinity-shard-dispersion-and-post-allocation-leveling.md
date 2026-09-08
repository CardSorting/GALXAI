# ADR 0008: Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom Leveling

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
In multi-tenant AI routing gateways serving autonomous agent swarms, high-concurrency bursts from a single user can create localized upstream congestion:
1. **Tenant Hot-Spotting**: When an autonomous agent loop launches 30 concurrent sub-agent reasoning calls, standard load balancers may assign multiple requests to the same upstream credential, exhausting that shard's concurrency limits while other shards sit idle.
2. **Pre-Allocation Headroom Blindness**: Evaluating token headroom only before allocations are made creates race conditions where subsequent requests within a single event loop tick fail to account for active in-flight soft reservations.

## Decision
We implemented **Tenant-Affinity Shard Dispersion (TASD)** coupled with **Continuous Post-Allocation Headroom Leveling** within the `GalxCredentialPool`:

### 1. Tenant-Affinity Shard Dispersion (TASD)
During candidate evaluation, the router calculates the number of active in-flight requests on each shard belonging to the requesting `tenantId`:
$$\text{TenantInFlight} = \sum_{l \in \text{activeLeases}(\text{shard})} \mathbb{I}(l.\text{tenantId} == \text{currentTenant})$$
$$\text{TenantDispersionMultiplier} = \max\left(0.1, 1 - \frac{\text{TenantInFlight}}{\text{MaxTenantBurstLimit}}\right)$$
- If a tenant already has active leases on Shard A, Shard B receives a higher comparative score, naturally dispersing multi-request bursts across distinct physical upstream shards.

### 2. Post-Allocation Headroom Leveling
Rather than using static token availability, the router computes instantaneous unreserved post-allocation token headroom:
$$\text{PostAllocationTokens} = \max(0, \text{refilledTokens} - \text{reservedTokens} - \text{estimatedRequestTokens})$$
$$\text{TokenHeadroomRatio} = \frac{\text{PostAllocationTokens}}{\text{MaxTokens}}$$
- Dynamically penalizes shards whose available capacity would dip below minimum execution thresholds (`MDA-Floor`), guaranteeing balanced hydraulic leveling.

### 3. Power-Law Concurrency Headroom
$$\text{ConcurrencyHeadroom} = \max\left(0.01, 1 - \left(\frac{\text{InFlight}}{\text{MaxInFlight}}\right)^{1.5}\right)$$
- Applies a non-linear power-law curve that aggressively diverts traffic as a shard approaches 80%+ saturation.

## Consequences
- **Positive**: Multi-agent swarms (e.g. LangChain, CrewAI, AutoGen) achieve smooth parallel throughput without hitting single-key concurrency bottlenecks.
- **Positive**: Upstream account utilization is distributed with mathematical fairness.
- **Positive**: Sub-15ms acquisition latency with zero inter-process locking overhead.
