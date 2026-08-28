# ❓ Frequently Asked Questions (FAQs)

---

## 🌟 General & Zero-Hesitation Developer Ergonomics

#### 1. What is GALXAI?
GALXAI is an enterprise-grade Universal AI Gateway and zero-hesitation developer execution substrate. It provides high-throughput, low-latency access to flagship reasoning, coding, and visual synthesis models (OpenAI GPT-5.6 Sol, Terra, Luna, and xAI Grok 4.6/4.5) at **20% to 36% below direct retail prices** with **75% prompt caching pass-through** and **sub-15ms edge routing**.

#### 2. What is the "Zero-Hesitation" philosophy?
> *"Our enemy is hesitation — ambiguity is our friend not our enemy, our enemy is developer friction and hesitation, ambiguity is required because they have their own mental model."*

Developers approach AI gateways from dozens of different frameworks, IDEs, and languages. Rather than failing with rigid `400 Bad Request` or `405 Method Not Allowed` errors when encountering casing variations, unquoted keys, raw text bodies, or aspect ratio parameters, GALXAI absorbs developer intent gracefully with **zero friction, zero hesitation, and 100% safe defaults**.

#### 3. How does the Universal Synonym & Model Catalog work?
GALXAI automatically resolves shorthand nicknames, intent aliases, and legacy provider IDs to canonical flagship models:
- `sol`, `gpt-5`, `flagship`, `sota`, `coding`, `gpt-4o`, `claude-3-7-sonnet`, `deepseek-v3` $\to$ **`gpt-5.6-sol`**
- `terra`, `balanced`, `reasoning`, `thinking`, `o1`, `o3-mini`, `deepseek-r1` $\to$ **`gpt-5.6-terra`**
- `luna`, `fast`, `cheap`, `velocity`, `gpt-4o-mini`, `gemini-2.0-flash` $\to$ **`gpt-5.6-luna`**
- `grok`, `grok-4.6`, `grok-1m`, `1m`, `realtime` $\to$ **`x-ai/grok-4.6`**
- `image`, `dall-e-3`, `flux`, `midjourney` $\to$ **`openai-gpt-image-2`**
- Empty strings, `undefined`, or unknown models safely default to **`gpt-5.6-sol`**.

#### 4. Can I use the zero-install CLI without installing anything?
Yes. Simply run `npx galxai "Your prompt here"`. It streams completions to stdout immediately, provides formatted model tables (`npx galxai models`), measures edge ping latency (`npx galxai ping`), and estimates BPE token counts and wholesale dollar savings (`npx galxai tokens "..."`).

#### 5. Can I test completions directly in my web browser?
Yes. The gateway natively supports HTTP `GET` queries:
```text
https://galx.ai/v1/chat/completions?prompt=Hello+GALXAI&model=sol&api_key=galx_live_...
```

#### 6. How does GALXAI handle declarative aspect ratios?
When generating images via `POST /v1/images/generations`, GALXAI automatically converts `aspect_ratio: "16:9"` to `1792x1024`, `9:16` to `1024x1792`, `4:3` to `1024x768`, `3:2` to `1536x1024`, and `1:1` to `1024x1024`.

---

## 🔄 Framework & Multi-Mental-Model Integration

#### 7. Is GALXAI compatible with the OpenAI and Anthropic SDKs?
Yes, 100%. You can either update `baseURL` to `https://galx.ai/v1` or use our dedicated 1:1 drop-in shims:
- `import OpenAI from "@galxai/sdk/openai"`
- `import Anthropic from "@galxai/sdk/anthropic"`
- `import { createGalxAI, galxai } from "@galxai/sdk/ai"` (Vercel AI SDK)
- `import { ChatGalxAI } from "@galxai/sdk/langchain"` (LangChain)
- `import { GalxLLM } from "@galxai/sdk/llamaindex"` (LlamaIndex)

#### 8. Can I use Ollama CLI, OpenWebUI, or Continue.dev?
Yes. Set `export OLLAMA_HOST="https://galx.ai"` and `export OLLAMA_API_KEY="galx_live_..."`. GALXAI natively implements `/api/generate`, `/api/chat`, `/api/tags`, `/api/version`, and `/api/show`.

#### 9. How do Stateful Conversation Threads work?
Using `const thread = galx.thread({ model: 'gpt-5.6-sol', system: '...' })`, the SDK automatically manages conversation turns, pins system instructions, and uses `TokenOptimizer.truncateToFit()` to intelligently prune oldest non-system turns when approaching context limits.

---

## 💰 Pricing, Discounts & Compute Wallet

