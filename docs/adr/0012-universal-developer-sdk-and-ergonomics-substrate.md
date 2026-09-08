# ADR 0012: Universal Developer SDK & Developer Experience (DX) Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified via 55-Suite Forensic Harness)

## Context
Developers building multi-agent swarms, batch evaluation pipelines, and low-latency interactive AI apps require a first-class client experience with:
1. **Zero-Configuration Drop-In Compatibility**: Immediate substitution for existing OpenAI/Anthropic SDKs without code rewrites.
2. **First-Class Asynchronous Queue Ergonomics**: Simple initiation of background workloads (`createAsync`) with typed handles for SSE progress streaming and automated result resolution.
3. **DAG Workflow Orchestration**: Intuitive client-side pipeline construction for multi-stage agents.
4. **Resilience & Fault Tolerance**: Client-side exponential retry policies with full randomized jitter, automatic `Retry-After` header parsing, and granular typed error classes.
5. **Universal Runtime Portability**: Complete zero-dependency execution across Node.js 18+, Edge Runtimes, Cloudflare Workers, Bun, Deno, and modern browsers.

## Decision
We designed and implemented the **GALXAI Universal Developer SDK (`@galxai/sdk` / `src/sdk`)**:

```mermaid
flowchart TD
    App[Developer Application] --> GalxClient[GalxAI Universal Client]
    
    subgraph Resources & Interfaces
        GalxClient --> Chat[galx.chat.completions]
        GalxClient --> Images[galx.images]
        GalxClient --> Models[galx.models]
        GalxClient --> Queues[galx.queues]
        GalxClient --> Workflows[galx.workflows]
        GalxClient --> Webhooks[galx.webhooks]
    end
    
    subgraph Gateway Execution & Wire Formats
        Chat -->|Sync JSON / Streaming SSE Tokens| Gateway[/v1 Endpoints]
        Chat -->|createAsync Task Enqueue| QueueEngine[/api/queues Ingress]
        Queues -->|SSE EventBus Iterator / Pull Leases| QueueEngine
        Workflows -->|DAG Fan-In Dependencies| QueueEngine
    end
    
    subgraph Client-Side Resilience Layer
        GalxClient --> Retries[Exponential Backoff + Jitter]
        GalxClient --> Errors[Typed Error Hierarchy: 401, 403, 404, 429, 504]
    end
```

---

### 1. OpenAI Drop-In Signatures with Dual Sync/Async Topologies
```typescript
import { GalxAI } from '@/sdk';

const galx = new GalxAI({ apiKey: process.env.GALX_API_KEY });

// Standard Synchronous & Streaming Inference
const stream = await galx.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain zero-knowledge proofs' }],
  stream: true
});

// Asynchronous Background Queue Execution
const task = await galx.chat.completions.createAsync({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Mass evaluation task' }],
  queue: 'llm-batch',
  groupId: 'user_session_42'
});

for await (const progress of task.streamProgress()) {
  console.log(`Progress ${progress.percentage}%: ${progress.message}`);
}
```

---

### 2. DAG Workflow & Multi-Step Pipeline Builder
```typescript
const workflow = await galx.workflows.create({
  steps: [
    { name: 'outline', model: 'gpt-5.6-sol', prompt: 'Create article outline' },
    { name: 'visual', tool: 'image_generation', prompt: 'Hero illustration' },
    { name: 'notify', tool: 'webhook', url: 'https://my-app.run.app/hook' }
  ]
});
```

---

### 3. Typed Error Hierarchy & Automated Resilience
The client maps HTTP status codes into typed exceptions:
- `AuthenticationError` (401)
- `PermissionDeniedError` (403)
- `NotFoundError` (404)
- `RateLimitError` (429, extracts `retryAfterSeconds`)
- `APIConnectionError` (network drops)
- `APITimeoutError` (exceeded `timeoutMs`)
- `InternalServerError` (5xx upstream failures)

Transient 429 and 5xx errors automatically retry using exponential backoff with randomized jitter:
$$\text{BackoffMs} = \min\left(\text{MaxBackoff}, 2^{\text{attempt}} \times 200 + \text{rand}() \times 100\right)$$

---

## Consequences
- **Positive**: 1-line drop-in migration for existing AI developers.
- **Positive**: Zero external dependencies ensures compatibility across Node, Bun, Deno, and Edge environments.
- **Positive**: Unifies sync inference, background queues, DAG pipelines, and SSE streaming under a single cohesive client surface.
- **Positive**: Cryptographic webhook helpers prevent security vulnerabilities in callback handlers.
