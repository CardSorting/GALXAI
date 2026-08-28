# 💻 GALXAI Multi-Ecosystem SDK & CLI Cheatsheet

Complete drop-in code snippets for connecting any major AI framework, SDK, CLI, or programming language to GALXAI.

---

## ⚡ 1. Zero-Install Developer CLI (`npx galxai`)

Run directly in terminal without installing dependencies:

```bash
# 1. Fast streaming prompt execution
npx galxai "Explain token bucket rate limiting in 10 words"

# 2. Targeted model execution
npx galxai run "Audit distributed lock implementation" --model terra

# 3. Model catalog overview with context windows & discount rates
npx galxai models

# 4. 0ms Alias resolution test
npx galxai resolve claude-3-7-sonnet

# 5. Token count & wholesale dollar savings calculation
npx galxai tokens "Sample 50-page document text..."

# 6. Anycast edge latency ping test
npx galxai ping

# 7. Interactive terminal REPL
npx galxai chat
```

---

## 🖼️ 2. Ambient Declarative AI & React UI (`@galxai/sdk/ui`, `@galxai/sdk/actions`)

```tsx
// 1. Declarative React UI (No API routes, no state code)
import { GalxImage, GalxChat } from '@galxai/sdk/ui';

export function Studio() {
  return (
    <>
      <GalxImage prompt="Cyberpunk skyline" aspectRatio="16:9" interactive />
      <GalxChat model="gpt-5.6-sol" placeholder="Ask questions..." />
    </>
  );
}

// 2. Direct Server Action (Zero-route Next.js 15 RPC)
import { generateImageAction } from '@galxai/sdk/actions';
const res = await generateImageAction('Neon avatar', { aspectRatio: '1:1' });

// 3. Zero-File Edge Middleware (middleware.ts)
import { galxaiMiddleware } from '@galxai/sdk/middleware';
export default galxaiMiddleware();
export const config = { matcher: ['/api/galxai/:path*', '/api/generate', '/api/chat', '/api/models'] };

// 4. Zero-Migration Auto-Patcher (Reroutes existing OpenAI code)
import '@galxai/sdk/patch';
import OpenAI from 'openai';
const openai = new OpenAI(); // Automatically routed to GALXAI Wholesale Gateway
```

---

## 🚀 3. Top-Level 1-Line Helpers & Stateful Threads (`@galxai/sdk`)

```typescript
import { run, galx, batch, thread, fallback, race, extract, embed, estimateTokens } from '@galxai/sdk';

// 1. Ultra-fast 1-line execution
const answer = await run('Explain quantum mechanics in simple terms');

// 2. Tagged template literal
const summary = await galx`Summarize the key takeaways for ${topic}`;

// 3. Stateful multi-turn conversation thread with auto-truncation
const conv = thread({ model: 'gpt-5.6-sol', system: 'You are a staff engineer.' });
const reply1 = await conv.reply('What is an LSM Tree?');
const reply2 = await conv.reply('How does it differ from a B-Tree?');

// 4. 100x high-throughput concurrent batch mapper
const summaries = await batch(
  ['Doc 1 text...', 'Doc 2 text...'],
  (doc) => `Summarize: ${doc}`,
  { concurrency: 10 }
);

// 5. Automatic multi-model fallback cascade
const result = await fallback(['gpt-5.6-sol', 'x-ai/grok-4.6', 'gpt-5.6-terra'], 'High priority task');

// 6. Multi-model race (fastest engine wins)
const fastestReply = await race(['gpt-5.6-luna', 'gpt-5.6-sol'], 'Speed-critical query');

// 7. Structured schema extraction
const user = await extract('Jane Doe, 29, Engineer in SF', {
  name: 'string',
  age: 'number',
  city: 'string'
});

// 8. Vector embeddings (1536-dim)
const embedding = await embed('Zero-egress edge routing');
console.log(embedding.data[0].embedding.length); // 1536

// 9. BroccoliDB Data Compaction (70% - 98% Token Reduction)
import { compact } from '@galxai/sdk';
const compacted = compact('PROPOUNDING PARTY: Plaintiff Acme...', 'Interrogatory');
console.log(compacted.compactedPrompt, `Saved ${compacted.tokensSaved} tokens`);
```

---

## 🔄 3. 1:1 Framework-Native Drop-In Compatibility Shims

