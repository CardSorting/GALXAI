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
import { GalxImage } from '@galxai/sdk/ui';

export function Studio() {
  return (
    <GalxImage prompt="Cyberpunk skyline" aspectRatio="16:9" interactive />
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

## 🚀 3. Touchless 1-Line Developer API (`galx`)

> **Full Documentation Guide**: See [docs/DEVELOPER_CLIENT_SDK.md](DEVELOPER_CLIENT_SDK.md) for the complete, exhaustive reference.

```typescript
import { galx } from 'galxai';

// 1. Touchless Visual Synthesis with prompt auto-sensing (16:9 + HD) & direct saving
const img = await galx.image('A cinematic landscape of the Himalayas in 4k');
console.log(img.url); // Direct property (no data[0].url digging)
await img.save('./himalayas.png');

// 2. Real-time progressive diffusion streaming
for await (const progress of galx.image.stream('A neon cyber samurai')) {
  console.log(`Denoising: ${progress.percentage}%`);
}

// 3. Touchless image inpainting & variations
const edited = await galx.image.edit('./portrait.png', 'Add cybernetic sunglasses');
const variation = await galx.image.variation('./logo.png');

// 4. Touchless model resolution & inspection (zero hardcoded strings)
const defaultModel = await galx.model();            // Resolves 'gpt-5.6-sol'
const isAvailable  = await galx.model.has('gpt-5.6-sol');
const allNames     = await galx.model.names();
const visionModels = await galx.model.search('vision');

// 5. Side-by-side pricing matrix & optimal model recommendation
const comparison   = await galx.model.compare('gpt-5.6-sol', 'gpt-5.6-terra');
const optimal      = await galx.model.optimal({ minContextWindow: 128000, reasoningRequired: true });

// 6. Touchless 1-line text completion with string coercion
const answer = await galx.complete('Explain quantum computing in 1 sentence');
console.log(answer.text); // or `${answer}`

// 7. Touchless 1-line token streaming
for await (const chunk of galx.stream('Write a haiku about clean code')) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// 8. Real-time streaming throughput diagnostics (TTFT & TPS)
const stream = galx.chat.completions.stream({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain thermodynamics' }]
});
stream.pipeThrough(token => token.toUpperCase());
await stream;
console.log(`TTFT: ${stream.metrics.timeToFirstTokenMs}ms | TPS: ${stream.metrics.tokensPerSecond}`);

// 9. Semantic vector caching with sub-0.05ms retrieval
// Queries with similar semantics return from BroccoliPromptCache instantly
const res1 = await galx.complete('Reverse linked list in Python');
const res2 = await galx.complete('How to reverse Python linked list?'); // Retrieved in 0.04ms

// 10. Checkpoints & Deterministic Offline Replay Harness
const cp = await galx.checkpoints.create('pre-experiment');
galx.replay.startRecording('agent_flow');
// run test suite...
galx.replay.stopRecording();
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

## 🥦 8. BroccoliDB Representation Selection & Compaction Cheatsheet

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

// 1. Dynamic Representation Selection & Adaptive Density Bypass (ADR 0067)
// Automatically passes small/clean prompts (<200 tokens) through verbatim (0% dilation)
// Automatically prunes institutional noise (superseded ADRs, meeting minutes) on complex code
const selection = BroccoliCompactionFacade.selectRepresentation({
  text: rawContextText,
  taskType: 'architecture_invariants',
  tokenBudget: 1024,
});
console.log(selection.decision);               // 'BYPASS_IDENTITY' | 'COMPACT_GOVERNANCE' | 'COMPACT_INCIDENT'
console.log(selection.selectedRepresentation); // Actionable, task-relevant representation

// 2. Domain Compaction (180 industry domains, fail-closed safety gate)
const legal = BroccoliCompactionFacade.compactDomain(discoveryText, 'Interrogatory');
console.log(`Saved ${legal.tokensSaved} tokens (${legal.savingsPercentage}%)`);

// 3. Linux Kernel eBPF Telemetry Stream
const ebpf = BroccoliCompactionFacade.compact({
  mode: 'ebpf_stream',
  events: syscallEvents,
});

// 4. Kubernetes Watch Stream Compaction
const k8s = BroccoliCompactionFacade.compact({
  mode: 'k8s_watch_stream',
  events: k8sWatchDeltas,
});

// 5. 2,000+ Page Outage Storm Cascader (57ms)
const incident = BroccoliCompactionFacade.compactIncident({
  rawStreamText: logStormText,
  targetTokenBudget: 4096,
  incidentTitle: 'Production DB Failover',
});

// 6. Empirical Verification Commands:
// npm run onboard                    (8-Point Workstation Diagnostic)
// npm run bench:entropy              (7-Tier Progressive Entropy Benchmark)
// npm run bench:inference-boundary   (OpenAI Billed Dollar Empirical Suite)
// npm run scaffold:compactor         (Interactive Compactor Scaffolder)
```

---

## ⚡ 9. Hybrid Rolling Memory & Dual Rolling Seat Telemetry (`@galxai/sdk`)

```typescript
import { galx } from '@galxai/sdk';

// 1. Inspect live dual rolling window seat quota
const seat = await galx.seat.getQuota();
console.log(`5h Limit: ${seat.fiveHourLimitRemaining}% • Resets in ${seat.fiveHourResetIn}`);
console.log(`Weekly Limit: ${seat.weeklyLimitRemaining}% • Resets in ${seat.weeklyResetIn}`);

// 2. Stateful rolling context session with dynamic 1.05M tokens & tool turn-pair integrity
const session = galx.chat.rollingSession({
  userId: 'usr_enterprise_01',
  conversationId: 'conv_arch_design',
  model: 'gpt-5.6-sol',
  tools: [/* myToolDefinitions */],
});

// 3. Send turn with automatic 5-level memory pyramid and sub-microsecond RAM caching
const stream = await session.sendTurn('Review the multi-page schema migration spec');
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}

// 4. Inspect telemetry response headers
console.log('Stable Cache Hash:', stream.headers['x-galx-stable-cache-hash']);
console.log('Seat Remaining:', stream.headers['x-galx-seat-5h-limit-remaining']);
```

