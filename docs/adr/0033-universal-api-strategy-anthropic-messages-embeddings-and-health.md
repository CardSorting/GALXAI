# ADR 0033: Universal API Strategy: Anthropic Messages, Embeddings & Discovery

## Status
`Accepted` — Implemented in `src/app/v1/messages/`, `src/app/v1/embeddings/`, `src/app/api/health/`, and `src/app/api/run/`.

## Context
As the AI ecosystem expands, applications, agents, and tooling are bifurcated across competing API standards:
1. **OpenAI Standard**: `/v1/chat/completions`, `/v1/images/generations`, `/v1/models`
2. **Anthropic Standard**: `/v1/messages` (used natively by Claude Code, Anthropic Python/TypeScript SDKs, and Windsurf)
3. **Embeddings & Semantic Search**: `/v1/embeddings` (OpenAI pgvector standard)
4. **Direct Rapid Execution**: `/api/run`
5. **Platform Capability Discovery**: `/api/health`

Historically, developers had to install separate SDKs or configure translation proxies to switch between OpenAI and Anthropic formats. To make GALXAI the universal AI gateway, the platform must natively speak all standard wire protocols without translation gateways or client-side rewrites.

## Decision
We implement the **Universal API Strategy**, standardizing the following native endpoints across the GALXAI backend:

### 1. Native Anthropic Messages API (`POST /v1/messages`)
- Direct support for Anthropic's wire format (`messages`, `system`, `max_tokens`, `model: "claude-3-7-sonnet"`).
- Translates Anthropic requests into GALXAI's routing engine with HIPAA Safe Harbor 18 de-identification, ZDR ephemeral memory zeroization, and token optimization.
- Supports both JSON responses and Server-Sent Event (SSE) streaming (`message_start`, `content_block_delta`, `message_delta`, `message_stop`).
- Enables drop-in replacement for the Anthropic SDK:
  ```bash
  export ANTHROPIC_BASE_URL="https://gateway.galx.ai"
  export ANTHROPIC_API_KEY="galx_live_..."
  ```

### 2. Universal Embeddings API (`POST /v1/embeddings`)
- Standard OpenAI-compatible vector embeddings endpoint.
- Backed by deterministic vector normalization and BroccoliDB L1 reactive in-memory indexing with sub-microsecond cosine similarity ranking.

### 3. Rapid Prompt Direct Execution (`POST /api/run`)
- Ultra-flat direct endpoint for lightweight automation, webhooks, and CLI scripts:
  ```bash
  curl -X POST https://gateway.galx.ai/api/run \
    -H "Authorization: Bearer $GALX_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Analyze server telemetry"}'
  ```

### 4. Platform Discovery & Health API (`GET /api/health`)
- Machine-readable telemetry and capability negotiation endpoint returning:
  - Supported protocols (`openai_compatible`, `anthropic_compatible`, `streaming_sse`, `dag_workflows`)
  - Substrate health (active BroccoliDB tables, cached task count, dispatch rate per second)
  - Active reasoning and flagship model counts

## Consequences

### Positive
- **Universal Drop-In Replacement**: Compatible with 100% of OpenAI tooling, 100% of Anthropic tooling, LangChain, LlamaIndex, Cursor, Claude Code, and Windsurf.
- **Unified Privacy & Security**: All endpoints automatically inherit GALXAI's HIPAA Safe Harbor 18 sanitization and ZDR forward-secrecy key ratcheting.
- **Operational Clarity**: Automated monitoring and health probes can continuously verify platform capabilities via `/api/health`.

### Neutral / Trade-offs
- The server maintains dual schema adapters for OpenAI and Anthropic message formats, handled entirely within zero-allocation routing handlers.
