# 🚀 GALXAI Quickstart: The 4 Jobs Integration Guide

Connect your AI tools, frameworks, agent swarms, and IDEs to GALXAI in under 30 seconds. Eliminate generic gateway friction and immediately unlock **25%–40% wholesale discounts**, **75% prompt cache pass-through**, and **active Anycast failover with zero rate-limit stalls**.

---

## 🎯 Which Job Do You Need Solved?

```mermaid
graph TD
    A[Start Here] --> B{What is your primary goal?}
    B -->|Slash OpenAI/Anthropic Bills| C[1-Line Drop-in Python / Node SDK]
    B -->|Stop Agent 429 Rate Limit Stalls| D[Automatic High-Availability Failover]
    B -->|Cursor / Windsurf / Claude Code| E[Single Universal AI Wallet]
    B -->|Instant Terminal & Bash Prompts| F[Zero-Install CLI: npx galxai]
```

---

## ⚡ 1. Zero-Install CLI (`npx galxai`)

Run completions, test models, estimate token savings, and measure edge latency directly from your terminal with **no packages to install**:

```bash
# 1. Run immediate streaming completion (Flagship GPT-5.6 Sol)
npx galxai "Explain continuous token caching in 10 words"

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

## 💻 2. Cursor & Windsurf IDE (Single-Wallet Setup)

1. Open **Cursor Settings** $\to$ **Models** $\to$ **Add Model**: `gpt-5.6-sol` (or `x-ai/grok-4.6`).
2. Enable **Override OpenAI Base URL**:
   ```text
   https://galx.ai/v1
   ```
3. Paste your `galx_live_...` API key into the **API Key** field.
4. Enjoy continuous 25%–40% wholesale savings and 75% prompt cache pass-through on every prompt!

---

## 🐍 3. Python (OpenAI Drop-In)

Keep your existing `openai>=1.0.0` library without installing new dependencies:

```python
from openai import OpenAI

# 100% Drop-in: Only change base_url and api_key
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain continuous token caching concisely."}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

## 🤖 4. Anthropic SDK & Claude Code CLI

```typescript
import Anthropic from "@anthropic-ai/sdk";

// 100% Drop-in: Only change baseURL
const anthropic = new Anthropic({
  baseURL: "https://galx.ai",
  apiKey: process.env.GALX_API_KEY || "galx_live_your_key_here",
});

const message = await anthropic.messages.create({
  model: "gpt-5.6-sol", // or claude-3-7-sonnet alias
  max_tokens: 2048,
  messages: [{ role: "user", content: "Design a fault-tolerant distributed queue." }],
});

console.log(message.content[0].text);
```

---

## 📦 5. Universal 1-Line TypeScript / Node SDK (`@galxai/sdk`)

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

## 🌐 6. Instant Browser URL & cURL Testing

### Browser Address Bar Direct Query
Test directly in your web browser with zero tooling:
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
