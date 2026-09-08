# ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
Developers and enterprise teams face high costs when accessing flagship reasoning and visual models directly through single-key retail tiers:
1. Low individual usage prevents smaller teams from unlocking Tier-5 upstream volume discount brackets.
2. Direct providers offer prompt caching rebates (75%), but gateways often capture these rebates as hidden margin.
3. Pricing transparency is critical for developers seeking predictable cost scaling without lock-in.

## Decision
We established a comprehensive, transparent multi-tiered discount model across the GALXAI compute substrate:

### 1. Pooled Infrastructure Arbitrage (25% - 40% Base Discount)
- By consolidating multi-tenant query traffic into pooled Tier-5 upstream compute slots, GALXAI captures enterprise volume discounts and passes 25% to 40% direct savings to all developer gateway keys.
- Capacity is leveled dynamically across credentials via Predictive Adaptive Hydraulic Headroom (P-AHT) to prevent upstream rate-limit collisions.

### 2. 100% Prompt-Caching Pass-Through (75% Rebate)
- For requests with prefix context $> 1,024$ tokens, GALXAI passes through 100% of the 75% prompt caching rebate directly to the client without retaining platform margin.
- Workloads with high prompt repetition achieve compound net savings of **50% to 70%**.

### 3. Zero Platform Surcharges & No Lock-in
- Strict pay-per-token metering with no monthly subscription taxes or streaming upcharges.

## Consequences
- **Positive**: Market-leading cost efficiency for agentic and reasoning workloads.
- **Positive**: Full alignment between infrastructure capacity management and pricing strategy.
- **Positive**: Seamless compatibility with standard OpenAI API billing workflows.
