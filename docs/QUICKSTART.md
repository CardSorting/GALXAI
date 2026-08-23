# 🚀 GALXAI Quickstart & Universal Integration Guide

Connect your AI tools, frameworks, agent swarms, and IDEs to the GALXAI Universal Gateway in under 30 seconds with **25%–40% wholesale compute discounts**, **75% prompt cache pass-through**, and **zero developer friction**.

---

## ⚡ 1. Zero-Install CLI (No Package Install Needed)

Test inference, estimate tokens, list models, and measure edge latency directly from your terminal:

```bash
# 1. Run immediate streaming completion (Flagship GPT-5.6 Sol)
npx galxai "Explain token bucket rate limiting in 15 words"

# 2. Run target reasoning model
npx galxai run "Audit distributed lock implementation" --model terra

# 3. List all models, context windows, and wholesale rates
npx galxai models

# 4. Count BPE tokens and calculate dollar savings
npx galxai tokens "500-page earnings report..."

# 5. Measure sub-15ms Anycast edge gateway latency
npx galxai ping

# 6. Start interactive terminal chat REPL
npx galxai chat
```

---

## 📦 2. Universal 1-Line TypeScript / Node SDK (`@galxai/sdk`)

```bash
npm install @galxai/sdk
```

```typescript
import { run, galx, batch, thread, fallback, race, extract } from '@galxai/sdk';

// 1. Ultra-fast 1-liner
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

## 🔄 3. 1:1 Framework-Native Drop-In Compatibility Shims

Migrate existing codebases with **zero code refactoring** by swapping only the import:

### OpenAI Node SDK (100% Drop-In)
```typescript
// Replace: import OpenAI from "openai";
import OpenAI from "@galxai/sdk/openai";

const openai = new OpenAI(); // Auto-reads GALX_API_KEY from environment

const completion = await openai.chat.completions.create({
  model: "gpt-5.6-sol", // or 'gpt-4o', 'sol', 'flagship'
  messages: [{ role: "user", content: "Write a high-performance LRU cache." }],
  stream: true,
});

for await (const chunk of completion) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

### Anthropic SDK & Claude Code (100% Drop-In)
```typescript
// Replace: import Anthropic from "@anthropic-ai/sdk";
import Anthropic from "@galxai/sdk/anthropic";

const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: "claude-3-7-sonnet", // Automatically mapped to flagship SOTA
  max_tokens: 2048,
  system: "You are a systems architect.",
  messages: [{ role: "user", content: "Design a fault-tolerant message queue." }],
});

console.log(message.content[0].text);
```

### Vercel AI SDK Core & UI
```typescript
import { createGalxAI, galxai } from "@galxai/sdk/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai("gpt-5.6-sol"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### LangChain Swarms & Runnables
```typescript
import { ChatGalxAI } from "@galxai/sdk/langchain";

const llm = new ChatGalxAI({
  model: "gpt-5.6-sol",
  temperature: 0.2,
  streaming: true,
});

for await (const chunk of await llm.stream("Audit this smart contract")) {
  process.stdout.write(chunk.content);
}
```

### LlamaIndex RAG Pipelines
```typescript
import { GalxLLM } from "@galxai/sdk/llamaindex";

const llm = new GalxLLM({ model: "gpt-5.6-sol" });
const response = await llm.complete("Summarize indexed document repository.");
console.log(response.text);
```

---

## 🦙 4. Ollama CLI, OpenWebUI & Continue.dev Integration

Point any local AI interface directly to GALXAI without installing local weights:

```bash
# Export Ollama environment variables
export OLLAMA_HOST="https://galx.ai"
export OLLAMA_API_KEY="galx_live_your_key_here"

# Native Ollama API Call
curl https://galx.ai/api/generate \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d '{
    "model": "sol",
    "prompt": "Explain zero-hesitation architecture",
    "stream": true
  }'
```

---

## 🌐 5. Instant Browser URL & cURL Testing

### Browser Address Bar Direct Query
Test directly in your web browser with zero tools:
```text
https://galx.ai/v1/chat/completions?prompt=Hello+GALXAI&model=sol&api_key=galx_live_your_key_here
```

### Hyper-Forgiving Terminal cURL
```bash
# 1. Standard OpenAI SSE streaming
curl https://galx.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}],
    "stream": true
  }'

# 2. Raw text payload (automatically converted to chat message with zero 400 errors)
curl -X POST https://galx.ai/v1/chat/completions \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d "Explain gravity in 10 words"
```

---

## 🎨 6. Multi-Paradigm Visual Synthesis ($0 Egress R2 CDN)

Accepts Midjourney/Flux aspect ratios or discrete pixel dimensions:

```bash
curl https://galx.ai/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d '{
    "model": "flux",
    "prompt": "Cyberpunk skyscraper with neon holo-gardens at sunset",
    "aspect_ratio": "16:9"
  }'
```

*(Supported aspect ratios: `16:9` $\to$ `1792x1024`, `9:16` $\to$ `1024x1792`, `4:3` $\to$ `1024x768`, `3:2` $\to$ `1536x1024`, `1:1` $\to$ `1024x1024`)*

---

## 💻 7. Cursor & Windsurf IDE Setup

1. Open **Cursor Settings** $\to$ **Models** $\to$ **Add Model**: `gpt-5.6-sol` (or `x-ai/grok-4.6`).
2. Enable **Override OpenAI Base URL**:
   ```text
   https://galx.ai/v1
   ```
3. Paste your `galx_live_...` API key into the **API Key** field.
4. Enjoy continuous 25%–40% wholesale savings and 75% prompt cache pass-through on every prompt!
