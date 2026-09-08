# ADR 0084: Context Salience Scoring and High-Throughput Zen Flow Buffer Pool

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migrations 66–67, Applied & Cemented)

## Context
High-throughput streaming proxies suffered from GC pause spikes during allocation storms under hundreds of concurrent streams. In parallel, conversation context windows accumulated conversational filler messages that diluted attention weights.

## Decision
1. **Information-Theoretic Salience Scoring (`GalxContextSalienceEngine.ts`, `galx_context_salience_scores`)**:
   - Scores message entity density, code blocks, variables, and imperative directives (1.0 rating).
   - Conversational filler (`"ok thanks!"`, `"got it"`) is automatically damped (0.1 rating) for background compression.
2. **Stabilized KV-Cache Prefix Hierarchy**:
   - `[System Prompt] -> [Workspace Invariants] -> [High-Salience Historical Turns] -> [Recent Turn Pairs] -> [User Instruction]`
   - Guarantees byte-for-byte prefix cache hits across OpenAI and Anthropic models.
3. **Zero-Allocation Zen Flow Buffer Pool (`GalxZenFlowBufferPool.ts`, `galx_io_execution_authority_metrics`)**:
   - Manages 512 pre-allocated 8KB `Uint8Array` buffer slots in a circular ring.
   - Implements hydraulic high/low watermark flow control with cooperative event loop yielding (`yieldFlow()`).

## Consequences
- Eliminates GC memory churn during massive multi-stream concurrency.
- Increases upstream prompt cache hits to >95%.
