# 🛠️ Document 06: Operational Execution Runbook
## Step-by-Step Operator Handbook, Telemetry & Anomaly Playbooks

---

## 1. Step-by-Step Operator Checklist

Follow these exact operational steps to launch and manage the **GALX-Flash-8B** training run:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GALX-Flash-8B Operator Flow                           │
│                                                                             │
│ [1. Pre-Flight] ──> [2. Compaction] ──> [3. Cluster Provision] ──> [4. SFT] │
│                                                                     │       │
│ [7. Canary] <──── [6. Quantize] <──── [5. Slime RL & DPO] <─────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stage 1: Pre-Flight Health Probe

Before launching GPU compute instances, execute the comprehensive diagnostic probe to verify dataset consistency:

```bash
# Run the 10-Pillar Invariant Test Suite
npm run test:training

# Run the 6-Stage Cloudflare R2 Storage Probe
npm run r2:bootstrap

# Deep verification of Gzip decompression and Merkle proof trees
npm run r2:verify
```

---

## 3. Stage 2: Shard Compaction

Trigger autonomous compaction to merge micro-shards into optimal 50MB–250MB shards:

```bash
curl -X POST "http://localhost:3000/api/internal/training" \
  -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "compact"}'
```

---

## 4. Stage 3: GPU Cluster Launch & SFT Execution

```bash
# 1. SSH into the 8x H100 GPU Node
ssh ubuntu@<H100_CLUSTER_IP>

# 2. Fetch Axolotl Training Configuration
curl -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  "https://api.galx.ai/api/internal/training?format=axolotl_yaml" > axolotl_train.yaml

# 3. Launch Multi-GPU Training via Accelerate
accelerate launch \
  --num_processes=8 \
  --mixed_precision=bf16 \
  -m axolotl.cli.train axolotl_train.yaml
```

---

## 5. Live Telemetry & Loss Anomaly Monitoring

### Key Telemetry Signals to Track in WandB:
- **Gradient Norm**: Should fluctuate between `0.4` and `1.2`. If $\text{norm} > 5.0$, gradient clipping is active.
- **Validation Loss**: Should steadily decrease toward $\le 0.85$.
- **Learning Rate Curve**: Cosine warmup for the first 5% of steps, decaying to $1\times 10^{-5}$.

---

## 6. Anomaly Playbooks & Emergency Recovery

### Playbook A: Loss Spike / Gradient Explosion (NaN)
1. **Immediate Halt**: Press `Ctrl+C` or issue `kill -9 $(pgrep -f axolotl)`.
2. **Rollback**: Resume from the last saved clean checkpoint:
   ```bash
   accelerate launch -m axolotl.cli.train axolotl_train.yaml --resume_from_checkpoint=./checkpoints/checkpoint-500
   ```
3. **Hyperparameter Adjustment**: Halve the learning rate (`learning_rate: 0.0001`) and increase warmup ratio (`warmup_ratio: 0.10`).

### Playbook B: Dead-Letter Queue (DLQ) Drain
If transient network errors caused failed shard uploads during continuous sync:
```bash
curl -X POST "http://localhost:3000/api/internal/training" \
  -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "replay_dlq"}'
```
