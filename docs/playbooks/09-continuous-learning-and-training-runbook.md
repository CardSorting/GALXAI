# 🛠️ Playbook 09: Continuous Learning & Model Post-Training Runbook
## Operational Handbook for ML Engineers & Training Operators

---

## 1. Overview & Operational Scope

This runbook defines the exact operational workflow for executing post-training runs (**GALX-Flash-8B**) against our Cloudflare R2 autonomous dataset pipeline. It covers pre-flight probes, shard compaction, remote cluster launching, Slime RL Docker sandboxing, checkpoint ingestion, quantization, and canary release gates.

---

## 2. Stage 1: Local Pre-Flight & Dataset Health Probe

Before provisioning GPU hardware, verify that in-memory buffers and R2 datasets are healthy, deduplicated, and Merkle-sealed:

```bash
# 1. Run the authoritative 10-Pillar Invariant Test Suite
npm run test:training

# 2. Run the R2 Diagnostic Probe & Checkpoint Health Check
npm run r2:bootstrap

# 3. Verify Dataset Integrity, Compression & Presigned URLs
npm run r2:verify
```

### Verification Criteria:
- `10/10 Invariant Pillars Passed`
- `0% PII Leakage`
- `Merkle Tree Root Valid`
- `Presigned URLs reachable with HTTP 200/206`

---

## 3. Stage 2: Shard Compaction & Dataset Sealing

Merge fragmented micro-shards into optimal 50MB–250MB training shards:

```bash
# Trigger atomic shard compaction via REST API
curl -X POST "http://localhost:3000/api/internal/training" \
  -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "compact"}'
```

---

## 4. Stage 3: Remote GPU Cluster Provisioning & SFT Launch

### 4.1 Export Target Training Recipe
Fetch the auto-generated configuration tailored for your training engine:

```bash
# Axolotl YAML
curl "http://localhost:3000/api/internal/training?format=axolotl_yaml" > axolotl_train.yaml

# Meta Torchtune YAML
curl "http://localhost:3000/api/internal/training?format=torchtune_yaml" > torchtune_recipe.yaml

# 1-Click Unsloth Python Script
curl "http://localhost:3000/api/internal/training?format=unsloth_py" > train_unsloth.py
```

### 4.2 Launch SFT on 8x H100 SXM5 Node
```bash
# Using Accelerate with DeepSpeed ZeRO-3 / FSDP
accelerate launch \
  --num_processes=8 \
  --mixed_precision=bf16 \
  -m axolotl.cli.train axolotl_train.yaml
```

---

## 5. Stage 4: Slime Asynchronous RL Execution (Code & Math Verifiers)

Deploy the decoupled Docker execution environment for programmatic reward evaluation:

```bash
# 1. Start sandboxed Python/Rust execution workers
docker run -d --name galx-code-sandbox \
  --cpus=16 --memory=64g \
  --security-opt no-new-privileges \
  -v /tmp/eval_workspace:/workspace \
  galxai/code-eval-sandbox:latest

# 2. Run Slime RL training loop with programmatic reward signal
python -m slime.train \
  --model_path ./checkpoints/sft_final \
  --reward_server http://localhost:8080/evaluate \
  --epochs 2 \
  --lr 1e-6
```

---

## 6. Stage 5: Checkpoint Ingestion & Merkle Notarization

Once training completes, sync the final model adapter or merged weights back to R2:

```bash
# Upload final model checkpoint with Merkle manifest sealing
curl -X POST "http://localhost:3000/api/internal/training" \
  -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync", "type": "all"}'
```

---

## 7. Stage 6: INT4 AWQ & GGUF Quantization

Convert merged weights into high-velocity edge formats:

```bash
# 1. Export GGUF (Q4_K_M for consumer GPU / Apple Silicon Mac)
python llama.cpp/convert_hf_to_gguf.py ./checkpoints/galx_flash_8b_final --outtype q8_0
./llama.cpp/llama-quantize ./checkpoints/galx_flash_8b_final/ggml-model-q8_0.gguf ./models/galx_flash_8b_q4_k_m.gguf Q4_K_M

# 2. Export AutoAWQ (4-bit GPU inference for vLLM)
python -c "
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model = AutoAWQForCausalLM.from_pretrained('./checkpoints/galx_flash_8b_final')
tokenizer = AutoTokenizer.from_pretrained('./checkpoints/galx_flash_8b_final')
model.quantize(tokenizer, quant_config={'zero_point': True, 'q_group_size': 128, 'w_bit': 4, 'version': 'GEMM'})
model.save_quantized('./models/galx_flash_8b_awq')
"
```

---

## 8. Stage 7: vLLM Deployment & 5% Canary Release

Deploy the quantized model to the production vLLM inference worker pool:

```bash
# Launch vLLM with IndexShare sparse attention & AWQ
vllm serve ./models/galx_flash_8b_awq \
  --quantization awq \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.92 \
  --enable-chunked-prefill \
  --port 8000
```

### Canary Traffic Gating:
Update the Cloudflare Workers router to send 5% of `/v1/chat/completions` traffic targeting `galx-reason-1` to the new worker endpoint and monitor error rates in real-time.

---

## 9. Emergency Rollback Protocol

If the canary model encounters anomalous error spikes ($>0.5\%$ 5xx errors or $>150\text{ms}$ TTFT):
1. **Immediate Traffic Reversion**: Shift 100% traffic back to the stable baseline model (`gpt-5.6-sol` / upstream fallback).
2. **Buffer Quarantine**: Run `DELETE /api/internal/training` to wipe corrupted volatile batches.
3. **DLQ Replay**: Re-ingest clean datasets via `npm run r2:bootstrap`.
