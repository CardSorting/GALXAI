# 📖 GALXAI Universal API Reference

This document outlines the complete REST API specification for GALXAI endpoints, detailing all supported protocols, universal ingestion parameters, multi-header authentication methods, and edge gateway routes.

---

## 🔑 Authentication

GALXAI implements **Multi-Header & Query Parameter Ingestion** to absorb any developer auth pattern:

| Authentication Method | Example Format |
| :--- | :--- |
| **Standard Bearer Header** | `Authorization: Bearer galx_live_abcdef1234567890` |
| **Direct Authorization Header** | `Authorization: galx_live_abcdef1234567890` |
| **API Key Header** | `x-api-key: galx_live_abcdef1234567890` or `api-key: galx_live_...` |
| **GALX Key Header** | `x-galx-key: galx_live_abcdef1234567890` |
| **URL Search Parameter** | `https://galx.ai/v1/chat/completions?api_key=galx_live_...` |
| **Browser Session Cookie** | `Cookie: galx_session=galx_live_...` |

*(Note: Surrounding single/double quotes, `Bearer ` prefixes, and whitespace are automatically trimmed with zero errors).*

---

## 🌐 Edge Gateways & Ingress Base URLs

| Environment | Ingress Base URL | Regional Coverage |
| :--- | :--- | :--- |
| **Production Global Ingress** | `https://galx.ai/v1` (or `https://api.galx.ai/v1`) | 300+ Global Edge PoPs ($0 Egress) |
| **Ollama Local Dev Proxy** | `https://galx.ai` (`OLLAMA_HOST`) | Sub-15ms Anycast Edge Routing |
| **Multimodal R2 Media CDN** | `https://assets.galx.ai` | Global Anycast Storage CDN |

---

## 💬 Chat Completions (`POST /v1/chat/completions` & `GET /v1/chat/completions`)

Universal OpenAI-compatible chat completion endpoint with automatic quota cycling, reasoning support, and browser query execution.

### POST Request Body
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

### Hyper-Forgiving Ingestion
- **Raw Text Payloads**: If a client sends raw string text (`-d "Explain gravity"`), the gateway automatically converts it into `{ messages: [{ role: "user", content: "Explain gravity" }] }` with zero 400 errors.
- **Top-Level Prompts**: Accepts `prompt`, `input`, or `text` at root level.
- **Anthropic Systems**: Accepts root `system` string or content blocks array.

### Browser Address Bar Direct Query (`GET /v1/chat/completions`)
```text
https://galx.ai/v1/chat/completions?prompt=Explain+Raft+consensus&model=sol&api_key=galx_live_...
```

### Supported Flagship Models & Aliases
- `gpt-5.6-sol` (Aliases: `sol`, `gpt-5`, `flagship`, `sota`, `coding`, `claude-3-7-sonnet`, `deepseek-v3`, `gpt-4o`)
- `gpt-5.6-terra` (Aliases: `terra`, `balanced`, `reasoning`, `o1`, `o3-mini`, `deepseek-r1`)
- `gpt-5.6-luna` (Aliases: `luna`, `fast`, `cheap`, `velocity`, `gpt-4o-mini`, `gemini-2.0-flash`)
- `x-ai/grok-4.6` (Aliases: `grok`, `grok-4.6`, `grok-1m`, `1m`)
- `x-ai/grok-4.5` (Aliases: `grok-4.5`)

---

## 🤖 Anthropic Messages API (`POST /v1/messages`)

100% Drop-in compatibility for `@anthropic-ai/sdk` and Claude Code CLI.

### Request Body
```json
{
  "model": "claude-3-7-sonnet",
  "max_tokens": 2048,
  "system": "You are a senior database architect.",
  "messages": [
    { "role": "user", "content": "Explain write-ahead log micro-batching." }
  ]
}
```

### Response
```json
{
  "id": "msg_01abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Write-ahead log (WAL) micro-batching coalesces..." }
  ],
  "model": "gpt-5.6-sol",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 24,
    "output_tokens": 128
  }
}
```

---

