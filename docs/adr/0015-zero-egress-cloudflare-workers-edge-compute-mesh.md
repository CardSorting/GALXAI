# ADR 0015: Zero-Egress Cloudflare Workers Edge Compute Mesh

## Status
**Accepted & Implemented**

## Context
High-bandwidth AI inference systems encounter extreme egress bandwidth billing when proxying streaming Large Language Model (LLM) responses and image assets through centralized compute tiers. Standard cloud egress pricing ($0.09–$0.12 per GB) creates unsustainable unit economics under continuous token streaming workloads.

## Decision
1. **Decouple Edge Compute from Data Storage**:
   - Offload high-bandwidth ingress/egress, token-by-token Server-Sent Events (SSE) streaming transforms (`TransformStream`), and asynchronous queue pull workers to **Cloudflare Workers**.
   - Cloudflare Workers provide $0 outbound data egress fees across 300+ global edge Points of Presence.
2. **Direct Edge SSE Streaming**:
   - Model responses from upstream providers (OpenAI, xAI Grok) stream directly from edge PoPs to client sockets without intermediate database persistence or serialization.
3. **Multimodal Binary Offloading via Cloudflare R2**:
   - Large image synthesis binaries (FLUX, DALL-E) and audio files stream directly to Cloudflare R2 object storage with $0 egress fees, persisting only lightweight signed URL metadata in Supabase PostgreSQL.

## Consequences
### Positive
- **Zero Egress Bandwidth Fees**: Outbound token and media streams incur $0 egress cost.
- **Global Low-Latency Distribution**: Clients terminate SSL/TLS connections at the closest edge PoP (<20ms TTFT).
- **Reduced Central Compute Load**: Database operations are strictly constrained to preflight balance checks, auth hash lookups, and post-stream batch settlement.

### Neutral / Trade-offs
- Edge workers must run within V8 isolate constraints (Web Streams API, SubtleCrypto, Hyperdrive connection pooling).
