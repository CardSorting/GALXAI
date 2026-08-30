# 🏆 Document 07: Evaluation & Deployment Gate
## Benchmark Acceptance Matrix, Quantization & vLLM Canary Release

---

## 1. Benchmark Acceptance Matrix (GLM-5.3 Flash Parity Gate)

Before the model can graduate to production, it must pass the automated benchmark suite with scores equal to or exceeding the **GLM-5.3 Flash & GPT-4o-mini baseline**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  GALX-Flash-8B Benchmark Acceptance Targets                 │
├────────────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│ Benchmark Suite    │ Domain Focus │ Base Model   │ GLM-5.3 Flash│ GALX Target│
├────────────────────┼──────────────┼──────────────┼──────────────┼────────────┤
│ HumanEval          │ Python Code  │ 68.4%        │ 85.2%        │ ≥ 86.5%    │
│ GSM8K              │ Grade Math   │ 79.5%        │ 91.0%        │ ≥ 92.0%    │
│ MATH-500           │ Olympiad Math│ 44.2%        │ 62.8%        │ ≥ 64.0%    │
│ SWE-bench Lite     │ Real-world SE│ 18.2%        │ 34.5%        │ ≥ 36.0%    │
│ MMLU-Pro           │ Reasoning    │ 52.0%        │ 66.8%        │ ≥ 68.0%    │
│ IFEval             │ Instructions │ 76.0%        │ 88.0%        │ ≥ 89.5%    │
│ P99 Latency (TTFT) │ Response Time│ 110ms        │ 55ms         │ ≤ 45ms     │
│ Throughput (INT4)  │ Velocity     │ 90 tok/s     │ 120 tok/s    │ ≥ 140 tok/s│
└────────────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

---

## 2. Quantization Workflow (INT4 AWQ & GGUF)

Convert the FP16/BF16 merged transformer weights into high-throughput edge inference formats:

### 2.1 GGUF Export (for Consumer GPUs & Apple Silicon Mac)
```bash
# 1. Convert Hugging Face weights to GGUF format
python llama.cpp/convert_hf_to_gguf.py ./checkpoints/galx_flash_8b_final --outtype q8_0

# 2. Quantize to Q4_K_M (Optimal size/perplexity balance)
./llama.cpp/llama-quantize ./checkpoints/galx_flash_8b_final/ggml-model-q8_0.gguf ./models/galx_flash_8b_q4_k_m.gguf Q4_K_M
```

### 2.2 AutoAWQ Export (for vLLM Server Inference)
```bash
python -c "
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model_path = './checkpoints/galx_flash_8b_final'
quant_path = './models/galx_flash_8b_awq'

model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

model.quantize(tokenizer, quant_config={'zero_point': True, 'q_group_size': 128, 'w_bit': 4, 'version': 'GEMM'})
model.save_quantized(quant_path)
tokenizer.save_pretrained(quant_path)
print('AWQ Quantization Complete!')
"
```

---

## 3. Production vLLM Deployment & 5% Canary Release

Deploy the quantized model to the vLLM serving pool:

```bash
vllm serve ./models/galx_flash_8b_awq \
  --quantization awq \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.92 \
  --enable-chunked-prefill \
  --port 8000
```

### Canary Traffic Gating:
1. Update Cloudflare Workers Edge Gateway to route **5% of incoming traffic** targeting `galx-reason-1` to the new `GALX-Flash-8B` worker pool.
2. Monitor real-time error rates, P99 TTFT, and user feedback (DPO/KTO swiping).
3. If error rate $<0.01\%$ over 24 hours, ramp traffic: $5\% \to 25\% \to 100\%$.
