# ADR 0075: Speculative Verification Trees, EAGLE-2, Medusa & Head Entropy Pruning

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
`Accepted`

## Context
High-throughput LLM inference and speculative decoding increasingly utilize tree-structured draft verification:
1. **Tree-Based Speculative Decoding**: Evaluates multi-candidate draft branches in parallel rather than serial candidate chains.
2. **EAGLE-2 Feature-Level Speculation**: Enhances draft token generation with multi-layer contextual feature embeddings and dynamic top-$k$ confidence calibration.
3. **Medusa Multi-Head Speculation**: Employs multiple parallel prediction heads on top of the base model to propose multiple draft tokens simultaneously.
4. **Attention Head Entropy Pruning**: Quantifies per-head attention dispersion to identify redundant heads and prune them without compromising accuracy.

## Decision
We implemented comprehensive speculative decoding and attention pruning profiles in `BroccoliDataLabelingClassifier`:
- `SpeculativeVerificationTreeVector`: Evaluates multi-branch candidate trees (branching factor $\ge 2$, path length $4$, yield $\ge 0.70$).
- `Eagle2SpeculativeTreeVector`: Profiles feature-level draft tree depth ($3$) and contextual confidence factors ($0.78+$).
- `MedusaSpeculativeTreeProfile`: Tracks parallel 4-head draft yields and tree acceptance rates ($0.72+$).
- `AttentionHeadEntropyPruningVector`: Measures Shannon entropy dispersion across 128 attention heads to detect prunable heads.

## Consequences

### Positive
- **Acceleration Profiling**: Shards are pre-annotated with optimal speculative draft hyperparameters (EAGLE-2 vs Medusa vs Tree-of-Thought).
- **Inference Footprint Reduction**: Identifies redundant attention heads for runtime memory and compute savings.
- **Zero-Dependency Execution**: Computed instantaneously in memory using native data structures.

## References
- `src/core/contracts/GalxContracts.ts`
- `src/core/training/BroccoliDataLabelingClassifier.ts`
- `tests/r2-training-sync.test.ts`
