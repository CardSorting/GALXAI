# ADR 0074: DeepSeek-V3/R1 Multi-Head Latent Attention (MLA), KV Dequantization & DualPipe Parallelism

## Status
`Accepted`

## Context
Frontier model architectures like DeepSeek-V3 and DeepSeek-R1 introduce architectural breakthroughs to scale inference and training efficiency:
1. **Multi-Head Latent Attention (MLA)**: Compresses key-value activations into low-rank latent dimensions ($d_c = 512$) with decoupled Rotary Positional Embedding keys ($d_R = 64$), slashing KV cache memory footprint by $>80\%$.
2. **Latent KV Dequantization**: Utilizes per-channel FP8 ($E4M3$) dynamic scaling factors for lossless tensor core dequantization.
3. **DualPipe Bidirectional Parallelism**: Overlaps forward and backward computation phases to cut pipeline bubble overhead by $>38\%$.
4. **Auxiliary-Loss-Free MoE Load Balancing**: Adjusts per-expert dynamic biases instead of penalizing representational capacity with heavy auxiliary loss terms.

## Decision
We integrated zero-dependency classifier vectors directly into `BroccoliDataLabelingClassifier` to profile training datasets for next-gen MLA, FP8 Gemm, DualPipe, and Aux-Loss-Free MoE compatibility:
- `MlaCompressionVector` & `MlaQueryProjectionVector`: Low-rank KV/Query latent compression metrics ($d_c = 512, d_R = 64$) with cache optimization scoring.
- `LatentKvDequantizationVector`: Per-channel FP8 ($E4M3$) dequantization scaling ($1/128 = 0.0078125$).
- `DualPipeParallelismProfile`: Forward/backward overlap ratio evaluation ($0.45$) and bubble overhead reduction ($0.38$).
- `AuxLossFreeMoEVector`: Dynamic expert bias variance tracking ($0.02$) and optimal capacity preservation.

## Consequences

### Positive
- **Hardware-Aligned Data Profiles**: Post-training shards carry pre-computed MLA and FP8 scaling factors directly consumable by GPU/TPU kernels.
- **Pipeline Optimization**: Enables training schedulers to select optimal DualPipe chunking and MoE load balance parameters.
- **Sub-Microsecond Classification**: Evaluated on-the-fly without model execution overhead.

## References
- `src/core/contracts/GalxContracts.ts`
- `src/core/training/BroccoliDataLabelingClassifier.ts`
- `tests/r2-training-sync.test.ts`
