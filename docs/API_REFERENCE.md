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
- `gpt-5.6-sol` (OpenAI Flagship Reasoning, 372K context)
- `gpt-5.6-terra` (OpenAI Balanced LLM, 186K context)
- `gpt-5.6-luna` (OpenAI High-Speed Lightweight, 93K context)
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
      "context_window": 372000,
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
