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

---

## 🔐 Enterprise OAuth 2.1 & Token Lifecycle Endpoints

### 1. OpenID Connect Discovery
- **`GET /.well-known/openid-configuration`**: Standard RFC 8414 server metadata discovery.
- **`GET /api/auth/vault/jwks`**: RFC 7517 JSON Web Key Set containing active KMS public verification keys.

### 2. RFC 9126 Pushed Authorization Requests (PAR)
- **`POST /api/auth/oauth/par`**
  - **Headers**: `Content-Type: application/x-www-form-urlencoded`
  - **Parameters**: `client_id`, `redirect_uri`, `scope`, `code_challenge`, `code_challenge_method=S256`
  - **Response (201 Created)**: `{"request_uri": "urn:ietf:params:oauth:request_uri:...", "expires_in": 90}`

### 3. RFC 8628 Device Authorization Grant (Headless CLI / Remote SSH)
- **`POST /api/auth/oauth/device/code`**
  - **Body**: `{"provider": "openai" | "xai-grok", "scopes": ["openid", "profile"]}`
  - **Response (200 OK)**: `{"device_code": "...", "user_code": "WDJB-MJHT", "verification_uri": "https://galx.ai/device", "verification_uri_complete": "https://galx.ai/device?code=WDJB-MJHT", "expires_in": 900, "interval": 5}`
- **`POST /api/auth/oauth/device/token`**
  - **Body**: `{"device_code": "..."}`
  - **Response (200 OK)**: `{"access_token": "galx_sess_v2...", "token_type": "Bearer", "expires_in": 2592000}`
  - **Error (400 Bad Request)**: `{"error": "authorization_pending" | "slow_down" | "expired_token"}`

### 4. RFC 7009 Token Revocation
- **`POST /api/auth/oauth/revoke`**
  - **Body**: `{"token": "galx_sess_v2...", "token_type_hint": "access_token" | "refresh_token"}`
  - **Response (200 OK)**: `{"revoked": true}`

### 5. RFC 7662 Token Introspection
- **`POST /api/auth/oauth/introspect`**
  - **Body**: `{"token": "galx_sess_v2..."}`
  - **Response (200 OK)**: `{"active": true, "sub": "user_123", "scope": "openid profile", "provider": "openai", "exp": 1726937678, "iat": 1724345678, "token_type": "Bearer"}`

### 6. OpenID Connect Back-Channel Logout 1.0
- **`POST /api/auth/oauth/backchannel-logout`**
  - **Headers**: `Content-Type: application/x-www-form-urlencoded`
  - **Body**: `logout_token=<JWT>`
  - **Response (200 OK)**: `{"success": true, "revoked": true}`

### 7. Step-Up SUDO Elevation & Session Management
- **`POST /api/auth/sudo/elevate`**: Elevates session to privileged SUDO mode for 15 minutes.
- **`POST /api/auth/session/refresh`**: Executes atomic Refresh Token Rotation with 30s anti-replay grace window.
- **`GET /api/auth/sessions`**: Lists all active devices with client fingerprint badges.
- **`DELETE /api/auth/sessions`**: Revokes all remote sessions except the current active session.
- **`GET /api/auth/security/posture`**: Returns composite security grade (`A+` to `C`), risk score, and recommendations.

---

## 🛡️ Autonomous Backend Ingestion Gateway (`POST /api/auth/ingest` & `POST /api/ingest`)

Apex-tier transport ingestion endpoint for external CLI tools (e.g. `LUMI-NEW`) and automated backend runners to vault upstream provider credentials (OpenAI, xAI Grok, Anthropic) into Substrate tenant shards.

### Headers Specification
| Header | Type | Description |
| :--- | :--- | :--- |
| `Content-Type` | String | **Required**. Must be `application/json` (HTTP 415 on mismatch). |
| `Digest` | String | **Recommended**. RFC 9530 SHA-256 payload integrity digest (`sha-256=<base64>`). |
| `Idempotency-Key` | String | **Recommended**. IETF Idempotency Key for 24-hour retry deduplication. |
| `X-Request-Timestamp` | Integer | **Recommended**. Unix timestamp in ms (skew must be within ±300s). |
| `X-Request-Nonce` | String | **Recommended**. Single-use random hex nonce (10-minute anti-replay TTL). |
| `X-Correlation-Id` | String | Optional. Client distributed trace identifier. |

### Request Body Schema
```json
{
  "provider": "openai" | "xai-grok",
  "accessToken": "ey...",
  "refreshToken": "rt...",
  "accountId": "acc_12345",
  "idToken": "ey...",
  "expiresAtMs": 1724528600000,
  "mode": "pooled" | "private",
  "email": "engineer@company.com",
  "displayName": "Lead Engineer"
}
```

### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "user": {
    "id": "openai_lz4m...",
    "email": "engineer@company.com",
    "name": "Lead Engineer",
    "provider": "openai",
    "shardId": "codex_openai_lz4m_1724525000000",
    "shardMode": "pooled",
    "token": "galx_sess_v2_...",
    "scopes": ["*"],
    "expiresAtMs": 1727117000000
  }
}
```

### Response Headers
- `Server-Timing`: High-resolution microsecond duration (`total;dur=2.45;desc="Ingestion Processing"`).
- `Idempotent-Replay`: Returned as `"true"` when serving a duplicate request from the 24-hour cache.
- `X-Correlation-Id`: Propagated request trace ID.
- `Cache-Control`: `no-store, no-cache, must-revalidate, private, no-transform`.

### Error Response Schema (RFC 7807)
```json
{
  "type": "https://galx.ai/errors/integrity_check_failed",
  "title": "INTEGRITY CHECK FAILED",
  "status": 400,
  "detail": "Payload content digest does not match SHA-256 checksum",
  "code": "INTEGRITY_CHECK_FAILED",
  "instance": "/api/auth/ingest",
  "correlationId": "corr_lz4m_88f2"
}
```

---

## 🌐 Frontend Platform Supabase OAuth (`/auth/callback` & `/auth/connect`)

Standard, user-facing authentication managing platform accounts, developer dashboards, billing wallets, and project API keys via `@supabase/ssr`.

- **`GET /auth/callback`**: Next.js App Router route handler exchanging OAuth authorization codes for Supabase cookies via `exchangeCodeForSession(code)`.
- **`GET /auth/connect`**: 1-Click developer login portal supporting GitHub, Google, and Email Magic Links. Zero sharding exposure.


