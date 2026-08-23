# 🧠 Next-Gen Reasoning Models Developer Guide

A comprehensive technical guide for developing with GALXAI's flagship reasoning engines: `gpt-5.6-sol`, `gpt-5.6-terra`, and `x-ai/grok-4.5`.

---

## 1. Understanding Reasoning Engines

Unlike traditional autoregressive chat models that generate output tokens immediately, reasoning engines employ internal multi-step **Chain of Thought (CoT)** reasoning before producing visible response tokens.

```
Incoming Prompt
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│            Hidden Reasoning Phase (CoT)                 │
│  - Mathematical derivation & theorem verification       │
│  - Hypothesis testing & recursive branch pruning        │
│  - Edge-case analysis & self-correction loops          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
               Visible Completion Stream
```

---

## 2. Parameter Tuning & Best Practices

### A. Temperature & Top-P Recommendations
- **Recommended**: Keep `temperature` at **`1.0`** (or omitted) for reasoning models.
- **Why**: Lowering temperature can interfere with the model's internal exploration and hypothesis verification in the reasoning phase.

### B. Output Token Allocation (`max_completion_tokens`)
Reasoning models count both internal reasoning tokens and visible output tokens toward the output limit:
- Always set `max_completion_tokens` (or `max_tokens`) sufficiently high (e.g. $\ge 4096$) for complex logic, math, or refactoring tasks.

---

## 3. Python Implementation Example

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY", "galx_live_your_key_here")
)

# Stream reasoning output
stream = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {
            "role": "user",
            "content": (
                "Solve the following constraint satisfaction problem: "
                "Schedule 6 microservices across 3 Kubernetes nodes with anti-affinity, "
                "memory limits (Node A: 16GB, Node B: 32GB, Node C: 64GB), and minimal inter-node latency."
            )
        }
    ],
    stream=True
)

for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)
```

---

## 4. Reasoning Models Comparison

| Model ID | Provider | Context Window | Max Output | Reasoning Strength | Latency Profile | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-5.6-sol` | OpenAI | $900,000$ | $32,768$ | **Maximum (Apex)** | Deep Exploration ($\sim 3-10\text{s}$ TTFT) | Complex Math, Compilers, Architecture Design |
| `gpt-5.6-terra` | OpenAI | $900,000$ | $16,384$ | **High (Balanced)** | Fast ($\sim 1-3\text{s}$ TTFT) | Automated CI/CD, Code Review, Agent Planning |
| `x-ai/grok-4.6` | xAI Grok | $1,000,000$ | $128,000$ | **Maximum (Apex)** | Ultra-Scale ($\sim 2-4\text{s}$ TTFT) | 1M Extreme Document Reasoning, Tool Orchestration |
| `x-ai/grok-4.5` | xAI Grok | $500,000$ | $32,768$ | **Maximum (Apex)** | High-Throughput ($\sim 2-5\text{s}$ TTFT) | 500K Massive Document Search, Multimodal Logic |
