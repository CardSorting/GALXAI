# 📖 GALXAI API Reference

This document outlines the complete REST API specification for GALXAI endpoints.

---

## 🔑 Authentication

All client requests must include your GALXAI gateway key in the `Authorization` header:

```http
Authorization: Bearer galx_live_abcdef1234567890
```

---

## 💬 Chat Completions (`POST /v1/chat/completions`)

Standard OpenAI-compatible chat completion endpoint with automatic quota cycling and reasoning model support.

### Request Body
```json
{
  "model": "gpt-5.6-sol",
  "messages": [
    { "role": "system", "content": "You are an expert software engineer." },
    { "role": "user", "content": "Write a high-performance LRU cache in Rust." }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Supported Models
- `gpt-5.6-sol` (OpenAI Flagship Reasoning, 900K context)
- `gpt-5.6-terra` (OpenAI Balanced LLM, 900K context)
- `gpt-5.6-luna` (OpenAI High-Speed Lightweight, 900K context)
- `x-ai/grok-4.6` (xAI Grok Frontier Reasoning & Multimodal, 1M context)
- `x-ai/grok-4.5` (xAI Grok Reasoning & Vision, 500K context)

### Response (Streaming SSE)
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
X-Galx-Request-Id: req_1700000000_abc12
X-Galx-Shard-Id: shard_openai_01
X-Galx-Model: gpt-5.6-sol
X-Galx-Provider: openai
X-Galx-Strategy: adaptive_headroom
X-Galx-Routing-Latency-Ms: 1

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5.6-sol","choices":[{"index":0,"delta":{"content":"pub struct LRUCache"},"finish_reason":null}]}
data: [DONE]
```

### Diagnostic Response Headers
Every completion and image response includes standard gateway diagnostic headers:
- `X-Galx-Request-Id`: Unique idempotent request identifier.
- `X-Galx-Shard-Id`: Masked identifier of the upstream shard executing the query.
- `X-Galx-Model`: Canonical resolved model identifier.
- `X-Galx-Provider`: Foundation model provider (`openai` or `xai-grok`).
- `X-Galx-Strategy`: Active cycling algorithm (`adaptive_headroom`).
- `X-Galx-Routing-Latency-Ms`: Sub-millisecond internal routing & lease decision overhead.

---

## 🎨 Image Generation (`POST /v1/images/generations`)

Visual synthesis endpoint routing across OpenAI and xAI Grok image generation models.

### Request Body
```json
{
  "model": "openai-gpt-image-2",
  "prompt": "Cybernetic space station overlooking a nebula in 8k octane render",
  "n": 1,
  "size": "1024x1024",
  "quality": "hd",
  "response_format": "url"
}
```

### Supported Models
- `openai-gpt-image-2`
- `openai-gpt-image-1.5`
- `openai-gpt-image-1`
- `openai-gpt4o-image`
- `openai-dalle-3`
- `openai-dalle-2`
- `xai-grok-image`
- `xai-grok-2-image`

### Response
```json
{
  "created": 1700000000,
  "data": [
    { "url": "https://..." }
  ],
  "modelUsed": "openai-gpt-image-2",
  "shardId": "codex_root_123"
}
```

---

## 📋 List Models (`GET /v1/models`)

Returns the exclusive 12-model fleet with pricing, context limits, and capability flags.