## 🦙 Ollama Local Dev Protocol Suite (`/api/*`)

Allows OpenWebUI, Continue.dev, Ollama CLI, and Aider to connect with zero local configuration.

### 1. Generate Completion (`POST /api/generate` & `GET /api/generate`)
```bash
curl https://galx.ai/api/generate \
  -H "Authorization: Bearer galx_live_..." \
  -d '{
    "model": "sol",
    "prompt": "Explain zero-hesitation developer ergonomics",
    "stream": true
  }'
```
*Response: Streaming NDJSON chunks with `done: true` tail chunk.*

### 2. Ollama Chat (`POST /api/chat`)
```bash
curl https://galx.ai/api/chat \
  -H "Authorization: Bearer galx_live_..." \
  -d '{
    "model": "terra",
    "messages": [{"role": "user", "content": "Hello Ollama!"}],
    "stream": true
  }'
```

### 3. List Local Models (`GET /api/tags`)
Returns models in native Ollama tag schema (`{ "models": [...] }`).

### 4. Version Check (`GET /api/version`)
Returns `{ "version": "0.5.12-galxai-gateway" }`.

### 5. Model Information (`POST /api/show`)
Returns model architecture, context length, parameters, and template definitions.

---

## 🎨 Visual Synthesis & Image Generation (`POST /v1/images/generations`)

Visual synthesis endpoint routing across OpenAI and xAI Grok image generation engines with Midjourney/Flux aspect ratio absorption.

### Request Body
```json
{
  "model": "flux",
  "prompt": "Cybernetic space station overlooking a nebula in 8k octane render",
  "aspect_ratio": "16:9",
  "response_format": "url"
}
```

### Aspect Ratio Mapping
- `16:9` $\to$ `1792x1024`
- `9:16` $\to$ `1024x1792`
- `4:3` $\to$ `1024x768`
- `3:2` $\to$ `1536x1024`
- `1:1` $\to$ `1024x1024`

*(Assets are cached in Cloudflare R2 and served via `https://assets.galx.ai` with $0 egress bandwidth fees).*

---

## 📐 Vector Embeddings (`POST /v1/embeddings`)

High-velocity OpenAI-compatible vector embedding calculation computed directly at Cloudflare Edge PoPs (<15ms latency).

### Request Body
```json
{
  "model": "text-embedding-3-small",
  "input": ["Distributed agent mesh", "Zero-egress inference"]
}
```

---

## 📜 Legacy Completions (`POST /v1/completions`)

Legacy text completion endpoint for older SDKs and CLI scripts:
```json
{
  "model": "gpt-5.6-sol",
  "prompt": "Say hello to GALXAI",
  "max_tokens": 100
}
```

---

## 📋 Model Catalog & Discovery Endpoints

- **`GET /v1/models`**: Returns all available models with pricing, context limits, and capabilities (with Edge SWR caching).
- **`GET /v1/models/:id`**: Returns single model metadata by canonical ID or synonym alias (e.g. `/v1/models/sol` or `/v1/models/claude-3-7-sonnet`).
- **`GET /opensearch.xml`**: OpenSearch 1.1 browser auto-discovery for URL bar model search.
- **`GET /feed.xml`**: RSS 2.0 / Atom syndication feed of model updates and pricing revisions.
- **`GET /.well-known/security.txt`**: RFC 9116 vulnerability disclosure policy.

---

## ⚡ Asynchronous Task Queues (`/api/queues/*`)

- **`GET /api/queues`**: List all active queues, concurrency limits, and live telemetry.
- **`POST /api/queues/:queueId/tasks`**: Enqueue an asynchronous inference task.
- **`GET /api/queues/:queueId/tasks/:taskId`**: Poll task status, execution progress, and results.
- **`DELETE /api/queues/:queueId/tasks/:taskId`**: Cancel a pending task.

---

## 🩺 System Health & Telemetry (`/api/health`)

- **`GET /api/health`**: Real-time gateway status, model count, server timestamp, and runtime version.
- **`OPTIONS /api/health`**: Universal CORS pre-flight handler (HTTP 204).
