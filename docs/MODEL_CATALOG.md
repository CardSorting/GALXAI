# 🧠 GALXAI Model Catalog & Modality Specification

GALXAI exclusively routes traffic across 12 flagship models spanning advanced reasoning, lightweight code synthesis, and multi-resolution visual generation.

---

## 1. Flagship Reasoning & LLM Fleet

### 🌟 `gpt-5.6-sol` (OpenAI Flagship Deep Reasoning)
- **Primary Use Case**: Complex mathematics, architectural planning, multi-step formal reasoning, large-scale codebase refactoring.
- **Context Window**: $900,000$ tokens
- **Max Output Tokens**: $32,768$ tokens
- **Modality Support**: Text, Vision, Reasoning CoT, JSON Schema, Function Calling, Streaming.
- **Pricing**: Input: **$2.25** / 1M tokens (25% off list $3.00) \| Output: **$9.00** / 1M tokens (25% off list $12.00).

---

### 🌍 `gpt-5.6-terra` (OpenAI Balanced General Intelligence)
- **Primary Use Case**: High-velocity agentic workflows, conversational assistants, continuous CI/CD automated review.
- **Context Window**: $900,000$ tokens
- **Max Output Tokens**: $16,384$ tokens
- **Modality Support**: Text, Vision, Function Calling, Streaming.
- **Pricing**: Input: **$1.15** / 1M tokens (23% off list $1.50) \| Output: **$4.60** / 1M tokens (23% off list $6.00).

---

### 🌙 `gpt-5.6-luna` (OpenAI High-Speed Lightweight Engine)
- **Primary Use Case**: Real-time autocomplete, intent routing, low-latency streaming chat, high-throughput text classification.
- **Context Window**: $900,000$ tokens
- **Max Output Tokens**: $8,192$ tokens
- **Modality Support**: Text, Structured Outputs, Streaming.
- **Pricing**: Input: **$0.11** / 1M tokens (27% off list $0.15) \| Output: **$0.45** / 1M tokens (25% off list $0.60).

---

### ⚡ `x-ai/grok-4.6` (xAI Grok 4.6 Frontier Multimodal & Reasoning)
- **Primary Use Case**: Massive 1M context analysis, frontier reasoning, autonomous tool execution, complex document synthesis.
- **Context Window**: $1,000,000$ tokens
- **Max Output Tokens**: $128,000$ tokens
- **Modality Support**: Text, Vision, Streaming, Code Generation, Tool Calling.
- **Pricing**: Input: **$2.10** / 1M tokens (30% off list $3.00) \| Output: **$8.40** / 1M tokens (30% off list $12.00).

---

### ⚡ `x-ai/grok-4.5` (xAI Grok Reasoning & Vision Flagship)
- **Primary Use Case**: Massive 500K context analysis, multi-document synthesis, visual data extraction, advanced logic puzzles.
- **Context Window**: $500,000$ tokens
- **Max Output Tokens**: $32,768$ tokens
- **Modality Support**: Text, Vision, Streaming, Code Generation.
- **Pricing**: Input: **$1.80** / 1M tokens (28% off list $2.50) \| Output: **$7.20** / 1M tokens (28% off list $10.00).

---

## 2. Visual Synthesis & Image Generation Fleet

| Model ID | Provider | Max Resolution | Quality Tiers | Formats Supported | GALXAI Price / Image | List Price | Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `openai-gpt-image-2` | OpenAI | $1024 \times 1024$ | Standard, HD | URL, Base64 JSON | **$0.060** | $0.080 | **25% OFF** |
| `openai-gpt-image-1.5` | OpenAI | $1024 \times 1024$ | Standard, HD | URL, Base64 JSON | **$0.045** | $0.060 | **25% OFF** |
| `openai-gpt-image-1` | OpenAI | $1024 \times 1024$ | Standard | URL, Base64 JSON | **$0.030** | $0.040 | **25% OFF** |
| `openai-gpt4o-image` | OpenAI | $1024 \times 1024$ | Standard, HD | URL, Base64 JSON | **$0.038** | $0.050 | **24% OFF** |
| `openai-dalle-3` | OpenAI | $1024 \times 1024$ | Standard, HD | URL, Base64 JSON | **$0.032** | $0.040 | **20% OFF** |
| `openai-dalle-2` | OpenAI | $512 \times 512$ | Standard | URL, Base64 JSON | **$0.016** | $0.020 | **20% OFF** |
| `xai-grok-image` | xAI Grok | $1024 \times 1024$ | Standard, HD | URL | **$0.037** | $0.050 | **26% OFF** |
| `xai-grok-2-image` | xAI Grok | $1024 \times 1024$ | Standard | URL | **$0.030** | $0.040 | **25% OFF** |

---

## 3. Canonical Aliasing & Automatic Normalization

The router automatically normalizes common short-hand aliases to their canonical model identifiers:

| Shorthand Alias | Canonical Resolved Model ID |
| :--- | :--- |
| `sol`, `gpt-sol`, `gpt-5-sol` | `gpt-5.6-sol` |
| `terra`, `gpt-terra` | `gpt-5.6-terra` |
| `luna`, `gpt-luna` | `gpt-5.6-luna` |
| `grok`, `grok-4.6`, `xai/grok-4.6`, `xai-grok-4.6` | `x-ai/grok-4.6` |
| `grok-4.5`, `xai/grok-4.5`, `xai-grok-4.5` | `x-ai/grok-4.5` |
| `dalle-3`, `dall-e-3` | `openai-dalle-3` |
| `dalle-2`, `dall-e-2` | `openai-dalle-2` |
| `grok-image`, `grok-imagine` | `xai-grok-image` |
