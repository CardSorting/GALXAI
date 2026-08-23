# 🌌 GALXAI: The Wholesale AI Compute Clearinghouse

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/CardSorting/GALXAI)
[![Zero-Hesitation Ergonomics Tests](https://img.shields.io/badge/ergonomics%20audit-98%2F98%20passing%20(100%25)-success.svg)](https://github.com/CardSorting/GALXAI)
[![Edge Route Parity](https://img.shields.io/badge/edge%20routes-121%2F121%20passing-success.svg)](https://github.com/CardSorting/GALXAI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

> **Stop paying retail token prices and suffering rate-limit stalls.**  
> GALXAI is a **wholesale compute clearinghouse** that slashes your monthly AI bills by **25%–40%**, passes through **75% prompt caching**, and delivers **active failover resilience with zero rate-limit stalls**—with **zero code modifications**.

---

## 🎯 The 4 Jobs Developers Hire GALXAI To Do

Instead of building another derivative "gateway rectangle," GALXAI eliminates the four most painful, expensive bottlenecks in generative AI engineering:

```mermaid
mindmap
  root((GALXAI Jobs To Be Done))
    1. Cut Token Bills 25%-40%
      Direct wholesale clearinghouse
      100% prompt cache pass-through (75% discount)
      1-line drop-in baseURL swap
      No prompt refactoring needed
    2. Zero Rate-Limit Stalls
      Zero 429 stalls on AI agent swarms
      Sub-1ms automatic failover
      Multi-region Anycast routing
    3. Universal Single-Wallet Pass
      One balance for Cursor, Windsurf, Claude Code, Python
      Zero minimum enterprise commitments
      Instant prepaid compute packs
    4. Zero-Hesitation Execution
      npx galxai instant terminal prompt
      Browser URL execution GET /v1/chat/completions
      Raw text cURL with zero 400 errors
```

### 1. 💰 Job 1: Slash LLM Bills by 25%–40% (The Economic Job)
* **The Pain**: You are burning $2,000–$50,000/mo on frontier LLMs (`gpt-5.6-sol`, `grok-4.6`). You cannot afford $100k+ upfront enterprise sales commits, so you pay full retail list prices.
* **The Solution**: Change your `baseURL` to `https://galx.ai/v1`. Your exact same app now runs at **wholesale tier rates (25%–40% off)** with **75% prompt cache pass-through**. No prompt rewrites, no model degradation.

### 2. 🛡️ Job 2: Zero Rate Limit Stalls (The Reliability Job)
* **The Pain**: Your autonomous coding agent, document extraction pipeline, or batch RAG job crashes in production with `429 Too Many Requests` when bursts occur.
* **The Solution**: Automatic high-availability failover reroutes traffic in `<1ms`, ensuring **active multi-region resilience** and zero rate-limit stalls.

### 3. 💳 Job 3: Single Universal Developer Pass (The Tooling Job)
* **The Pain**: You want to use Cursor, Windsurf, Claude Code CLI, and backend scripts across OpenAI, Anthropic, and xAI without maintaining 4 separate billing accounts and expired credit cards.
* **The Solution**: One API key (`galx_live_...`) and one shared wallet balance powers all your favorite developer tools and SOTA models seamlessly.

### 4. ⚡ Job 4: Zero-Hesitation Execution (The Developer Friction Job)
* **The Pain**: You want to test a quick prompt in a terminal script, bash pipeline, or browser tab without writing 20 lines of client boilerplate or debugging 400 parameter errors.
* **The Solution**: Run `npx galxai "Explain token caching"` instantly, test directly in your browser address bar (`GET /v1/chat/completions?prompt=...`), or send raw text cURL payloads.

---

## 🏛️ Sub-15ms Ingestion & Routing Architecture

```mermaid
flowchart LR
    Client[Client / Cursor / Agent / CLI] -->|HTTPS Anycast Edge| Ingress[Cloudflare Edge PoPs: 300+ Cities]
    
    subgraph Edge Layer
        Ingress -->|Auth & Bloom Filter < 0.8ms| FastAuth[Edge Key Verification]
        FastAuth -->|RAM Prefix Match < 0.4ms| Cache[75% Prompt Cache Hit]
    end
    
    subgraph Clearinghouse Core
        FastAuth -->|Miss| Router[GalxModelRouter]
        Router -->|2-Phase Soft Reserve| Reserve[Sub-Microsecond Token Governor]
        Router -->|Intelligent Channel Routing| Channels[Upstream Enterprise Capacity]
        Router -->|4-State Circuit Breaker| Breaker[Automatic Failover Substrate]
    end
    
    Channels -->|Zero-Copy Stream < 12ms TTFT| Client
```

---

## ⚡ Zero-Install CLI (`npx galxai`)

Execute completions, test models, estimate token savings, and measure edge latency without installing packages or configuring TypeScript:

| Command | Action Performed | Typical Output / Latency |
| :--- | :--- | :--- |
| `npx galxai "Prompt"` | Instant streaming completion (GPT-5.6 Sol) | Streams to stdout (~140 tok/s) |
| `npx galxai run "Prompt" --model terra` | Targeted execution on reasoning model | Structured chain-of-thought |
| `npx galxai models` | Active model catalog, context windows & wholesale rates | Formatted CLI pricing table |
| `npx galxai tokens "500-page doc"` | Count BPE tokens and compute wholesale savings | BPE token count + dollar savings |
| `npx galxai ping` | Measure sub-15ms Anycast edge gateway latency | Edge PoP roundtrip (~12ms) |
| `npx galxai chat` | Interactive REPL with stateful history | Terminal multi-turn chat |

---

## 🚀 Flagship Model Fleet & Wholesale Rates

| Model ID | Target Specialization | Context Window | Max Output | Input / 1M | Output / 1M | Cached Input / 1M | Wholesale Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gpt-5.6-sol`** | Flagship SOTA: Coding, math, multi-file architecture | $900,000$ | $128,000$ | **$3.75** | **$15.00** | **$1.25** | **25% OFF** |
| **`gpt-5.6-terra`** | Balanced Frontier: High-throughput reasoning & logic | $900,000$ | $64,000$ | **$2.25** | **$9.00** | **$0.75** | **25% OFF** |
| **`gpt-5.6-luna`** | High-Velocity: Sub-15ms completions, autocomplete | $900,000$ | $32,000$ | **$0.95** | **$3.80** | **$0.30** | **36% OFF** |
| **`x-ai/grok-4.6`** | 1M Frontier: Multimodal vision, realtime analysis | $1,000,000$ | $128,000$ | **$2.10** | **$8.40** | **$0.70** | **30% OFF** |
| **`x-ai/grok-4.5`** | 500K Frontier: Visual data extraction, code analysis | $500,000$ | $32,768$ | **$1.80** | **$7.20** | **$0.60** | **28% OFF** |
| **`openai-gpt-image-2`**| Ultra 4K Visual Synthesis (`16:9`, `9:16`, `1:1`) | $128,000$ | — | **$0.060**/img | — | — | **25% OFF** |
| **`text-embedding-3-small`**| Vector Embeddings (1536-dim, Edge $<12\text{ms}$) | $8,191$ | — | **$0.015** | **$0.000** | — | **25% OFF** |

---

## 💻 30-Second IDE Quickstart (Cursor & Windsurf)

1. Open **Cursor Settings** $\to$ **Models** $\to$ **Add Model**: `gpt-5.6-sol` (or `x-ai/grok-4.6`).
2. Enable **Override OpenAI Base URL**:
   ```text
   https://galx.ai/v1
   ```
3. Paste your `galx_live_...` API key into the **API Key** field.
4. Done! All completions in Cursor now run at 25%–40% wholesale discount with 75% prompt cache pass-through.

---

## 📦 Quickstart: 1-Line Universal TypeScript SDK (`@galxai/sdk`)

```bash
npm install @galxai/sdk
```

```typescript
import { run, galx, batch, thread, fallback, race, extract } from '@galxai/sdk';

// 1. Ultra-fast 1-line execution
const answer = await run("Explain continuous token caching concisely.");

// 2. Tagged template literal
const greeting = await galx`Hello ${"GALXAI"}, explain zero-hesitation developer ergonomics`;

// 3. Stateful multi-turn conversation thread with auto-truncation
const conv = thread({ model: 'gpt-5.6-sol', system: 'You are a staff engineer.' });
const reply1 = await conv.reply("How does Raft consensus work?");
const reply2 = await conv.reply("How does it handle network partitions?");

// 4. 100x high-throughput concurrent batch mapper
const summaries = await batch(
  ["Article 1 content...", "Article 2 content..."],
  (article) => `Summarize key takeaways: ${article}`,
  { concurrency: 10 }
);

// 5. Automatic multi-model fallback cascade
const robustResult = await fallback(['gpt-5.6-sol', 'x-ai/grok-4.6', 'gpt-5.6-terra'], "Mission critical query");

// 6. Structured schema extraction
const user = await extract("John Doe, age 32, lives in San Francisco", {
  name: "string",
  age: "number",
  city: "string"
});
```

---

## 🔄 1:1 Framework-Native Drop-In Shims

### Python (OpenAI Drop-In)
```python
from openai import OpenAI

# 100% Drop-in: Only point baseURL to GALXAI
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain continuous token caching."}]
)
print(response.choices[0].message.content)
```

### OpenAI Node / TypeScript SDK
```typescript
import OpenAI from "@galxai/sdk/openai";

const openai = new OpenAI();
const stream = await openai.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Write an atomic lock in TypeScript." }],
  stream: true,
});
```

### Anthropic SDK & Claude Code
```typescript
import Anthropic from "@galxai/sdk/anthropic";

const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: "claude-3-7-sonnet",
  max_tokens: 2048,
  system: "You are a systems architect.",
  messages: [{ role: "user", content: "Design a distributed queue." }],
});
```

### Vercel AI SDK
```typescript
import { createGalxAI, galxai } from "@galxai/sdk/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({ model: galxai("gpt-5.6-sol"), messages });
  return result.toDataStreamResponse();
}
```

### LangChain Swarms
```typescript
import { ChatGalxAI } from "@galxai/sdk/langchain";
const llm = new ChatGalxAI({ model: "gpt-5.6-sol", streaming: true });
```

---

## 🌐 Instant Browser URL & Terminal cURL Testing

```bash
# Direct Browser Testing:
https://galx.ai/v1/chat/completions?prompt=Hello+GALXAI&model=sol&api_key=galx_live_your_key_here

