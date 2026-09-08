# 📖 GALXAI Universal API Reference

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

> Application/SDK scope: these interfaces do not replace the [federation contract](FEDERATION_STRATEGY.md). Model eligibility precedes load; no implicit model substitution occurs in the federation. The [Codex image alias](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility) is opt-in, verified, and provider-managed. Use the [recovery table](RELAY_API_REFERENCE.md#request-recovery) for accepted or uncertain work. Server credentials must never enter browser bundles.

> Runtime boundary: this guide describes the product/application API. The federation relay has a separate [API contract](RELAY_API_REFERENCE.md), inference and administrator keys, and an HTTP 202 chat job workflow. Its local deployment is covered by the [relay runbook](RELAY_VNEXT_RUNBOOK.md). Product keys, relay keys, and upstream provider credentials are distinct.

This document outlines the complete REST API specification for GALXAI endpoints, detailing all supported protocols, universal ingestion parameters, multi-header authentication methods, and edge gateway routes.

These endpoints are integration contracts for applications, agents, IDEs, CLIs, and developer tooling. GALXAI does not provide a hosted chat or image-studio destination; see [Product Surface Strategy](PRODUCT_SURFACE_STRATEGY.md).

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
| **Application API** | `https://galx.ai/v1` | Application model router |
| **Ollama Local Dev Proxy** | `https://galx.ai` (`OLLAMA_HOST`) | Configured gateway routing |
| **Multimodal R2 Media CDN** | `https://assets.galx.ai` | Global Anycast Storage CDN |

---

## Chat Completions Protocol (`POST /v1/chat/completions` & `GET /v1/chat/completions`)

Universal OpenAI-compatible inference endpoint with automatic quota cycling, reasoning support, and compatibility query ingestion.

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

### Hyper-Forgiving Ingestion, Rolling Context & Seat Governance
- **Dynamic Context Sizing (Zero Artificial Clamps)**: Supports dynamic high-velocity multi-page payloads scaled up to the model's full **1,050,000 frontier token context window** (~3,000–4,000 pages of text) with up to **128,000 output tokens**.
- **Hybrid Rolling Memory Mesh (`x-galx-rolling-memory: true`)**: Activates the 5-level multi-resolution context pyramid in L1 BroccoliDB RAM, providing sub-millisecond retrieval of earlier conversational turns without token explosion.
- **Pre-Inference Input Compaction (`x-galx-compact: true`)**: Automatically runs incoming user context through BroccoliDB to reduce representation redundancy before dispatching to upstream frontier models.
- **Explicit Mode Override (`x-galx-compaction-mode: "ebpf_stream"`)**: Selects any of the 19 compaction modes (`domain`, `ebpf_stream`, `k8s_watch_stream`, `sensor_stream`, `document`, `incident`).
- **Raw Text Payloads**: If a client sends raw string text (`-d "Explain gravity"`), the gateway automatically converts it into `{ messages: [{ role: "user", content: "Explain gravity" }] }` with zero 400 errors.
- **Top-Level Prompts**: Accepts `prompt`, `input`, or `text` at root level.
- **Anthropic Systems**: Accepts root `system` string or content blocks array.

### Response Headers
- `x-galx-stable-cache-hash`: Deterministic SHA-256 fingerprint of the prompt cache prefix block.
- `x-galx-rolling-memory-compacted`: `true` when intermediate conversation turns were compacted into memory blocks.
- `x-galx-seat-5h-limit-remaining`: Remaining percentage of user's 5-hour rolling window quota (e.g. `90%`).
- `x-galx-seat-weekly-limit-remaining`: Remaining percentage of user's weekly rolling window quota (e.g. `55%`).
- `x-galx-seat-5h-refresh`: Formatted natural duration string to full 5-hour refresh (e.g. `4 hours, 17 minutes`).
- `x-galx-seat-weekly-refresh`: Formatted natural duration string to full weekly refresh (e.g. `3 days`).

### Compatibility GET Query (`GET /v1/chat/completions`)
```bash
curl --get 'https://galx.ai/v1/chat/completions' \
  --data-urlencode 'prompt=Explain Raft consensus' \
  --data-urlencode 'model=sol' \
  -H 'Authorization: Bearer galx_live_...'
```

Use `POST` with an authorization header for production integrations. The GET form exists for protocol compatibility and diagnostics; it is not a hosted browser chat surface. Avoid credentials in URLs because URLs can be retained by browser history, proxies, and access logs.


### Supported Flagship Models & Aliases
- `gpt-5.6-sol` (Aliases: `sol`, `gpt-5`, `flagship`, `sota`, `coding`, `claude-3-7-sonnet`, `deepseek-v3`, `gpt-4o`)
- `gpt-5.6-terra` (Aliases: `terra`, `balanced`, `reasoning`, `o1`, `o3-mini`, `deepseek-r1`)
- `gpt-5.6-luna` (Aliases: `luna`, `fast`, `cheap`, `velocity`, `gpt-4o-mini`, `gemini-2.0-flash`)
- `x-ai/grok-4.6` (Aliases: `grok`, `grok-4.6`, `grok-1m`, `1m`)
- `x-ai/grok-4.5` (Aliases: `grok-4.5`)

---

## 🤖 Anthropic Messages API (`POST /v1/messages`)

Compatibility endpoints for `@anthropic-ai/sdk` and Claude Code CLI.

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

Application image-generation endpoint. Routing depends on the configured adapter and model. The application can delegate inference to the federation relay and manage R2 user/session assets separately; a base64 relay result does not establish a successful R2 upload. Examples below are illustrative, not live deployment evidence.

### Request Headers
- `Authorization: Bearer <galx_api_key>` (Standard developer key or session token)
- `x-galx-session-id: <sessionId>` (Optional: binds generation to an interactive chat/agent session)
- `Idempotency-Key: <key>` (Optional operation identity; retain the same payload and inspect execution state/scope before retrying. This is not a durable exactly-once guarantee.)

### Request Body
```json
{
  "model": "openai-gpt-image-2",
  "prompt": "Cybernetic space station overlooking a nebula in 8k octane render",
  "aspect_ratio": "16:9",
  "quality": "hd",
  "response_format": "url",
  "sessionId": "sess_exploration_01"
}
```

### Requested aspect ratio mapping

These are requested application parameters, not output guarantees on the Codex image-tool compatibility route. Validate returned dimensions and inspect `execution` metadata. Native API-key model support is separate.
- `16:9` $\to$ `1792x1024`
- `9:16` $\to$ `1024x1792`
- `4:3` $\to$ `1024x768`
- `3:2` $\to$ `1536x1024`
- `1:1` $\to$ `1024x1024`

### Enriched Response Schema
```json
{
  "created": 1788620312,
  "data": [
    {
      "url": "https://assets.galx.ai/users/usr_123/sessions/sess_exploration_01/images/img_1788620312701_a883c58d.png",
      "r2_url": "https://assets.galx.ai/users/usr_123/sessions/sess_exploration_01/images/img_1788620312701_a883c58d.png",
      "r2_key": "users/usr_123/sessions/sess_exploration_01/images/img_1788620312701_a883c58d.png",
      "asset_id": "img_1788620312701_a883c58d",
      "user_id": "usr_123",
      "session_id": "sess_exploration_01",
      "content_type": "image/png",
      "size_bytes": 2641455,
      "sha256": "33086f7ba7e48b11c7509...",
      "lqip": "data:image/svg+xml;utf8,%3Csvg...",
      "revised_prompt": "Cinematic wide-angle view of a monolithic cybernetic space station..."
    }
  ],
  "modelUsed": "openai-gpt-image-2"
}
```

### Server-side request pattern

```typescript
// Server-side only. Browser components call your authenticated application backend:
const response = await fetch('https://galx.ai/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GALXAI_API_KEY}`,
    'x-galx-session-id': 'session_interactive_01',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({
    model: 'openai-gpt-image-2',
    prompt: 'A cyberpunk city street in rain with neon reflections',
    aspect_ratio: '16:9',
    sessionId: 'session_interactive_01',
  }),
});

