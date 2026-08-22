# ⚡ GALXAI Universal Developer SDK: Specification & Architecture Reference

**Package**: `@galxai/sdk` (TypeScript / JavaScript) & `galxai` (Python)  
**Version**: `1.0.0`  
**Compliance Standards**: OpenAI API 1.x, Vercel AI SDK 3.x, Anthropic SDK, Google Cloud Tasks v2  
**Status**: Implemented, Verified & Hardened across 66 Forensic Verification Test Suites  

---

## 📑 Table of Contents
1. [SDK Architectural Topography](#1-sdk-architectural-topography)
2. [Initialization & Configuration](#2-initialization--configuration)
3. [Chat Completions API (`galx.chat`)](#3-chat-completions-api-galxchat)
4. [Autonomous Agent Runtime (`galx.agent`)](#4-autonomous-agent-runtime-galxagent)
5. [Structured Outputs & Schema Validation (`galx.chat.structured`)](#5-structured-outputs--schema-validation-galxchatstructured)
6. [Pluggable Middleware & Interceptors (`galx.use`)](#6-pluggable-middleware--interceptors-galxuse)
7. [Multi-Model Resilience Topologies (`fallbackCascade` & `race`)](#7-multi-model-resilience-topologies-fallbackcascade--race)
8. [Vercel AI SDK & Web Stream Adapters (`galx.adapters`)](#8-vercel-ai-sdk--web-stream-adapters-galxadapters)
9. [Multi-Modal Vision Ingestion (`galx.multimodal`)](#9-multi-modal-vision-ingestion-galxmultimodal)
10. [Batch Swarm Concurrency Evaluator (`galx.batch`)](#10-batch-swarm-concurrency-evaluator-galxbatch)
11. [Context Window & Token Optimizer (`galx.tokens`)](#11-context-window--token-optimizer-galxtokens)
12. [Asynchronous Task Queues & Pull Leasing (`galx.queues`)](#12-asynchronous-task-queues--pull-leasing-galxqueues)
13. [DAG Workflows & Pipeline Builder (`galx.workflows`)](#13-dag-workflows--pipeline-builder-galxworkflows)
14. [Webhooks & Cryptographic Security (`galx.webhooks`)](#14-webhooks--cryptographic-security-galxwebhooks)
15. [Typed Error Hierarchy](#15-typed-error-hierarchy)
16. [Interactive Developer CLI (`npx galxai`)](#16-interactive-developer-cli-npx-galxai)
17. [BroccoliDB In-Memory Natural Querying (`galx.models`, `galx.queues`, `galx.privacy`, `galx.db`)](#17-broccolidb-in-memory-natural-querying-galxmodels-galxqueues-galxprivacy-galxdb)
18. [Privacy Shield Plugin & Zero Data Retention Middleware (`createPrivacyShieldPlugin`)](#18-privacy-shield-plugin--zero-data-retention-middleware-createprivacyshieldplugin)
19. [SOC 2 Type II Compliance & GRC Auditor SDK (`galx.compliance`)](#19-soc-2-type-ii-compliance--grc-auditor-sdk-galxcompliance)

---

## 1. SDK Architectural Topography

```mermaid
flowchart TD
    App[Developer Application / Agent Swarm / CLI] --> GalxClient[GalxAI Universal Client Core]
    
    subgraph Autonomous Agent Runtime
        GalxClient --> Agent[galx.agent Multi-Step Function Calling Loop]
        Agent --> ToolRegistry[Type-Safe Tool Parameter Definitions]
        ToolRegistry --> ToolExecution[Automatic Function Execution & Output Loop]
    end
    
    subgraph Developer Ergonomics Layer
        GalxClient --> FluentBuilder[galx.chat.builder Method Chaining]
        GalxClient --> StructuredOutputs[galx.chat.structured JSON Schema Validation]
        GalxClient --> Adapters[galx.adapters Vercel AI SDK Protocols]
        GalxClient --> MultiModal[galx.multimodal Vision Helpers]
        GalxClient --> BatchSwarm[galx.batch.mapConcurrent Swarm Runner]
        GalxClient --> TokenOptimizer[galx.tokens BPE Estimator & History Pruning]
    end
    
    subgraph Extensible Middleware Substrate
        GalxClient --> Middleware[galx.use Interceptor Pipeline]
        Middleware --> CostPlugin[Real-Time Token & Dollar Budget Tracker]
        Middleware --> LRUPlugin[Client-Side LRU Response Cache]
    end
    
    subgraph Multi-Model Resilience Topologies
        GalxClient --> FallbackCascade[galx.chat.fallbackCascade Multi-Model Failover]
        GalxClient --> StreamRace[galx.chat.race Lowest TTFB Stream Race]
    end
    
    subgraph Core Transport & Execution
        GalxClient --> Transport[GalxAIClientCore Zero-Dependency Transport]
        Transport --> Retries[Exponential Backoff + Jitter]
        Transport --> ErrorHierarchy[Typed Exceptions: 401, 403, 404, 429, 504]
        Transport --> Gateway[Universal Ingress Gateway /v1 & /api/queues]
    end
```

---

## 2. Initialization & Configuration

```typescript
import { GalxAI } from '@/sdk';

const galx = new GalxAI({
  apiKey: process.env.GALX_API_KEY,      // Defaults to process.env.GALX_API_KEY
  baseURL: 'https://gateway.galx.ai',     // Custom gateway URL or local proxy
  timeoutMs: 60000,                       // Request timeout (default: 60s)
  maxRetries: 3,                          // Automatic transient retries (default: 2)
  defaultHeaders: { 'X-App-Id': 'agents' }
});
```

---

## 3. Chat Completions API (`galx.chat`)

### Synchronous Inference & SSE Token Streaming
```typescript
// Synchronous JSON response
const response = await galx.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain Raft consensus' }]
});
console.log(response.choices[0].message.content);

// Streaming SSE token chunks
const stream = await galx.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain Raft consensus' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### Background Asynchronous Tasks (`createAsync`)
```typescript
const task = await galx.chat.completions.createAsync({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Mass dataset evaluation' }],
  queue: 'llm-batch',
  groupId: 'session_conv_123' // Strict FIFO ordering
});

// Stream real-time progress and logs via SSE
for await (const progress of task.streamProgress()) {
  console.log(`[Progress ${progress.percentage}%]: ${progress.message}`);
}

// Await completion result
const result = await task.result({ timeoutMs: 120000 });
```

### Fluent Method-Chaining Builder (`galx.chat.builder`)
```typescript
const response = await galx.chat
  .builder('gpt-5.6-sol')
  .system('You are an expert system architect.')
  .user('Design a distributed cache with Raft.')
  .temperature(0.2)
  .maxTokens(4000)
  .async({ queue: 'llm-batch', groupId: 'conv_1' })
  .execute();
```

---

## 4. Autonomous Agent Runtime (`galx.agent`)

Eliminates manual tool calling loops by automatically formatting functions, parsing tool call requests, executing local functions, and re-prompting the model until final answer synthesis:

```typescript
const agent = galx.agent({
  model: 'gpt-5.6-sol',
  systemPrompt: 'You are an autonomous research analyst.',
  tools: {
    getStockQuote: {
      description: 'Get real-time stock quote for a ticker symbol',
      parameters: {
        type: 'object',
        properties: { ticker: { type: 'string', description: 'Stock ticker (e.g. NVDA, AAPL)' } },
        required: ['ticker']
      },
      execute: async ({ ticker }) => {
        // Execute internal DB query or external API call
        return { ticker, price: 135.50, change: '+2.4%' };
      }
    }
  },
  maxSteps: 10
});

const result = await agent.run('What is Nvidia stock price and what is its trend?');
console.log(result.text);                // Final synthesized answer
console.log(result.toolCallsExecuted);   // Array of executed tool invocations and results
console.log(result.stepsCount);          // Number of round-trip execution steps
```

---

## 5. Structured Outputs & Schema Validation (`galx.chat.structured`)

Guarantees type-safe JSON extraction matching JSON Schema specifications:

```typescript
interface InvoiceData {
  invoiceId: string;
  amount: number;
  currency: string;
  lineItems: string[];
}

const invoice = await galx.chat.structured<InvoiceData>({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Invoice INV-2026 for $450.50 with items: Widget A, Widget B' }],
  schema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'string' } }
    },
    required: ['invoiceId', 'amount', 'currency', 'lineItems']
  },
  validator: (data): data is InvoiceData => typeof data.invoiceId === 'string' && typeof data.amount === 'number'
});

console.log(invoice.invoiceId, invoice.amount);
```

---

## 6. Pluggable Middleware & Interceptors (`galx.use`)

```typescript
import { createCostTrackerPlugin, createLRUCachePlugin } from '@/sdk';

// 1. Client-Side LRU Response Cache (Saves 100% tokens on identical queries)
galx.use(createLRUCachePlugin({ maxEntries: 500, ttlMs: 60000 }));

// 2. Real-Time Token & Dollar Budget Tracker
galx.use(createCostTrackerPlugin({
  maxBudgetUsd: 25.00,
  onBudgetExceeded: (usd) => console.warn(`Budget ceiling of $${usd} reached!`),
  onUsageUpdate: (stats) => console.log(`Usage: ${stats.totalTokens} tokens ($${stats.totalCostUsd})`)
}));

// 3. Custom Logging & Diagnostic Interceptor
galx.use({
  onRequest: (ctx) => console.log(`[REQ] ${ctx.method} ${ctx.path}`),
  onResponse: (ctx) => console.log(`[RES ${ctx.statusCode}] ${ctx.durationMs}ms`),
  onError: (ctx) => console.error(`[ERR] ${ctx.error.message}`)
});
```

---

## 7. Multi-Model Resilience Topologies (`fallbackCascade` & `race`)

### Fallback Cascades (Zero-Downtime Provider Outage Failover)
```typescript
const response = await galx.chat.fallbackCascade(
  ['gpt-5.6-sol', 'x-ai/grok-4.5', 'gpt-5.6-luna'],
  { messages: [{ role: 'user', content: 'Mission critical code generation' }] }
);
console.log(`Executed on: ${response.successfulModel} (Attempts: ${response.attemptsMade})`);
```

### TTFB Stream Racing
```typescript
const fastStream = await galx.chat.race(
  ['gpt-5.6-sol', 'gpt-5.6-terra'],
  { messages: [{ role: 'user', content: 'Fast response required' }] }
);
console.log(`Fastest model: ${fastStream.winningModel}`);
for await (const chunk of fastStream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## 8. Vercel AI SDK & Web Stream Adapters (`galx.adapters`)

```typescript
// app/api/chat/route.ts in Next.js App Router
export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await galx.chat.completions.create({
    model: 'gpt-5.6-sol',
    messages,
    stream: true
  });

  // Returns Response with x-vercel-ai-data-stream: v1 for useChat()
  return galx.adapters.toDataStreamResponse(stream);
}
```

---

## 9. Multi-Modal Vision Ingestion (`galx.multimodal`)

```typescript
const userMsg = galx.multimodal.createUserMessage('Compare these diagrams:', [
  'https://images.galx.ai/diagram-a.png',
  imageBuffer,
  'data:image/jpeg;base64,...'
]);

const analysis = await galx.chat.completions.create({
  model: 'gpt-5.6-terra',
  messages: [userMsg]
});
```

---

## 10. Batch Swarm Concurrency Evaluator (`galx.batch`)

```typescript
const results = await galx.batch.mapConcurrent(prompts, async (prompt) => {
  return galx.chat.completions.create({
    model: 'gpt-5.6-sol',
    messages: [{ role: 'user', content: prompt }]
  });
}, {
  concurrency: 25,
  onProgress: (done, total) => console.log(`Progress: ${done}/${total}`)
});
```

---

## 11. Context Window & Token Optimizer (`galx.tokens`)

```typescript
// Estimate tokens
const tokenCount = galx.tokens.estimateMessagesTokens(messages);

// Smart conversation pruning (preserves system prompts and recent context)
const fitMessages = galx.tokens.truncateToFit(messages, 8000, 'preserve_system_and_recent');
```

---

## 12. Asynchronous Task Queues & Pull Leasing (`galx.queues`)

```typescript
// Lease tasks for distributed worker fleets
const leases = await galx.queues.leaseTasks('default', {
  workerId: 'worker-us-west-1',
  maxTasks: 10
});

for (const task of leases.tasks) {
  try {
    const output = await processTask(task);
    await galx.queues.acknowledgeTask('default', task.id, 'worker-us-west-1', output);
  } catch (err: any) {
    await galx.queues.failTask('default', task.id, 'worker-us-west-1', err.message);
  }
}
```

---

## 13. DAG Workflows & Pipeline Builder (`galx.workflows`)

```typescript
const workflow = await galx.workflows.create({
  steps: [
    { name: 'outline', model: 'gpt-5.6-sol', prompt: 'Create article outline' },
    { name: 'visual', tool: 'image_generation', prompt: 'Hero image illustration' },
    { name: 'notify', tool: 'webhook', url: 'https://my-app.run.app/hook' }
  ]
});
```

---

## 14. Webhooks & Cryptographic Security (`galx.webhooks`)

```typescript
const isValid = galx.webhooks.verifySignature(rawBody, req.headers.get('x-galx-signature'), webhookSecret);
```

---

## 15. Typed Error Hierarchy

```typescript
try {
  await galx.chat.completions.create({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn(`Rate limited. Retry after: ${err.retryAfterSeconds}s`);
  } else if (err instanceof AuthenticationError) {
    console.error('Invalid API Key');
  } else if (err instanceof APITimeoutError) {
    console.error(`Request timed out after ${err.timeoutMs}ms`);
  } else if (err instanceof APIConnectionError) {
    console.error('Network failure connecting to gateway');
  }
}
```

---

## 16. Interactive Developer CLI (`npx galxai`)

```bash
# Full health, latency, queue, and webhook diagnostics
npx galxai doctor

# Terminal real-time streaming REPL with tokens/sec velocity
npx galxai chat gpt-5.6-sol "Explain distributed state machines concisely."

# Model catalog and context windows
npx galxai models

# Fast ping
npx galxai ping
```

---

## 17. BroccoliDB In-Memory Natural Querying (`galx.models`, `galx.queues`, `galx.privacy`, `galx.db`)

Perform zero-dependency, offline deterministic natural language queries with $< 0.1\text{ms}$ latency:

```typescript
// 1. Natural Language Model Querying
const models = galx.models.queryNatural(
  'where provider = "openai" and supportsVision = true and inputPricePer1M <= 1.0 sort by price asc'
);

// 2. Natural Language Task Queue Inspection
const pendingJobs = galx.queues.queryNatural(
  'where state = "pending" and priority > 5 sort by createdAt desc limit 10'
);

// 3. Natural Language Shard Compliance Search
const euShards = galx.privacy.queryShardsNatural(
  'where hipaaCompliant = true and dataResidency = "eu"'
);

// 4. Single-Pass Statistical Aggregations
const priceStats = galx.db.aggregate({
  table: 'models',
  groupBy: ['provider'],
  metrics: {
    avgPrice: { metric: 'avg', field: 'inputPricePer1M' },
    minPrice: { metric: 'min', field: 'inputPricePer1M' },
    count: { metric: 'count' }
  }
});
```

---

## 18. Privacy Shield Plugin & Zero Data Retention Middleware (`createPrivacyShieldPlugin`)

Automatically de-identify sensitive PHI/PII entities before upstream transit and rehydrate them upon completion:

```typescript
import { GalxAI, createPrivacyShieldPlugin, PrivacyProfiles } from '@/sdk';

const galx = new GalxAI({ apiKey: process.env.GALX_API_KEY });

// Install Privacy Shield Middleware
galx.use(createPrivacyShieldPlugin({
  profile: PrivacyProfiles.MAXIMUM_PRIVACY,
  hipaaEnabled: true,
  gdprEnabled: true,
  zdrEnabled: true,
  onPIIDetected: (detectedTypes) => {
    console.log(`[PrivacyShield] Redacted sensitive entities: ${detectedTypes.join(', ')}`);
  }
}));

// Prompts with SSNs, MRNs, Credit Cards are seamlessly redacted upstream and rehydrated locally
const response = await galx.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Patient John Doe (SSN: 000-12-3456) diagnosed with hypertension.' }]
});
console.log(response.choices[0].message.content);
```

---

## 19. SOC 2 Type II Compliance & GRC Auditor SDK (`galx.compliance`)

Retrieve real-time posture reports, evaluate configuration drifts, and generate signed evidence packages for auditors:

```typescript
// 1. Retrieve 5-Pillar Real-Time Posture Grade
const posture = galx.compliance.getPostureReport();
console.log(`Compliance Score: ${posture.overallPostureScore}% (${posture.grade})`);

// 2. Generate Cryptographically Signed Evidence Dossier
const dossier = galx.compliance.getEvidenceDossier();
console.log(`Auditor Attestation: ${dossier.attestationSummary.status}`);
console.log(`Signature: ${dossier.cryptographicSignatureSha256}`);

// 3. Inspect 28 SOC 2 / HIPAA Technical Control Mappings
const controls = galx.compliance.getControls();
console.log(`Active Controls: ${controls.length}/28`);
```

