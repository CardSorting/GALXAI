# 🧪 Document 05: Training Recipes & Hyperparameters
## Production Configurations for Axolotl, Meta Torchtune, LLaMA-Factory, and StreamingDataset

---

## 1. Production Meta Torchtune Recipe (`torchtune_recipe.yaml`)

```yaml
# ============================================================================== #
# GALX-Flash-8B: Meta Torchtune Official LoRA Recipe                             #
# ============================================================================== #

# Model Configuration
model:
  _component_: torchtune.models.llama3_1.lora_llama3_1_8b
  lora_attn_modules: ['q_proj', 'v_proj', 'k_proj', 'output_proj']
  apply_lora_to_mlp: true
  apply_lora_to_output: false
  lora_rank: 32
  lora_alpha: 64
  lora_dropout: 0.05

# Tokenizer
tokenizer:
  _component_: torchtune.models.llama3_1.llama3_1_tokenizer
  path: checkpoints/tokenizer.model

# Optimizer & LR Schedule
optimizer:
  _component_: torch.optim.AdamW
  lr: 2.0e-4
  fused: true
  weight_decay: 0.01

lr_scheduler:
  _component_: torchtune.modules.get_cosine_schedule_with_warmup
  num_warmup_steps: 100

# Training Hyperparameters
batch_size: 4
epochs: 3
max_steps_per_epoch: null
gradient_accumulation_steps: 4
dtype: bf16
enable_activation_checkpointing: true

# Zero-Egress Cloudflare R2 Streaming Dataset
dataset:
  _component_: torchtune.datasets.instruct_dataset
  source: json
  data_files: https://datasets.galx.ai/datasets/manifest.json.gz
  split: train
```

---

## 2. Production LLaMA-Factory Configuration (`llama_factory_train.yaml`)

```yaml
# ============================================================================== #
# GALX-Flash-8B: LLaMA-Factory Multi-GPU Training Configuration                  #
# ============================================================================== #

model_name_or_path: Qwen/Qwen3-8B-Base
stage: sft
do_train: true
finetuning_type: lora
lora_target: all
lora_rank: 32
lora_alpha: 64

dataset: galxai_sft_stream
dataset_dir: ./data
template: qwen
cutoff_len: 4096
packing: true

output_dir: ./saves/galx_flash_8b/sft
logging_steps: 10
save_steps: 250
plot_loss: true
overwrite_output_dir: true

per_device_train_batch_size: 4
gradient_accumulation_steps: 4
learning_rate: 0.0002
num_train_epochs: 3.0
lr_scheduler_type: cosine
warmup_ratio: 0.05
bf16: true
flash_attn: fa2
```

---

## 3. MosaicML StreamingDataset Python Loader (`StreamingDataLoader.py`)

```python
"""
MosaicML StreamingDataset: Zero-Disk PyTorch Shard Streaming from Cloudflare R2
"""

from streaming import StreamingDataset
from torch.utils.data import DataLoader
import transformers

class GalxR2StreamingDataset(StreamingDataset):
    def __init__(self, remote_url: str, local_scratch: str, split: str):
        super().__init__(
            remote=remote_url,
            local=local_scratch,
            split=split,
            shuffle=True,
            predownload=64, # Prefetch 64 shards in shared memory
            batch_size=4,
        )

    def __getitem__(self, idx: int):
        sample = super().__getitem__(idx)
        return {
            "input_ids": sample["input_ids"],
            "attention_mask": sample["attention_mask"],
            "labels": sample["labels"],
        }

def create_streaming_loader(split: str = "train", batch_size: int = 4) -> DataLoader:
    dataset = GalxR2StreamingDataset(
        remote_url="https://datasets.galx.ai/datasets/microbatches/v1",
        local_scratch="/tmp/galx_scratch",
        split=split,
    )
    return DataLoader(dataset, batch_size=batch_size, num_workers=4, pin_memory=True)
```

---

## 4. Mathematical Learning Rate Schedule Formulation

Learning rate $\eta_t$ at training step $t \in [0, T]$ follows a cosine decay with warm restart suppression:

$$\eta_t = \begin{cases} 
\eta_{\text{min}} + \frac{t}{T_{\text{warm}}} (\eta_{\text{max}} - \eta_{\text{min}}), & t \le T_{\text{warm}} \\ 
\eta_{\text{min}} + \frac{1}{2} (\eta_{\text{max}} - \eta_{\text{min}}) \left(1 + \cos\left(\frac{t - T_{\text{warm}}}{T - T_{\text{warm}}} \pi\right)\right), & t > T_{\text{warm}} 
\end{cases}$$

Where:
- $\eta_{\text{max}} = 2.0 \times 10^{-4}$ (Maximum learning rate).
- $\eta_{\text{min}} = 1.0 \times 10^{-5}$ (Floor learning rate).
- $T_{\text{warm}} = 0.05 \cdot T$ (5% Linear warmup ratio).
- Weight decay $\lambda = 0.01$ is **strictly excluded** for all 1D bias vectors and LayerNorm gain/offset parameters.