#### 10. How does GALXAI offer 20%–36% wholesale discounts?
Through high-volume enterprise capacity commitments and zero-overhead edge routing, GALXAI captures wholesale volume pricing and passes direct wholesale rates to developers with **0% markup**.

#### 11. How does the 75% Prompt Caching Rebate work?
For prompts containing system instructions or context prefixes exceeding 1,024 tokens, cached input tokens automatically receive a **75% discount**. GALXAI passes 100% of this rebate directly to your wallet.

#### 12. How does developer billing work?
GALXAI operates a prepaid compute wallet. Every new account receives an initial **$5.00 introductory compute credit**. Deductions are micro-metered in real-time per token.

---

## 🔒 Security, Privacy & Compliance

#### 13. Does GALXAI store or log prompts?
No. GALXAI enforces a strict **Zero Data Retention Policy (ZDR v10.0)**. Prompts and streaming chunks are processed purely in ephemeral memory buffers with 2-pass cryptographic zeroization (`0xAA` -> `0x00`) and are never logged to disk, stored in databases, or used for model training.

#### 14. How does GALXAI handle uptime and failover?
GALXAI provides **high availability infrastructure** backed by sub-15ms automated failover, 4-state circuit breakers, and 300+ global edge Points of Presence ($0 egress bandwidth on Cloudflare R2 `assets.galx.ai`).

---

## 🥦 BroccoliDB Compaction & Inference Boundary Economics

#### 15. What is BroccoliDB and how does it reduce AI inference costs?
BroccoliDB is GALXAI's in-process compaction engine operating at the model input boundary. It supports 19 specialized modes (including 180 domain industry compactors, Drain log clustering, TSDB metrics, eBPF syscalls, K8s watch streams, and geospatial coordinates), stripping non-essential syntax, noisy telemetry, and repetitive boilerplate before prompts reach the LLM.

#### 16. How does BroccoliDB prevent hallucinations in compacted data?
BroccoliDB enforces **fail-closed factual provenance verification** (`BroccoliCompactionSafety`). If a compactor produces any number, date, currency amount, or key entity that did not exist in the raw source input, it immediately triggers a safe fallback to the original raw text. Across our 180-domain regression cluster, it achieves **180 verified compactions and 0 safe fallbacks (100% Pass Rate)** with **77.6% aggregate spend savings**.

#### 17. What is the difference between Compressible Input Spend vs. Non-Compressible Output Floor?
Enterprise AI inference cost decomposes into:
$$\text{Total Billed Cost} = \underbrace{\text{Input Prompt Spend}}_{\text{Compressible by BroccoliDB (85.93\% Saved)}} + \underbrace{\text{Output Generation Spend} + \text{Reasoning (CoT) Spend}}_{\text{Observed Non-Compressible Floor}}$$
BroccoliDB dramatically compresses the input prompt boundary. Output tokens and hidden chain-of-thought tokens represent required task execution and remain an observable non-compressible spend floor.

#### 18. How do I run empirical benchmarks against OpenAI models?
Run the built-in CLI benchmark runner:
```bash
npm run bench:inference-boundary
```
This executes head-to-head empirical tests across `gpt-4o`, `gpt-4o-mini`, and `o3-mini`, measuring exact provider-reported billed dollars, wall-clock latency, and $/success metrics with explicit provenance tags (`LIVE_OPENAI_API` vs `CALIBRATED_OFFLINE_SIMULATION`).

#### 19. What is the Core Representation Thesis of BroccoliDB?
> **Compaction opportunity is a property of the representation, not a fixed property of the model.**
>
> $$\text{Representation} \xrightarrow{\text{Transformation}} \text{Task-Relevant Representation} \xrightarrow{\text{Inference}} \text{Outcome}$$

Tokens and dollars are the observable measurement units at the provider boundary; **representation redundancy** is the governing physical variable. High-redundancy contexts (equilibrium telemetry, repeating ASTs) yield $78\%–95\%$ reduction; dense or already-compressed contexts yield $0\%$ or negative deltas due to framing overhead.

#### 20. Is BroccoliDB a general representation reducer or a framework of specialized reducers?
> **Definition**: *GALX is a pre-inference representation transformation layer that attempts to preserve task-relevant invariants while eliminating representational redundancy.*

Currently, BroccoliDB operates as a **high-performance collection of specialized domain reducers** (180 industry domain compactors, Drain log clusterers, TSDB statistical aggregators, and eBPF kernel analyzers) orchestrated behind a single, safe interface (`BroccoliCompactionFacade`). The ongoing research frontier is extending this into **unsupervised equivalence discovery** where the engine autonomously identifies equivalence classes in novel, unstructured payloads without domain priors.


