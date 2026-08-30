# ADR 0078: GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes

## Status
`Accepted`

## Context
Frontier research published by Zhipu AI / Tsinghua University for the **GLM-5 Series (GLM-5, GLM-5.2, and GLM-5.3 / GLM-4.5 / GLM-4-Flash)** establishes next-generation architectural and training paradigms:

1. **IndexShare Sparse Attention**:
   - In traditional dynamic sparse attention, computing token relevance at every transformer layer imposes substantial FLOPs overhead.
   - **IndexShare** reuses a single lightweight indexer across a block of 4 sparse attention layers, reducing per-token computation by **2.9×** at long-horizon context lengths (up to 1,000,000 tokens).
2. **"slime" Asynchronous Reinforcement Learning Infrastructure**:
   - Open-source asynchronous RL framework (`THUDM/slime`) that decouples rollout actors from centralized learner GPUs.
   - Enables ultra-high-throughput post-training over long-horizon, multi-tool trajectories with centralized Actor-Critic value networks and accurate credit assignment.
3. **Hybrid Thinking Mode vs Non-Thinking Mode**:
   - Dynamic mode allocation supporting extended Chain-of-Thought reflection with tool integration (`thinking_mode`) and instant zero-latency single-pass output (`non_thinking_mode`).

## Decision
We integrated GLM-5.3 Flash and Slime RL vector extraction directly into `BroccoliDataLabelingClassifier` and `GalxContracts`:
- `IndexShareSparseAttentionProfile`: Pre-annotates training shards with layer indexer reuse blocks ($4$), FLOPs reduction multiplier ($2.9\times$), and active sparse token ratio ($0.25$).
- `SlimeAsyncRlTrajectoryVector`: Tracks decoupled asynchronous actor-learner rollout status, centralized actor-critic credit weights ($0.88+$), and multi-step tool call horizons.
- `GlmHybridThinkingModeProfile`: Evaluates whether a prompt-completion trajectory belongs in `thinking_mode` (with calibrated reasoning token budgets) or `non_thinking_mode` (for instantaneous high-throughput serving).

## Consequences

### Positive
- **1M-Token Context Optimization**: Datasets are tagged with exact IndexShare parameters to streamline 1-million-token long-context fine-tuning.
- **Asynchronous Actor-Learner Compatibility**: Standardizes multi-turn trajectories for ingestion into Zhipu Slime or Ray/vLLM RL clusters.
- **Zero External Dependencies**: Implemented natively in TypeScript and BroccoliDB in-memory tables without npm dependencies.

## References
- `src/core/contracts/GalxContracts.ts`
- `src/core/training/BroccoliDataLabelingClassifier.ts`
- `tests/r2-training-sync.test.ts`
