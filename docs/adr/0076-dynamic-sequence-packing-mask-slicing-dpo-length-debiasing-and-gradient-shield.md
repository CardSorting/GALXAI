# ADR 0076: Dynamic Sequence Packing Mask Slicing, Online DPO Length Debiasing & Loss-Truncated Gradient Shielding

## Status
`Accepted`

## Context
Industrial-scale LLM post-training encounters three distinct throughput and stability challenges:
1. **Sequence Packing Overhead**: Packing multiple variable-length samples into a single 4k/8k/32k sequence requires precise 2D block-diagonal attention mask boundaries and cumulative token offsets to prevent cross-sample contamination in FlashAttention kernels.
2. **Preference Length-Hacking**: Standard DPO and RLHF reward functions are susceptible to verbosity exploitation ("length bias"), where models generate overly wordy answers to game rewards.
3. **Catastrophic Gradient Spikes**: Pathological outliers, corrupted control tokens, or severe loss spikes can destabilize distributed training runs across hundreds of GPUs.

## Decision
We introduced three specialized training substrate vectors in `GalxContracts` and `BroccoliDataLabelingClassifier`:
- `SequencePackingMaskSlicingProfile`: Computes 1D cumulative sequence boundary offsets (`[0, promptLen, totalLen]`) for block-diagonal 2D attention mask compilation.
- `OnlineDpoLengthDebiasingProfile`: Applies length penalty weights ($0.12$) to calculate debiased reward margins, neutralizing length bias.
- `LossTruncatedGradientShieldVector`: Defines upper-quantile loss bounds ($4.5$) and pre-screens samples for structural anomalies (unclosed fences, control characters, repetition loops) to shield GPU/TPU clusters.

## Consequences

### Positive
- **Zero Padding Waste**: Enables 100% token-dense sequence packing without padding tokens or attention leakage.
- **Robust Alignment**: Eliminates verbosity hacking during Direct Preference Optimization (DPO).
- **Cluster Protection**: Prevents numerical NaN/Inf gradient blowups during large-scale pretraining and fine-tuning.

## References
- `src/core/contracts/GalxContracts.ts`
- `src/core/training/BroccoliDataLabelingClassifier.ts`
- `tests/r2-training-sync.test.ts`
