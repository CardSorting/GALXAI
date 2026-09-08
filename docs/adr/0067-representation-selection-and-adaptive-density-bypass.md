# ADR 0067: Adaptive Representation Selection & Density Bypass Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Metadata
* **Status**: Accepted
* **Date**: 2026-08-28
* **Authors**: @CardSorting / Senior Engineering Convergence Team
* **Subsystem**: `src/core/broccolidb`, `eval/`
* **Impact**: Core Architectural Invariant & Operational Boundary

---

## 1. Context & The Representation Selection Thesis

Early iterations of BroccoliDB treated compaction as a universal compression filter. However, empirical benchmarking against the **7-Tier Progressive Institutional Entropy Gradient** (ADR 0066) revealed a crucial boundary condition:

```text
Under Small, Already-Dense Clean Contexts (<200 tokens):
  - Blind compaction introduces structural overhead (expansion).
  - Generic transformation schemas risk omitting subtle code sub-clauses.
```

### The Governing Thesis:
> **BroccoliDB is not merely a compactor. It is a Dynamic Representation-Selection Substrate.**

Given a context $C$ and an engineering task $T$, the substrate selects an optimal representation operator $R \in \mathcal{R}$:

$$R(C, T) = \begin{cases} 
\text{Identity}(C) & \text{if } \text{Density}(C) \ge \theta_{\text{dense}} \text{ or } \text{Tokens}(C) < 200 \\
\text{GovernanceCompactor}(C) & \text{if } \text{ContextMatches}(\text{Architecture, RFCs}) \\
\text{IncidentCascader}(C) & \text{if } \text{ContextMatches}(\text{Logs, Outages}) \\
\text{DomainOptimizer}(C) & \text{if } \text{ContextMatches}(\text{180 Domain Schemas})
\end{cases}$$

---

## 2. The 2-Tier Architectural Solution

### Tier 1: Adaptive Density Gate (Identity Bypass)
For clean prompts ($<200$ tokens) where no institutional noise headers or organizational slop are present, compaction is bypassed entirely:
* **Token Reduction**: $0.0\%$ (Zero overhead, zero dilation).
* **Action Safety**: $100\%$ (Identical to raw baseline).

### Tier 2: Governance & Invariant Representation Transformer
When institutional noise (superseded ADRs, meeting minutes, stale RFC forms) is detected alongside code invariants, the `BroccoliArchitectureInvariantCompactor` filters out the noise while elevating:
* Active cryptographic constraints (e.g. `RS256`, `v2` keys).
* Memory safety requirements (e.g. `zeroizeBuffer()` in `finally`).
* Runtime deployment invariants (e.g. `runtime = "edge"`).

---

## 3. Empirical Results Across the 7-Tier Entropy Gradient

```text
======================================================================================
  Level | Raw Tokens | Compacted | Reduction | Raw Safety | GALX Safety | Invariant Status
  --------------------------------------------------------------------------------------
    L1  |         94 |        94 |      0.0% |       100% |        100% | ACTION_SAFE
    L2  |        242 |       111 |     54.1% |        90% |        100% | ACTION_SAFE
    L3  |        757 |       111 |     85.3% |        66% |        100% | ACTION_SAFE
    L4  |       1266 |       111 |     91.2% |        42% |        100% | ACTION_SAFE
    L5  |       1402 |       111 |     92.1% |        31% |        100% | ACTION_SAFE
    L6  |       1402 |       111 |     92.1% |        31% |        100% | ACTION_SAFE
    L7  |       1402 |       111 |     92.1% |        20% |        100% | ACTION_SAFE
======================================================================================
```

* **Clean Context ($L_1$)**: Preserves $100\%$ baseline safety via Adaptive Identity Bypass.
* **Saturated Noise ($L_7$)**: Achieves **$92.1\%$ token reduction** while defending **$100\%$ Action Safety** against raw baseline collapse ($20\%$).

---

## 4. Verification

Executed via the automated suite:

```bash
npm run bench:entropy
```

**Output**:
```text
Confirmed: 0 Committees Harmed (Institutional Entropy Resistance: MEASURED)
```

---

## 5. Consequences

* **Identity Operator Validation**: Establishing that *sometimes the correct representation is the original one* eliminates negative compression edge cases.
* **Resilience Under Adversarial Contexts**: Allows AI agents to operate on legacy enterprise codebases without being derailed by 10 years of institutional noise.