### Response
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-5.6-sol",
      "object": "model",
      "created": 1700000000,
      "owned_by": "openai",
      "context_window": 900000,
      "pricing": {
        "input_per_1m": 2.25,
        "output_per_1m": 9.00,
        "discount_percentage": 25
      }
    }
  ]
}
```

---

## 📊 Pool Telemetry & Metrics (`GET /api/pool/telemetry`)

Returns real-time sliding-window latency percentiles ($P_{50}, P_{90}, P_{99}$), RPM, TPM, and error rates.

### Response
```json
{
  "metrics": {
    "totalRequests": 1420,
    "totalTokens": 2840000,
    "errorRatePercentage": 0.14,
    "requestsPerMinute": 120,
    "tokensPerMinute": 240000,
    "latency": {
      "p50Ms": 280,
      "p90Ms": 520,
      "p99Ms": 950,
      "averageMs": 310
    },
    "providerBreakdown": {
      "openai": { "requests": 950, "tokens": 1900000, "avgLatencyMs": 290, "errorRate": 0.1 },
      "xai-grok": { "requests": 470, "tokens": 940000, "avgLatencyMs": 350, "errorRate": 0.2 }
    }
  },
  "totalLogs": 1420
}
```

---

## 🎛️ Pool Statistics & Strategy (`GET /api/pool/stats`, `POST /api/pool/stats`)

### GET Response
```json
{
  "totalShards": 8,
  "healthyShards": 8,
  "cooldownShards": 0,
  "exhaustedShards": 0,
  "activeLeasesCount": 3,
  "averageFleetLatencyMs": 310,
  "rotationStrategy": "adaptive_headroom"
}
```

### POST (Change Strategy)
```json
{
  "strategy": "smooth_weighted_round_robin"
}
```
Supported strategies: `adaptive_headroom`, `smooth_weighted_round_robin`, `least_utilized`, `priority_failover`.

---

## ⚡ Asynchronous Task Queues & Cloud Run Webhooks (`/api/queues/*`)

GALXAI provides a CloudTasks & CloudRun-inspired asynchronous task queue and worker execution substrate.

### 1. List Queues (`GET /api/queues`)
Returns all active queues with live telemetry, dispatch rates, and concurrency semaphores.

```bash
curl -X GET https://gateway.galx.ai/api/queues \
  -H "Authorization: Bearer galx_live_..."
```

### 2. Enqueue Task (`POST /api/queues/:queueId/tasks`)
Creates and schedules an asynchronous task with strict idempotency deduplication and priority.

```bash
curl -X POST https://gateway.galx.ai/api/queues/llm-batch/tasks \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: job-eval-2026-08-22-001" \
  -d '{
    "priority": 80,
    "delayMs": 5000,
    "target": {
      "type": "INTERNAL_MODEL",
      "taskKind": "chat_completion",
      "chatPayload": {
        "model": "gpt-5.6-sol",
        "messages": [{ "role": "user", "content": "Evaluate code quality" }]
      },
      "webhookCompletionUrl": "https://my-server.run.app/callbacks/ai",
      "webhookHmacSecret": "whsec_supersecretkey"
    }
  }'
```

**Response (`202 Accepted`)**:
```json
{
  "task": {
    "id": "task_1700000000_abc1234",
    "queueId": "llm-batch",
    "status": "SCHEDULED",
    "scheduleTimeMs": 1700000005000,
    "priority": 80
  },
  "deduplicated": false,
  "taskUrl": "/api/queues/llm-batch/tasks/task_1700000000_abc1234"
}
```

### 3. Asynchronous Chat Completion Ingress (`POST /v1/chat/completions`)
Passing `X-Galx-Async: true` automatically enqueues the request into the asynchronous queue:

```bash
curl -X POST https://gateway.galx.ai/v1/chat/completions \
  -H "Authorization: Bearer galx_live_..." \
  -H "X-Galx-Async: true" \
  -H "X-Galx-Queue: llm-batch" \
  -H "X-Galx-Webhook-Url: https://my-service.run.app/ai-hook" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{ "role": "user", "content": "Long reasoning task" }]
  }'
```

### 4. Distributed Pull Worker Lease (`POST /api/queues/:queueId/lease`)
Enables external worker fleets to lease tasks atomically with fencing tokens:

```bash
curl -X POST https://gateway.galx.ai/api/queues/default/lease \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "worker-us-central1-a-01",
    "maxTasks": 10,
    "leaseDurationMs": 60000
  }'
```

### 5. Acknowledge Pull Task (`POST /api/queues/:queueId/tasks/:taskId/acknowledge`)
```bash
curl -X POST https://gateway.galx.ai/api/queues/default/tasks/task_123/acknowledge \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "worker-us-central1-a-01",
    "result": { "computedValue": 42 }
  }'
```

### 6. Bulk DLQ Redrive (`POST /api/queues/:queueId/redrive`)
Re-enqueues up to 100 dead-lettered tasks in bulk for immediate re-execution.

```bash
curl -X POST https://gateway.galx.ai/api/queues/llm-batch/redrive \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "maxTasks": 50 }'
```

### 7. Bulk Task Cancellation (`POST /api/queues/:queueId/tasks/bulk-cancel`)
Bulk cancels pending/scheduled tasks matching specific tags, group IDs, or user IDs.

```bash
curl -X POST https://gateway.galx.ai/api/queues/agent-swarms/tasks/bulk-cancel \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "tag": "obsolete-run-v1" }'
```

### 8. Worker Progress Update (`POST /api/queues/:queueId/tasks/:taskId/progress`)
Updates execution progress percentage and appends execution logs.

```bash
curl -X POST https://gateway.galx.ai/api/queues/default/tasks/task_123/progress \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "percentage": 65,
    "message": "Processed 650/1000 items in batch",
    "logLine": "Chunk #65 committed."
  }'
```

### 9. Task Real-Time Server-Sent Events Stream (`GET /api/queues/:queueId/tasks/:taskId/stream`)
Subscribes to real-time execution state transitions, progress updates, and logs via standard SSE:

```bash
curl -N https://gateway.galx.ai/api/queues/default/tasks/task_123/stream \
  -H "Authorization: Bearer galx_live_..."
```

### 10. Queue-Wide Real-Time SSE Stream (`GET /api/queues/:queueId/stream`)
Subscribes to live dispatches, completions, and telemetry events across an entire named queue:

```bash
curl -N https://gateway.galx.ai/api/queues/agent-swarms/stream \
  -H "Authorization: Bearer galx_live_..."
```

### 11. Task Creation with DAG Dependencies (`POST /api/queues/:queueId/tasks`)
Creates a Fan-In child task that waits until parent tasks `task_A` and `task_B` complete:

```bash
curl -X POST https://gateway.galx.ai/api/queues/agent-swarms/tasks \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "dependsOn": ["task_A", "task_B"],
    "target": {
      "type": "INTERNAL_MODEL",
      "taskKind": "chat_completion",
      "chatPayload": {
        "model": "gpt-5.6-sol",
        "messages": [{ "role": "user", "content": "Synthesize summary from parent tasks" }]
      }
    }
  }'
```

---

## 🛡️ Privacy & Zero Data Retention Compliance Headers

Clients can specify granular privacy policies directly through HTTP request headers:

| Header | Values | Description |
| :--- | :--- | :--- |
| `X-Galx-Privacy-Profile` | `standard`, `maximum_privacy`, `hipaa`, `eu_strict` | Applies pre-configured privacy and redaction rulesets. |
| `X-Galx-HIPAA-Deidentify` | `true`, `false` | Enables Safe Harbor 18 de-identification on prompt messages. |
| `X-Galx-ZDR-Zeroize` | `true`, `false` | Mandates 2-pass memory zeroization and ephemeral session KEK protection. |
| `X-Galx-Data-Residency` | `global`, `eu`, `us-east` | Restricts shard routing strictly to sovereign geographic regions. |
| `Sec-GPC` | `1` | Global Privacy Control header automatically enforces zero tracking and no-store directives. |

---

## 📋 Compliance & GRC Auditor Endpoints

### 12. SOC 2 Type II Posture Report (`GET /api/compliance/posture`)
Retrieves the real-time posture grade and status across all 5 Trust Services Criteria (28 controls).

```bash
curl -X GET https://gateway.galx.ai/api/compliance/posture \
  -H "Authorization: Bearer galx_live_..."
```

### 13. Signed SOC 2 Type II Evidence Dossier (`GET /api/compliance/evidence`)
Generates a cryptographically signed evidence package with Merkle audit roots and digital signatures for SOC 2 Type II and HIPAA auditors.

```bash
curl -X GET https://gateway.galx.ai/api/compliance/evidence \
  -H "Authorization: Bearer galx_live_..."
```

### 14. GDPR Article 30 Records of Processing Activities (RoPA) (`GET /api/compliance/ropa`)
Returns the complete GDPR Article 30 controller and processor processing registers sealed with SHA-256 digital seals.

```bash
curl -X GET https://gateway.galx.ai/api/compliance/ropa \
  -H "Authorization: Bearer galx_live_..."
```

### 15. GDPR Article 17 Right to Erasure / Purge (`POST /api/compliance/dsar/purge`)
Executes an immediate cryptographic purge of user data, session records, and keys, returning signed proof of erasure.

```bash
curl -X POST https://gateway.galx.ai/api/compliance/dsar/purge \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "userId": "usr_dev_123" }'
```

---

## 🥦 BroccoliDB Natural Query & Analytics APIs

### 16. Natural Language Model Query (`GET /v1/models/query`)
Executes offline deterministic natural queries against the model catalog:

```bash
curl -X GET "https://gateway.galx.ai/v1/models/query?q=where+supportsVision+=+true+and+inputPricePer1M+<=+1.0+sort+by+price+asc" \
  -H "Authorization: Bearer galx_live_..."
```

---

---

## ⚡ Rapid 1-Line Execution (`POST /api/run`)

Direct ultra-flat prompt execution endpoint for lightweight scripts, cron jobs, and webhooks:

```bash
curl -X POST https://gateway.galx.ai/api/run \
  -H "Authorization: Bearer $GALX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Summarize today security alerts"}'
```

---

## 🎭 Anthropic Claude Messages (`POST /v1/messages`)

Drop-in native compatibility endpoint for Anthropic Claude SDK, Claude Code, and Windsurf:

```bash
curl -X POST https://gateway.galx.ai/v1/messages \
  -H "x-api-key: $GALX_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-7-sonnet",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Explain zero knowledge proofs"}]
  }'
```

---

## 🧭 Vector Embeddings (`POST /v1/embeddings`)

OpenAI-compatible vector embedding generations backed by BroccoliDB L1 in-memory cosine indexing:

```bash
curl -X POST https://gateway.galx.ai/v1/embeddings \
  -H "Authorization: Bearer $GALX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "Quantum computing and topological qubits"
  }'
```

---

## 🏥 Platform Discovery & Health (`GET /api/health`)

Real-time capability negotiation and telemetry status:

```bash
curl -X GET https://gateway.galx.ai/api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "2.0.0-zenith",
  "capabilities": {
    "openai_compatible": true,
    "anthropic_compatible": true,
    "streaming_sse": true,
    "dag_workflows": true,
    "async_queues": true,
    "zdr_privacy_shield": true
  },
  "models": {
    "total": 12,
    "reasoningCount": 4,
    "defaultModel": "gpt-5.6-sol"
  }
}
```

---

## 📦 Official Universal Developer SDK Reference

For zero-boilerplate client integration, use `@galxai/sdk`:

```typescript
import galx, { run, stream, extract, tool, generateImage } from 'galxai';

// 1. Tagged template literal
const summary = await galx`Summarize key facts on ${topic}`;

// 2. Direct 1-line execution
const answer = await run('Explain quantum mechanics');

// 3. Streaming async generator
for await (const chunk of stream('Write a poem')) {
  process.stdout.write(chunk);
}

// 4. Structured extraction
const user = await extract('Jane, 29, SF', { name: 'string', age: 'number', city: 'string' });
```






