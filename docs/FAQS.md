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

#### 6. How does GALXAI handle Midjourney / Flux aspect ratios?
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