# Direct cURL with raw text payload (zero 400 errors):
curl -X POST https://galx.ai/v1/chat/completions \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d "Explain gravity in 10 words"
```

---

## 🏛️ Comprehensive Documentation & Architectural Guides

Explore our complete documentation library in [`docs/`](docs/README.md):
- **[Documentation Sitemap Index](docs/README.md)**: Master directory of all guides and specifications.
- **[50 Architecture Decision Records (ADRs)](docs/adr/README.md)**: Comprehensive architectural specifications covering security, resilience, pSEO/AEO saturation, and zero-hesitation developer ergonomics.
- **[Go-To-Market & Value Positioning](docs/GTM_STRATEGY.md)**: Product positioning, competitive analysis, and JTBD framework.
- **[Interactive Developer Studio Tools Suite](src/app/tools)**: In-browser tools for Prompt Caching, BPE Token Counting, JSON Schema to Zod/Pydantic, Function Calling, and Model Cost Comparisons.
- **[AI Incident Postmortems Hub](src/app/postmortems)**: Verifiable root cause analyses, sub-second failover runbooks, and SLA guarantees.
- **[Flagship Model Catalog & Wholesale Rates](docs/MODEL_CATALOG.md)**
- **[Pricing & 4-Pillar Discount Strategy](docs/PRICING_AND_DISCOUNT_STRATEGY.md)**
- **[Multi-Ecosystem SDK Cheatsheet](docs/SDK_CHEATSHEET.md)**
- **[Quickstart Integration Guide](docs/QUICKSTART.md)**
- **[Universal API Reference](docs/API_REFERENCE.md)**
- **[Performance Benchmarks & Stress Analysis](docs/BENCHMARKS.md)**
- **[Frequently Asked Questions (FAQs)](docs/FAQS.md)**
- **[System Architecture Specification](docs/ARCHITECTURE.md)**

---

## 🧪 Verification & Audit

Run the platform-wide zero-hesitation verification suite:
```bash
npx tsx scripts/verify-zero-hesitation-ergonomics.ts
# 🏁 AUDIT RESULTS: 98 / 98 TESTS PASSED (100%)
```

---

## 📄 License
MIT © 2026 GALXAI Inc.
