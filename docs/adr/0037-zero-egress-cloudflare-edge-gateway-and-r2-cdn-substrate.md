# ADR 0037: Zero-Egress Cloudflare Edge Gateway, R2 CDN & Custom Domain Substrate

## Status
**Accepted & Implemented**

## Context
High-bandwidth Large Language Model (LLM) streaming inference and multimodal image/audio asset synthesis incur crippling egress bandwidth billing ($0.09–$0.12/GB) and high connection establishment latencies (80–150ms) when routed through centralized origin web servers. Enterprise agentic swarms require low Time-to-First-Token (TTFT), custom domain brand masking (`api.galx.ai`), and seamless drop-in OpenAI API compatibility.

## Decision
1. **Decoupled Edge Compute & Ingress Mesh**:
   - Deploy `GalxEdgeGateway` on Cloudflare Workers across 300+ global Points of Presence (PoPs), terminating TLS 1.3 at the nearest physical edge location (<15ms latency).
   - Route production traffic through Custom Domain `api.galx.ai` and staging traffic through `api-staging.galx.ai`.
   - Maintain dual-route resilience with fallback `workers.dev` routing (`https://galxai-edge-gateway.notsosuper688651.workers.dev`).

2. **Direct SSE Stream Transform**:
   - Upstream streaming responses from OpenAI and xAI Grok provider shards stream directly to client sockets via the native Web Streams API (`TransformStream`), bypassing intermediate database serialization and incurring **$0 outbound data egress fees**.

3. **Multimodal Binary Offloading via Cloudflare R2**:
   - Visual synthesis outputs (`openai-gpt-image-2`, `openai-dalle-3`) and audio buffers are streamed straight to Cloudflare R2 bucket `galxai-assets` via `GalxR2AssetAdapter` and direct edge upload (`PUT /v1/assets/upload`).
   - Assets are delivered to clients over the global Anycast CDN custom domain `assets.galx.ai` (and staging `assets-staging.galx.ai`) with full CORS support and zero egress bandwidth penalty.
   - Authoritative PostgreSQL stores only compact URI references.

## Consequences

### Positive
- **Zero Egress Bandwidth Expenses**: Outbound streaming tokens and high-resolution image binaries incur $0 egress cost across all global regions.
- **Ultra-Low TTFT**: Client TLS handshakes terminate in $<15\text{ms}$ at the nearest edge PoP.
- **Isolated Staging Perimeter**: Independent staging KV, R2 (`galxai-assets-staging`), and worker deployment (`galxai-edge-gateway-staging`) prevents test pollution.
- **Enterprise Brand Integrity**: Endpoints are cleanly masked under the root domain `galx.ai`.

### Neutral / Trade-offs
- Custom domain SSL certificates require automated Cloudflare Universal SSL validation.
- Edge workers must execute within V8 isolate constraints (Web Streams API, SubtleCrypto, and Node.js compatibility flags).
