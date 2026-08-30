# 🚀 GALXAI Foundation Model Training Suite: Master Directory
## Complete Technical Blueprint & Operational Manual for `GALX-Flash-8B`

> **Strategic Objective**: Train and deploy **GALX-Flash-8B**—a high-density, compact foundation model delivering **GLM-5.3 Flash & GPT-4o-mini level reasoning, coding, and mathematical performance** at $>140\text{ tokens/sec}$ on consumer hardware with **$0 bandwidth egress cost** via the GALXAI Cloudflare R2 continuous learning pipeline.

---

## 🏛️ Documentation Suite Sitemap

| Document | Title & Focus | Key Contents |
|---|---|---|
| **[00. Apex Strategy Overview](00_APEX_SYNTHETIC_CURATION_AND_STRATEGY_OVERVIEW.md)** | Executive Architecture & Strategy Overview | Complete technical blueprint of the 7-phase training lifecycle, $O(1)$ SimHash dedup, Slime RL programmatic rewards, and benchmark decision gates. |
| **[01. Strategy & Target Goal](01_STRATEGY_AND_TARGET_GOAL.md)** | Core Strategic Objectives & Competitive Moats | GLM-5.3 Flash parity thesis, 2026 base model selection (`Qwen3-8B-Base`), IndexShare sparse attention, and zero-egress streaming economics. |
| **[02. Timeframe & Sprint Milestones](02_TIMEFRAME_AND_SPRINT_MILESTONES.md)** | 16-Day 7-Phase Execution Timeline | Chronological Gantt chart, daily sprint schedules, and quantitative Go/No-Go milestone quality gates. |
| **[03. Dataset & Curriculum Specification](03_DATASET_AND_CURRICULUM_SPECIFICATION.md)** | 4-Tier Curriculum & Data Engine Flywheel | 200K+ sample stratification, CoT distillation from 671B teacher models, PII scrubbing, SimHash dedup, and SHA-256 Merkle sealing. |
| **[04. Hardware & Infrastructure Setup](04_HARDWARE_AND_INFRASTRUCTURE_SETUP.md)** | Compute Topology & Cloudflare R2 Streaming | 8x NVIDIA H100 SXM5 provisioning on Lambda/RunPod, Slime Docker code verifier sandbox, and $0 egress SigV4 streaming architecture. |
| **[05. Training Recipes & Hyperparameters](05_TRAINING_RECIPES_AND_HYPERPARAMETERS.md)** | Production Training Configuration Specs | Exact YAML and Python recipes for Axolotl SFT, Slime Asynchronous RL, Length-Debiased DPO, and KTO alignment. |
| **[06. Operational Execution Runbook](06_OPERATIONAL_EXECUTION_RUNBOOK.md)** | Step-by-Step Operator Handbook | Pre-flight probes (`npm run r2:verify`), shard compaction, remote GPU launch commands, WandB telemetry, and emergency loss rollback playbooks. |
| **[07. Evaluation & Deployment Gate](07_EVALUATION_AND_DEPLOYMENT_GATE.md)** | Benchmarks, Quantization & Edge Release | MMLU-Pro, GSM8K, HumanEval, SWE-bench Lite audit suite, INT4 AWQ/GGUF quantization, and vLLM 5% canary traffic deployment. |

---

## ⚡ Quick-Start CLI Commands

```bash
# 1. Verify Dataset Invariants & Cloudflare R2 Shard Health
npm run r2:verify

# 2. Execute 10-Pillar Master Adversarial Test Suite
npm run test:training

# 3. Export Target Training Configuration (Axolotl / Torchtune / Unsloth)
curl -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" "https://api.galx.ai/api/internal/training?format=axolotl_yaml" > axolotl_train.yaml
curl -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" "https://api.galx.ai/api/internal/training?format=torchtune_yaml" > torchtune_recipe.yaml
curl -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" "https://api.galx.ai/api/internal/training?format=unsloth_py" > train_unsloth.py
```
