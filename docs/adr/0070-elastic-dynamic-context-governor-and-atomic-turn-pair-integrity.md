# ADR 0070: Elastic Dynamic Context Governor and Atomic Turn-Pair Integrity

**Status:** Accepted & Implemented  
**Date:** 2026-08-29  
**Deciders:** Principal Architecture & Sovereign Infrastructure Team  
**Consulted:** Core AI Routing, SDK Engineering, Safety & Evaluation  
**Informed:** Developer Platform & API Governance  

---

## 1. Context and Problem Statement

Two systemic architectural bottlenecks impaired conversational stability and enterprise throughput in LLM applications:

1. **Artificial Static Context Clamping**: Legacy chat implementations hardcoded static token limits (e.g. `max_tokens = 2048` or `4096`). When users attached large documents (100–1,000 pages), requests either failed immediately or truncated essential prompt instructions, ignoring the model's actual 1,000,000+ token context window.
2. **Severed Tool Turn-Pair Boundaries**: Standard sliding-window compaction algorithms split message arrays purely by turn index count. In function/tool calling protocols (OpenAI, Anthropic), if an `assistant` message with `tool_calls: [{ id: "call_123" }]` is separated from its corresponding `tool` result message, the upstream provider API rejects the request with an unrecoverable HTTP 400 validation error (`orphaned_tool_message` or `tool_use_id without matching tool_result`).

---

## 2. Decision Drivers

- **Zero Artificial Clamping**: Support dynamic high-velocity workloads (1,000+ pages / 500k+ tokens) scaled dynamically up to the provider's 1.05M token frontier window.
- **Strict Protocol Turn-Pair Inseparability**: Guarantee that assistant tool calls and tool results are treated as atomic indivisible units across compaction boundaries.
- **Fail-Closed Safety Governor**: Dynamically calculate prompt tokens, safety buffers, output headroom, and tier entitlements before dispatching to upstream providers.

---

## 3. Decision Outcome

We implemented the `GalxElasticContextGovernor` and updated `GalxRollingContextEngine.ensureAtomicTurnPairs`:

### 3.1. `GalxElasticContextGovernor`
- **Dynamic Context Sizing**: Eliminates hardcoded clamps. Sizing is governed by the user's tier headroom and model frontier capability:
  - **Flagship Enterprise**: Full **1,050,000 context tokens**, up to **65,536–128,000 output tokens**.
  - **Small Business**: **512,000 context tokens**, up to **32,768 output tokens**.
  - **Developer**: **128,000 context tokens**, up to **16,384 output tokens**.
- **Page Density Estimator**: Calculates document density (~2,200 chars / page) to provide instant UI feedback (`"~1,001 pages (578,992 tokens) • Dynamic 1M Window Ready"`).

### 3.2. Atomic Turn-Pair Boundary Protection
The sliding window compaction algorithm strictly enforces turn-pair integrity:
```typescript
while (splitIndex > 1 && nonSystemMessages[splitIndex]?.role === 'tool') {
  splitIndex -= 1; // Shift compaction boundary left to encompass preceding assistant tool_calls
}
```
Furthermore, `GalxChatRequestNormalizer.normalizeChatMessages` validates that:
- Every `tool` message has a preceding `assistant` message containing matching `tool_calls`.
- Incomplete tool sequences or orphaned tool messages are caught and rejected at the API boundary with clear typed errors (`incomplete_tool_sequence`, `orphaned_tool_message`).

---

## 4. Consequences

### Positive
- **1,000+ Page Document Processing**: Seamlessly ingests multi-hundred-page documents without artificial truncation.
- **Zero HTTP 400 Tool Boundary Crashes**: Compaction preserves tool execution pairs intact.
- **Tier-Safe Allocation**: Prevents unprivileged tiers from consuming excessive context while giving enterprise users maximum capacity.

### Negative / Trade-offs
- Large context windows generate higher token consumption costs (governed by seat spend caps and rolling quota telemetry).