const { data } = await response.json();
// data[0].url      -> "https://assets.galx.ai/users/.../images/...png" (Lossless PNG)
// data[0].r2_url   -> Permanent CDN object URL
// data[0].lqip     -> "data:image/svg+xml;utf8,..." (Dynamic SVG Blur Placeholder for instant blur-up)
// data[0].asset_id -> "img_1788620541677_b68da3a9"
```

---

## 🖼️ Session Visual Gallery & Lifecycle (`/v1/images/sessions/*`)

### 1. List Session Visual Assets (`GET /v1/images/sessions/:sessionId`)
Retrieves the session manifest and its retained image entries. The manifest is a bounded latest-100 read-modify-write index, not a complete or transactionally updated image history.

**Response**:
```json
{
  "object": "list",
  "session_id": "sess_exploration_01",
  "user_id": "usr_123",
  "manifest": {
    "sessionId": "sess_exploration_01",
    "userId": "usr_123",
    "totalImages": 2,
    "totalBytes": 3523052,
    "createdAtMs": 1788620541677,
    "updatedAtMs": 1788620632639
  },
  "total": 2,
  "data": [
    {
      "assetId": "img_1788620312701_a883c58d",
      "key": "users/usr_123/sessions/sess_exploration_01/images/img_1788620312701_a883c58d.png",
      "publicUrl": "https://assets.galx.ai/users/usr_123/sessions/sess_exploration_01/images/img_1788620312701_a883c58d.png",
      "sizeBytes": 2641455,
      "contentType": "image/png",
      "lqipDataUri": "data:image/svg+xml;utf8,%3Csvg..."
    }
  ]
}
```

### 2. Session Prefix Purge (`DELETE /v1/images/sessions/:sessionId`)
Deletes objects under the session prefix (`users/{userId}/sessions/{sessionId}/`) using listing and batch deletion, with application index cleanup. This is a multi-operation, nontransactional workflow; partial failure is possible. Session manifests use read-modify-write and retain a bounded latest 100 entries, so they are not a complete immutable history. See [ADR 0121](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md).

**Response**:
```json
{
  "object": "session.deleted",
  "session_id": "sess_exploration_01",
  "user_id": "usr_123",
  "deleted_count": 3,
  "status": "ok"
}
```

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

## 🥦 BroccoliDB Data Compaction & Ingestion Gateway (`POST /api/audit/broccolidb/compact` & `POST /api/broccolidb/compact`)

High-velocity, size-bounded data compaction, streaming deduplication, mega-incident cascading, and hierarchical document summarization with fail-closed provenance validation.

### Endpoints
- `POST /api/audit/broccolidb/compact` (Authoritative Gateway)
- `POST /api/broccolidb/compact` (Direct Alias)
- `GET /api/audit/broccolidb/compact` (Health & Capacity Introspection)
- `OPTIONS /api/audit/broccolidb/compact` (CORS Preflight)

### Request Headers
| Header | Type | Description |
| :--- | :--- | :--- |
| `Content-Type` | String | `application/json` |
| `Authorization` | String | `Bearer <token>` or `<api-key>` |
| `x-api-key` / `x-galx-key` | String | Alternative API key header formats |

### Supported Modes & Request Schemas

Supports 19 specialized compaction modes:

| CompactionMode | Purpose | Payload Fields | Typical Token Savings |
| :--- | :--- | :--- | :---: |
| `domain` | 180 enterprise industry domains | `text`, `domainHint` | 70% – 85% |
| `batch` | High-velocity multi-item batch | `items`, `options` | 75% – 85% |
| `incident` | 2,000+ page log storm cascader | `rawStreamText`, `targetTokenBudget` | 95% – 99% |
| `document` | 300+ page legal/technical pyramid | `rawText`, `title` | 90% – 98% |
| `log_stream` | Drain log pattern clustering | `logs` (array of strings) | 90% – 98% |
| `metric_stream` | TSDB metric time-series downsampling | `metrics` (timestamped points) | 85% – 95% |
| `trace_stream` | OTel trace DAG & latency critical path | `spans` (span objects) | 90% – 95% |
| `structured_stream` | High-velocity JSON/JSONL stream | `events` (JSON records) | 80% – 90% |
| `network_stream` | NetFlow / PCAP security traffic | `flows` (NetFlow records) | 90% – 96% |
| `orderbook_stream` | L2/L3 order book depth & trades | `orderBook` / `ticks` | 85% – 95% |
| `window_stream` | Sliding temporal window aggregation | `window` (sliding stream) | 80% – 92% |
| `sensor_stream` | Industrial IoT sensor telemetry | `readings` (IoT sensor points) | 85% – 95% |
| `clickstream` | Real user monitoring (RUM) sessions | `events` (clickstream records) | 85% – 95% |
| `genomic_stream` | VCF/SAM variant and sequence data | `variants` (genomic records) | 90% – 98% |
| `stream_envelope` | Multi-stream multiplexing | `streams` (composite streams) | 85% – 95% |
| `ebpf_stream` | Linux kernel syscalls & MITRE TTPs | `events` (eBPF syscall events) | 95% – 98% |
| `k8s_watch_stream` | Kubernetes event stream & pod restarts | `events` (K8s watch deltas) | 90% – 96% |
| `geospatial_stream` | AIS vessel & ADS-B flight telemetry | `points` (lat/lon/alt coords) | 92% – 98% |
| `arrow_dict_stream` | Apache Arrow dictionary encoding | `columns` (column arrays) | 80% – 90% |
| `select_representation` | Adaptive representation selection & density bypass | `text`, `taskType`, `tokenBudget` | 0% (ID Bypass) or 50%–92% (Noise Pruning) |

### Representation Selection & Adaptive Density Gate (ADR 0067)
When passing `mode: "select_representation"` or setting `x-galx-compact: true` on chat routes:
- **Clean Contexts (<200 tokens)**: Bypasses compaction automatically (`BYPASS_IDENTITY`), returning raw text with zero token overhead and 100% baseline preservation.
- **Institutionally Noisy Contexts**: Invokes `BroccoliArchitectureInvariantCompactor` to prune superseded ADRs, meeting minutes, and RFC forms while elevating active code constraints (`RS256`, `zeroizeBuffer`, `runtime = 'edge'`).

```json
// Example POST /api/audit/broccolidb/compact
{
  "mode": "select_representation",
  "text": "## ACTIVE CODE BASE INVARIANTS:\n- Invariant 1: JWT authorization must use RS256 with key version v2.\n\n## INSTITUTIONAL GOVERNANCE:\nRFC-9482: GUIDELINES FOR DUAL-KEY ROTATION CEREMONY...",
  "taskType": "architecture_invariants"
}

// Response (200 OK)
{
  "mode": "select_representation",
  "decision": "COMPACT_GOVERNANCE",
  "selectedRepresentation": "## ACTIVE ACTION-SAFE CODE INVARIANTS (2026):\n- Invariant 1: JWT authorization must use RS256 with key version v2.\n\n[PRUNED 1 DEPRECATED ADRS, MINUTES & GOVERNANCE CEREMONIES]",
  "originalTokens": 1402,
  "outputTokens": 111,
  "reductionPercentage": 92.1,
  "reason": "Filtered 1 institutional noise records while preserving binding active code invariants."
}
```

#### Example 1: Linux Kernel eBPF Stream Compaction (`mode: "ebpf_stream"`)

```json
{
  "mode": "ebpf_stream",
  "events": [
    { "timestamp": 1724528600000, "pid": 1234, "comm": "nc", "syscall": "connect", "ret": 0, "args": { "ip": "10.0.0.5", "port": 4444 } },
    { "timestamp": 1724528600100, "pid": 1234, "comm": "sh", "syscall": "execve", "ret": 0, "args": { "filename": "/bin/sh" } }
  ]
}
```

#### Example 2: Kubernetes Watch Stream Compaction (`mode: "k8s_watch_stream"`)
```json
{
  "mode": "k8s_watch_stream",
  "events": [
    { "type": "MODIFIED", "object": { "kind": "Pod", "metadata": { "name": "payment-api-7b8f9" }, "status": { "phase": "Failed", "reason": "CrashLoopBackOff" } } }
  ]
}
```

#### Example 3: AIS / ADS-B Geospatial Stream Compaction (`mode: "geospatial_stream"`)
```json
{
  "mode": "geospatial_stream",
  "points": [
    { "entityId": "VESSEL-US-9821", "latitude": 37.7749, "longitude": -122.4194, "altitude": 0, "timestamp": 1724528600000 }
  ]
}
```

### Success Response (HTTP 200 OK)
```json
{
  "status": "success",
  "mode": "domain",
  "data": {
    "domain": "Interrogatory",
    "cluster": "Legal & IP",
    "originalTokens": 672,
    "compactedTokens": 168,
    "tokensSaved": 504,
    "savingsPercentage": 75.0,
    "compactedPrompt": "=== LITIGATION INTERROGATORY RECORD ===\n...",
    "fidelityStatus": "verified",
    "unsupportedFacts": []
  },
  "authenticatedUser": "user_lz4m_88f2",
  "timestampMs": 1724528600000
}
```

### Defensive Size Limits
- **Max Payload Size**: 10MB (`HTTP 413 Payload Too Large`)
- **Max Text Character Length**: 2,000,000 characters
- **Max Batch Item Count**: 10,000 items
- **Incident Token Budget**: 1,024 to 128,000 tokens


