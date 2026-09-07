# 🧠 GALXAI Universal Model Catalog & Modality Specification

GALXAI exclusively routes traffic across modern flagship LLMs, reasoning engines, vector embeddings, and visual synthesis models with **20%–36% wholesale discounts** and **75% prompt caching rebates**.

---

## 1. Flagship Reasoning, Coding & LLM Fleet

| Model ID | Name & Target Specialization | Context Window | Max Output | Input / 1M | Output / 1M | Cached Input / 1M | Wholesale Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gpt-5.6-sol`** | Flagship SOTA: Coding, deep mathematics, multi-file architecture | $900,000$ | $128,000$ | **$3.75** | **$15.00** | **$1.25** | **25% OFF** |
| **`gpt-5.6-terra`** | Balanced Frontier: High-throughput reasoning & general intelligence | $900,000$ | $64,000$ | **$2.25** | **$9.00** | **$0.75** | **25% OFF** |
| **`gpt-5.6-luna`** | High-Velocity: Intent routing and autocomplete; measure latency for the workload | $900,000$ | $32,000$ | **$0.95** | **$3.80** | **$0.30** | **36% OFF** |
| **`x-ai/grok-4.6`** | 1M Frontier: Multimodal vision, realtime analysis, tool calling | $1,000,000$ | $128,000$ | **$2.10** | **$8.40** | **$0.70** | **30% OFF** |
| **`x-ai/grok-4.5`** | 500K Frontier: Visual data extraction, code generation & analysis | $500,000$ | $32,768$ | **$1.80** | **$7.20** | **$0.60** | **28% OFF** |

---

## 2. Visual Synthesis & Image Generation Fleet

| Model ID | Provider | Max Resolution | Aspect Ratios Supported | Formats | GALXAI Price | List Price | Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`openai-gpt-image-2`** | OpenAI Codex | $3840 \times 2160$ | `16:9`, `9:16`, `4:3`, `3:2`, `1:1` | URL, Base64 | **$0.060** | $0.080 | **25% OFF** |
| **`openai-gpt-image-1.5`** | OpenAI Codex | $1024 \times 1024$ | `16:9`, `9:16`, `1:1` | URL, Base64 | **$0.045** | $0.060 | **25% OFF** |
| **`openai-gpt-image-1`** | OpenAI Codex | $1024 \times 1024$ | `1:1` | URL, Base64 | **$0.028** | $0.040 | **30% OFF** |
| **`xai-grok-image`** | xAI Imagine 1.0 | $1024 \times 1024$ | `16:9`, `9:16`, `1:1` | URL | **$0.038** | $0.050 | **24% OFF** |
| **`xai-grok-2-image`** | xAI Grok-2 Image | $1024 \times 1024$ | `1:1` | URL | **$0.028** | $0.040 | **30% OFF** |

---

## 3. Universal Synonym & Mental Model Normalization

The router automatically resolves developer shorthands and external model IDs to the optimal canonical target:

| Input Alias / Synonym Pattern | Canonical Resolved Target | Rationale |
| :--- | :--- | :--- |
| `sol`, `gpt-5`, `gpt5`, `flagship`, `sota`, `best`, `smart`, `coding`, `agent`, `auto`, `default`, `latest` | `gpt-5.6-sol` | Flagship coding & reasoning intent |
| `gpt-4o`, `gpt-4`, `chatgpt-4o`, `claude-3-7-sonnet`, `claude-3-5-sonnet`, `deepseek-v3`, `gemini-2.5-pro` | `gpt-5.6-sol` | Drop-in frontier model replacement |
| `terra`, `balanced`, `reasoning`, `reasoner`, `thinking`, `o1`, `o1-mini`, `o3`, `o3-mini`, `deepseek-r1` | `gpt-5.6-terra` | Balanced reasoning intent |
| `luna`, `fast`, `flash`, `speed`, `turbo`, `cheap`, `velocity`, `instant`, `autocomplete`, `gpt-4o-mini`, `gemini-2.0-flash` | `gpt-5.6-luna` | High-velocity low-latency intent |
| `grok`, `grok-4.6`, `xai-grok`, `grok-1m`, `1m`, `realtime`, `live`, `grok-3` | `x-ai/grok-4.6` | 1M Context Frontier Reasoning |
| `image`, `generate-image`, `dall-e-3`, `midjourney`, `flux`, `photoreal` | `openai-gpt-image-2` | Visual synthesis intent |
| `""` (empty), `undefined`, `null`, unknown model string | `gpt-5.6-sol` | Safe default fallback |

---

## 4. Automated Suffix & Prefix Stripping

The gateway automatically strips lifecycle suffixes and provider prefixes before matching:
- **Prefixes Removed**: `openai/`, `x-ai/`, `anthropic/`, `google/`, `meta/`, `deepseek/`, `galx/`, `galxai/`, `@openai/`, `@anthropic/`
- **Suffixes Removed**: `:latest`, `-latest`, `-preview`, `-2026-08-01`, `@20260801`
- **Formatting Variations**: `gpt-5-6-sol` $\to$ `gpt-5.6-sol`

---

## 5. Rate Card Registry for Empirical Inference Boundary Evaluation

For head-to-head empirical testing (`BroccoliInferenceBoundaryBenchmarker`), GALXAI maintains an authoritative **OpenAI Rate Card Registry** (`ProviderRateCards.ts`) to calculate billed dollars directly from provider `response.usage` payloads:

| Model ID | Display Name | Input / 1M USD | Cached Input / 1M USD (50% Discount) | Output / 1M USD | Output Multiplier | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`gpt-4o`** | OpenAI GPT-4o (Omni) | **$2.50** | **$1.25** | **$10.00** | $4.0\times$ | Standard flagship multimodal LLM |
| **`gpt-4o-mini`** | OpenAI GPT-4o Mini | **$0.15** | **$0.075** | **$0.60** | $4.0\times$ | High-velocity sub-150ms utility LLM |
| **`o3-mini`** | OpenAI o3-mini | **$1.10** | **$0.55** | **$4.40** | $4.0\times$ | Frontier reasoning with hidden CoT |
| **`o1`** | OpenAI o1 (Full) | **$15.00** | **$7.50** | **$60.00** | $4.0\times$ | High-capacity deep reasoning engine |
| **`gpt-4-turbo`** | OpenAI GPT-4 Turbo | **$10.00** | **$5.00** | **$30.00** | $3.0\times$ | Legacy 128K context model |

Run the empirical benchmark harness against these rate cards:
```bash
npm run bench:inference-boundary
```

---

## 6. Representation Selection & Model Input Economics (ADR 0066 & 0067)

Different model families exhibit varying sensitivity to representation structure:
- **Reasoning Models (`o3-mini`, `o1`, `gpt-5.6-terra`)**: Reasoning tokens (internal CoT) and output tokens represent a non-compressible spend floor. Compacting input representations (e.g. 85.9% reduction) maximizes dollar ROI on the input boundary while leaving reasoning steps fully intact.
- **Adaptive Density Gate ($\text{ID}(C)$)**: For prompt inputs $<200$ tokens, compaction is bypassed, preserving clean baseline prompts with $0.0\%$ token dilation.
- **Institutional Noise Resilience**: Reasoning models exposed to conflicting historical context suffer steep task degradation ($100\% \to 20\%$ Action Safety). `BroccoliArchitectureInvariantCompactor` filters out superseded ADRs and RFC ceremonies, preserving **$100\%$ Action Safety** on `npm run bench:entropy`.


