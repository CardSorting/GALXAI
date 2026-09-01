# ADR 0084: Context Salience Scoring and High-Throughput Zen Flow Buffer Pool

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
