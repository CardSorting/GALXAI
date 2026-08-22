# ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy

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
