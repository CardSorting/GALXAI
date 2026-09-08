# ADR 0082: Deterministic Prompt Compaction, Strict Model Fidelity & Quality Sentinels

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migrations 62–63, Applied & Cemented)

## Context
Massive prompt payloads wasted KV-cache prefix boundaries, while autoregressive model generation anomalies (infinite repetition loops, truncated JSON schemas, refusal false positives) degraded user experiences. Historically, speculative systems attempted automatic model re-routing (e.g. guessing whether a query needs a reasoning model vs a flash model), but empirical evaluation proved this to be an anti-pattern: arbitrary model switching cannot quantitatively predict subjective user requirements and breaks deterministic developer workflows.

## Decision
1. **Deterministic Prompt Compaction & KV Boundary Alignment (`GalxPromptCompactionEngine.ts`)**:
   - Deflates redundant whitespace while preserving code string literal integrity.
   - Pads and aligns system prompts to 1024-token boundaries to maximize hardware KV cache hits.
2. **Strict User-Requested Model Fidelity (Rejection of Automatic Routing)**:
   - Completely rejects automatic/predictive model guessing. The user's explicitly requested model is respected 100% of the time with zero mutation.
3. **Quality Sentinel Mesh (`GalxQualitySurvivabilityEngine.ts`, `galx_model_quality_sentinel_ledger`)**:
   - Analyzes streaming token distributions for repetitive $N$-gram loops ($N \in [3, 8]$).
   - Validates JSON output schemas against JSON Schema drafts.
   - When degradation is detected, dampens generation parameters (`temperature: 0.15`) without changing the requested model.

## Consequences
- 15%–30% prompt token reduction with byte-for-byte prefix cache stability.
- Deterministic, zero-surprise model execution with 100% respect for developer model selection.
- Automatic anomaly damping for infinite token loops.