### 1. OpenAI Node.js / TypeScript SDK (100% Drop-In)
```typescript
import OpenAI from '@galxai/sdk/openai';

const openai = new OpenAI(); // Auto-reads GALX_API_KEY from environment

const stream = await openai.chat.completions.create({
  model: 'gpt-5.6-sol', // or 'gpt-4o', 'sol', 'flagship'
  messages: [{ role: 'user', content: 'Write an atomic lock in TypeScript.' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### 2. Anthropic SDK & Claude Code (100% Drop-In)
```typescript
import Anthropic from '@galxai/sdk/anthropic';

const anthropic = new Anthropic();

const response = await anthropic.messages.create({
  model: 'claude-3-7-sonnet', // Automatically mapped to flagship SOTA
  max_tokens: 2048,
  system: 'You are a systems architect.',
  messages: [{ role: 'user', content: 'Design a distributed rate limiter.' }],
});

console.log(response.content[0].text);
```

### 3. Vercel AI SDK Core & Next.js App Router
```typescript
import { createGalxAI, galxai } from '@galxai/sdk/ai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai('gpt-5.6-sol'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### 4. LangChain Swarms & Runnables
```typescript
import { ChatGalxAI } from '@galxai/sdk/langchain';

const llm = new ChatGalxAI({
  model: 'gpt-5.6-sol',
  temperature: 0.2,
  streaming: true,
});

for await (const chunk of await llm.stream('Audit smart contract')) {
  process.stdout.write(chunk.content);
}
```

### 5. LlamaIndex RAG & Agent Pipelines
```typescript
import { GalxLLM } from '@galxai/sdk/llamaindex';

const llm = new GalxLLM({ model: 'gpt-5.6-sol' });
const response = await llm.complete('Summarize vector-indexed codebase.');
console.log(response.text);
```

---

## 💾 4. Database & Session Memory KV (`galx.db`)

Persist session memory, scratchpad tokens, and agent scratchpad states with sub-microsecond in-memory lookups:

```typescript
import { galx } from '@galxai/sdk';

// 1. Remember structured memory with optional TTL
galx.db.remember('session_user_42', { authenticated: true, role: 'admin' }, 3600_000);

// 2. Recall memory state
const session = galx.db.recall<{ authenticated: boolean; role: string }>('session_user_42');
console.log(session?.role); // 'admin'

// 3. Forget memory key
galx.db.forget('session_user_42');
```

---

## 🐍 5. Python Ecosystem

### Standard OpenAI Python SDK
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY", "galx_live_your_key_here")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain continuous token caching."}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### LangChain Python
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_key_here"
)

result = llm.invoke("Summarize the benefits of pooled quota cycling.")
print(result.content)
```

---

## 🦙 6. Ollama CLI & OpenWebUI

```bash
export OLLAMA_HOST="https://galx.ai"
export OLLAMA_API_KEY="galx_live_your_key_here"

curl https://galx.ai/api/generate \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d '{
    "model": "sol",
    "prompt": "Hello GALXAI from Ollama CLI",
    "stream": true
  }'
```

---

## 🌊 7. Stream Protocol Adapters

```typescript
import { toTextStream, toTextStreamResponse, toDataStreamResponse, toSSEResponse } from '@galxai/sdk';

// 1. Text Stream (Web ReadableStream)
const readable = toTextStream(asyncGenerator);

// 2. Text Stream Response (text/plain)
const textRes = toTextStreamResponse(asyncGenerator);

// 3. Vercel AI SDK Data Stream Response (text/plain; x-vercel-ai-data-stream: v1)
const dataRes = toDataStreamResponse(asyncGenerator);

// 4. Server-Sent Events SSE Response (text/event-stream)
const sseRes = toSSEResponse(asyncGenerator);
```

---

## 🥦 8. BroccoliDB Context Compaction Cheatsheet

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

// 1. Domain Compaction (180 industry domains, fail-closed safety gate)
const legal = BroccoliCompactionFacade.compactDomain(discoveryText, 'Interrogatory');
console.log(`Saved ${legal.tokensSaved} tokens (${legal.savingsPercentage}%)`);

// 2. Linux Kernel eBPF Telemetry Stream
const ebpf = BroccoliCompactionFacade.compact({
  mode: 'ebpf_stream',
  events: syscallEvents,
});

// 3. Kubernetes Watch Stream Compaction
const k8s = BroccoliCompactionFacade.compact({
  mode: 'k8s_watch_stream',
  events: k8sWatchDeltas,
});

// 4. 2,000+ Page Outage Storm Cascader (57ms)
const incident = BroccoliCompactionFacade.compactIncident({
  rawStreamText: logStormText,
  targetTokenBudget: 4096,
  incidentTitle: 'Production DB Failover',
});

// 5. Run Empirical OpenAI Boundary Benchmark
// npm run bench:inference-boundary
```

