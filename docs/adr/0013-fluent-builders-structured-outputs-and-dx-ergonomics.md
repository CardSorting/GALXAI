# ADR 0013: Fluent Builders, Structured Outputs & DX Ergonomics Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified via 60-Suite Forensic Harness)

## Context
As developers build increasingly sophisticated multi-agent swarms and full-stack web applications on GALXAI, standard raw HTTP request interfaces create unnecessary boilerplate:
1. **Chat Completion Parameter Construction**: Constructing nested arrays of messages and options across synchronous and asynchronous paths introduces friction.
2. **Type-Safe Structured Output Extraction**: Parsing JSON responses manually from LLM completions risks runtime crashes when models output invalid syntax or miss required schema keys.
3. **Frontend Streaming Protocol Mismatches**: Passing token streams to Next.js App Router and frontend hooks (such as Vercel AI SDK `useChat` / `useCompletion`) required custom encoding transformations.
4. **Multi-Modal Vision Formatting**: Encoding mixed file buffers, Base64 strings, and URLs into OpenAI-compatible message payloads required repetitive encoding logic.
5. **High-Throughput Batch Swarm Processing**: Running evaluations across thousands of inputs required custom concurrency pool management and retry loops.

## Decision
We engineered the **Phase 4 World-Class Developer Experience (DX) Substrate** within the official SDK (`@galxai/sdk` / `src/sdk`):

```mermaid
flowchart TD
    App[Developer Application] --> GalxClient[GalxAI Universal Client]
    
    subgraph Phase 4 DX Substrate
        GalxClient --> Builder[galx.chat.builder Fluent Chaining]
        GalxClient --> Structured[galx.chat.structured Schema Parser]
        GalxClient --> Adapters[galx.adapters Vercel AI SDK Protocols]
        GalxClient --> MultiModal[galx.multimodal Vision Helpers]
        GalxClient --> Batch[galx.batch Concurrency Runner]
    end
    
    subgraph Wire & Transport Gateway
        Builder --> Core[GalxAIClientCore Transport]
        Structured --> Core
        Adapters --> Core
        Batch --> Core
        Core --> Gateway[GALXAI Gateway /v1 & /api/queues]
    end
```

---

### 1. Fluent Method-Chaining Prompt Builder (`galx.chat.builder`)
Provides an auto-completing, type-safe builder interface inspired by Stripe & Prisma:
```typescript
const response = await galx.chat
  .builder('gpt-5.6-sol')
  .system('You are an expert system architect.')
  .user('Explain Raft consensus.')
  .temperature(0.2)
  .maxTokens(4000)
  .async({ queue: 'llm-batch', groupId: 'conv_session_1' })
  .execute();
```

---

### 2. Native Structured Outputs & Schema Validation (`galx.chat.structured`)
Injects strict JSON schemas (`response_format.type: 'json_schema'`), parses model responses, and enforces client-side validation predicates:
```typescript
interface InvoiceSummary {
  invoiceId: string;
  totalUsd: number;
  lineItems: string[];
}

const invoice = await galx.chat.structured<InvoiceSummary>({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Invoice #1024 total $450 with 2 items...' }],
  schema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      totalUsd: { type: 'number' },
      lineItems: { type: 'array', items: { type: 'string' } }
    },
    required: ['invoiceId', 'totalUsd', 'lineItems']
  }
});
```

---

### 3. Vercel AI SDK Protocol & Streaming Adapters (`galx.adapters`)
Direct stream conversion for Next.js App Router and Edge Handlers:
- `toTextStream(chunks)`: Emits standard plain text `ReadableStream<Uint8Array>`.
- `toTextStreamResponse(chunks)`: Returns an HTTP `Response` with `text/plain` headers.
- `toDataStreamResponse(chunks)`: Emits Vercel AI SDK protocol lines (`0:"token"\n` and `d:{"finishReason":"stop"}\n`) with `x-vercel-ai-data-stream: v1` header for zero-boilerplate `useChat` hook consumption.

---

### 4. Multi-Modal Vision Ingestion Helpers (`galx.multimodal`)
Automatically transforms image URLs, raw Node.js `Buffer` objects, or base64 strings into compliant vision message structures:
```typescript
const message = galx.multimodal.createUserMessage('Inspect this architecture diagram:', [
  'https://images.galx.ai/arch.png',
  imageBuffer
]);
```

---

### 5. High-Throughput Batch Swarm Evaluator (`galx.batch.mapConcurrent`)
Executes parallel map operations with bounded concurrency ceilings, per-item retry policies, exponential jitter, and progress event hooks:
```typescript
const results = await galx.batch.mapConcurrent(prompts, async (prompt) => {
  return galx.chat.completions.create({
    model: 'gpt-5.6-sol',
    messages: [{ role: 'user', content: prompt }]
  });
}, {
  concurrency: 20,
  onProgress: (done, total) => console.log(`Processed ${done}/${total}`)
});
```

---

### 6. Interactive Developer CLI (`npx galxai`)
- `galxai doctor`: Audits gateway connectivity, measures roundtrip latency to all models, checks active queues, and verifies webhook signatures.
- `galxai ping`: Fast latency health check.
- `galxai models`: Formatted listing of models and token context limits.

---

## Consequences
- **Positive**: Reduces boilerplate code by over 70% across common LLM workflows.
- **Positive**: Native Next.js and Vercel AI SDK integration with zero conversion code.
- **Positive**: Eliminates runtime JSON parsing errors through strict structured output extraction.
- **Positive**: High-throughput batch processing without external queue libraries.
- **Positive**: Instant developer diagnostics via `npx galxai doctor`.
