# 🧪 Document 05: Training Recipes & Hyperparameters
## Production Configurations for SFT, Slime Asynchronous RL, DPO, and KTO

---

## 1. SFT Warmup Recipe (Axolotl / DeepSpeed)

```yaml
# ============================================================================== #
# GALX-Flash-8B: Axolotl SFT Training Configuration                              #
# Target Base Model: Qwen/Qwen3-8B-Base                                          #
# ============================================================================== #

base_model: Qwen/Qwen3-8B-Base
model_type: AutoModelForCausalLM
tokenizer_type: AutoTokenizer

# Distributed Topology
deepspeed: deepspeed_configs/zero3_bf16.json
fsdp:
fsdp_config:

# Sequence Packing & Context Length
sequence_len: 4096
sample_packing: true
pad_to_sequence_len: true
eval_sample_packing: false

# LoRA Adapters (Rank 32, Alpha 64)
adapter: lora
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# Optimization & Hyperparameters
learning_rate: 0.0002
lr_scheduler: cosine
warmup_ratio: 0.05
min_lr_rate: 0.00001
weight_decay: 0.01
optimizer: adamw_torch_fused
max_grad_norm: 1.0

# Batch Geometry
micro_batch_size: 4
gradient_accumulation_steps: 4
num_epochs: 3

# Precision & Kernel Acceleration
bf16: true
fp16: false
flash_attention: true
gradient_checkpointing: true
gradient_checkpointing_kwargs:
  use_reentrant: false

# Checkpointing & Telemetry
val_set_size: 0.05
eval_steps: 100
save_steps: 250
save_total_limit: 5
wandb_project: galx-flash-8b-sft
wandb_watch: gradients
```

---

## 2. Direct Preference Optimization (DPO) Recipe

```yaml
# ============================================================================== #
# GALX-Flash-8B: DPO Alignment & Length-Debiasing Configuration                   #
# ============================================================================== #

base_model: ./checkpoints/sft_final
model_type: AutoModelForCausalLM
tokenizer_type: AutoTokenizer

loss_type: sigmoid
beta: 0.1
label_smoothing: 0.0
learning_rate: 0.000005
lr_scheduler: cosine
warmup_ratio: 0.1
weight_decay: 0.0

sequence_len: 4096
max_prompt_len: 2048
max_completion_len: 2048

micro_batch_size: 2
gradient_accumulation_steps: 8
num_epochs: 2
bf16: true
flash_attention: true

# Length-Debiasing Penalty
length_normalization: true
reference_free: false
```

---

## 3. 1-Click Python Training Script (`Unsloth / TRL`)

```python
"""
GALX-Flash-8B: 1-Click Fast SFT Runner via Unsloth & TRL
"""

import os
import requests
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# 1. Fetch Presigned Dataset URLs from Cloudflare R2
res = requests.get("https://api.galx.ai/api/internal/training?format=presigned_urls")
splits = res.json()["splits"]
train_urls = [shard["url"] for shard in splits["train"]]
val_urls = [shard["url"] for shard in splits["validation"]]

# 2. Initialize Foundation Model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen3-8B-Base",
    max_seq_length=4096,
    dtype=None,
    load_in_4bit=False,
)

# 3. Attach LoRA Adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=64,
    lora_dropout=0.05,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# 4. Stream Dataset Shards
dataset = load_dataset("json", data_files={"train": train_urls, "validation": val_urls})

# 5. Execute Training Loop
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    dataset_text_field="messages",
    max_seq_length=4096,
    packing=True,
    args=TrainingArguments(
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_ratio=0.05,
        num_train_epochs=3,
        learning_rate=2e-4,
        bf16=True,
        logging_steps=10,
        save_strategy="steps",
        save_steps=250,
        output_dir="outputs/galx_flash_8b",
    ),
)

if __name__ == "__main__":
    trainer.train()
    model.save_pretrained_merged("checkpoints/galx_flash_8b_merged", tokenizer, save_method="merged_16bit")
```
