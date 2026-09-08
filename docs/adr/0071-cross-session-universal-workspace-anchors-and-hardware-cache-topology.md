# ADR 0071: Cross-Session Universal Workspace Anchors and Hardware Cache Topology

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

**Status:** Accepted & Implemented  
**Date:** 2026-08-29  
**Deciders:** Principal Architecture & Sovereign Infrastructure Team  
**Consulted:** Security, Core Router, Prompt Optimization  
**Informed:** Developer Platform & Sovereign Governance  

---

## 1. Context and Problem Statement

Within organizational teams and developer workspaces, many AI chat sessions share identical core context: corporate security policies, compliance directives (e.g. EU AI Act residency constraints), database schemas, and shared architectural standards.

Without centralized anchoring:
1. **Redundant Context Ingestion**: Every thread had to re-upload or re-prompt the same organizational schemas and guidelines, wasting prompt tokens and increasing latency.
2. **Cache Thrashing**: Varying prompt prefixes across threads prevented upstream prompt caching engines (OpenAI Prompt Cache, Anthropic Ephemeral Cache, vLLM / SGLang prefix caching) from achieving high hit rates ($>90\%$).

---

## 2. Decision Drivers

- **Zero-Duplication Workspace Memory**: Shared policies and architectural schemas declared once per workspace and available across all conversations.
- **Hardware-Aligned Stable Cache Prefixing**: Freeze the prompt prefix (`[Workspace Anchors] -> [System Directives] -> [Root Goal] -> [Synthesized Context Block]`) to achieve $>98\%$ prompt cache reuse.
- **Deterministic SHA-256 Checkpoint Hashing**: Compute deterministic fingerprints across static prefix blocks to verify cache stability across turns.

---

## 3. Decision Outcome

We implemented **Universal Workspace Anchoring (PostgreSQL Migration V52)** and updated `GalxRollingContextEngine`:

### 3.1. Database Schema
- **`galx_chat_universal_workspace_anchors`**: Stores workspace-wide shared context anchors with `workspace_id`, `anchor_type` (`architectural_schema`, `sovereign_policy`, `global_rule`), `anchor_key`, and content.
- Unique constraint `uq_workspace_anchor_key (workspace_id, anchor_key)`.
- **`fn_get_zenith_universal_context`**: Single-hop stored procedure aggregating workspace anchors, thematic episodes, and recent messages in 1 query.

### 3.2. L1 BroccoliDB Table
- `galx_chat_workspace_anchors_l1`: In-memory table for sub-microsecond anchor resolution.

### 3.3. Deterministic Stable Prefix Hashing & Cache Breakpoints
- The engine computes a deterministic SHA-256 fingerprint over the trusted prefix messages:
  $$\text{StableHash} = \text{SHA256}(\text{SystemAnchors} + \text{WorkspaceAnchors} + \text{RootGoal} + \text{SummaryBlock})$$
- Attaches explicit cache markers (`prompt_cache_breakpoint: { mode: 'explicit' }`) to text blocks at the boundary between the static prefix and the sliding verbatim buffer.

---

## 4. Consequences

### Positive
- **Instant Cross-Session Consistency**: New threads in a workspace automatically adhere to organizational schemas and sovereign policies.
- **$>98\%$ Prompt Cache Hit Rates**: Fixed prefix topology enables maximum cache reuse on upstream frontier models, reducing Time-To-First-Token (TTFT) by up to $70\%$.
- **Sub-Millisecond 1-Hop CTE**: Resolves full workspace context in a single database roundtrip.

### Negative / Trade-offs
- Workspace anchors must be kept concise to avoid consuming unnecessary prefix token budget (enforced by a 20-anchor limit per workspace).
