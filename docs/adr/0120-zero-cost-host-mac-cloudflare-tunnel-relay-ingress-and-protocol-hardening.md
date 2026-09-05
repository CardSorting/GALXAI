# ADR 0120: Zero-Cost Host Mac Cloudflare Tunnel Relay Ingress, PM2 Process Supervision, and Upstream Protocol Hardening

- **Status**: Accepted
- **Deciders**: GALXAI Infrastructure & Kernel Team, LUMI Architecture Group
- **Date**: 2026-09-05
- **Related ADRs**: [ADR 0112](0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md) · [ADR 0113](0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) · [ADR 0114](0114-uncertain-execution-authority-kernel-and-transactional-journal.md) · [ADR 0115](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md)

---

## Context

Frontier reasoning models (`gpt-5.6-sol`, `gpt-5.6-terra`, `o3`) executed over ChatGPT OAuth sessions require persistent, bidirectional WebSocket channels (`wss://chatgpt.com/backend-api/codex/responses`) with durations exceeding 120–180 seconds. As codified in ADR 0112 and ADR 0115, serverless edge runtimes (Cloudflare Workers, Vercel Edge Lambdas) cannot sustain these connections due to strict V8 isolate execution wall-clock limits and WAF datacenter IP challenges.

While the Always-On Relay daemon (`LUMI-NEW/src/relay/relay-server.ts`) successfully manages these persistent connections, a critical infrastructural mismatch arose during Vercel staging:
1. **Network Boundary Disconnect**: GALXAI’s web frontend and serverless API routes are hosted on Vercel (`galxai.com`). When Vercel serverless lambdas attempt to communicate with `http://localhost:3001`, the request targets the isolated AWS Lambda container sandbox, failing immediately.
2. **Cost Avoidance Constraint**: Before provisioning recurring paid cloud virtual machines (Solution B: Hetzner Cloud, Fly.io, Railway, or AWS Lightsail), the system required a deterministic, zero-cost development and staging ingress topology (Solution A) to empirically prove end-to-end viability.
3. **Upstream Protocol & Watchdog Failure Modes**: Live test runs exposed upstream WebSocket protocol friction points:
   - Request body parsing regression in `handleChatCompletions` (`Cannot find name 'body'`).
   - Upstream OpenAI WebSocket 400 Bad Request (`[StringParam] [instructions] [invalid_type] Invalid type for 'instructions': expected a string, but got an array instead`) triggered by array/multimodal prompt formats.
   - Premature dead-peer eviction triggered by the 5-second `heartbeatAckTimeoutTimer` during silent, multi-minute model reasoning phases before tokens start emitting.
   - Starvation of genuine ChatGPT OAuth session tokens caused by placeholder test shards with fake API keys registered in PostgreSQL at high priority.

---

## Decision

We adopt and institutionalize **Solution A: Zero-Cost Host Mac + Cloudflare Tunnel Ingress** backed by **PM2 Process Supervision** and hardened protocol adapters.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               SOLUTION A: ZERO-COST HYBRID TOPOLOGY                             │
│                                                                                                 │
│   ┌────────────────────────┐                  ┌─────────────────────────────────────────────┐   │
│   │   Vercel Deployment    │                  │          Cloudflare Edge Network            │   │
│   │   - Next.js 15 Lambda  │                  │  https://*.trycloudflare.com (Quick Tunnel) │   │
│   │   - VM_RELAY_URL       │─────────────────▶│  or relay.galxai.com (Named Tunnel)         │   │
│   └────────────────────────┘  HTTPS Egress    └──────────────────────┬──────────────────────┘   │
│                                                                      │ Encrypted Outbound       │
│                                                                      │ Wire (No Inbound Ports)  │
│                                                                      ▼                          │
│                                               ┌─────────────────────────────────────────────┐   │
│                                               │            Local Host Mac Machine           │   │
│                                               │                                             │   │
│                                               │   ┌─────────────────────────────────────┐   │   │
│                                               │   │  cloudflared tunnel daemon          │   │   │
│                                               │   │  (Routes traffic to localhost:3001) │   │   │
│                                               │   └──────────────────┬──────────────────┘   │   │
│                                               │                      ▼                      │   │
│                                               │   ┌─────────────────────────────────────┐   │   │
│                                               │   │  PM2 Daemon: galxai-relay           │   │   │
│                                               │   │  (LUMI-NEW/src/relay/relay-server)  │   │   │
│                                               │   └──────────────────┬──────────────────┘   │   │
│                                               │                      ▼ Persistent WSS       │   │
│                                               │   ┌─────────────────────────────────────┐   │   │
│                                               │   │  wss://chatgpt.com/backend-api/...  │   │   │
│                                               │   └─────────────────────────────────────┘   │   │
│                                               └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. PM2 Process Supervision (`ecosystem.config.cjs`)
The relay daemon is managed locally via PM2 with:
- Dedicated process namespace (`galxai-relay`).
- Autorestart on unexpected crashes with memory threshold restarts (`max_memory_restart: '1G'`).
- Bounded file logging to `~/.lumi/logs/relay.log` and `~/.lumi/logs/relay.err`.
- Execution through tsx (`./node_modules/.bin/tsx`) without requiring root/sudo privileges on macOS.

### 2. Cloudflare Zero-Trust Tunnel Ingress
- `cloudflared` establishes an encrypted outbound tunnel from the local Mac to Cloudflare edge PoPs.
- Traffic is proxied to `http://localhost:3001` without exposing local router ports, configuring dynamic DNS, or leasing static public IPs.
- Vercel serverless environments route traffic using the `VM_RELAY_URL` environment variable pointing to the tunnel URL.

### 3. Upstream WebSocket Wire Protocol Hardening
In [`src/relay/relay-server.ts`](file:///Users/bozoegg/Desktop/LUMI-NEW/src/relay/relay-server.ts):
- **Request Body & Scope Normalization**: Safely parses the incoming payload (`const body = bodyText.trim() ? JSON.parse(bodyText) : {};`) and maps `gpt-5.6-sol` requests to `gpt-5.6-terra` for OAuth scope compliance with ChatGPT session tokens.
- **Multimodal / Array Content Serialization**: Coerces non-string message arrays into clean text snippets before assembling `instructions` and `input_text` payloads, eliminating upstream OpenAI 400 Bad Request schema errors.
- **RFC 6455 Protocol Pong Integration**: Added `(ws as any).on('pong')` listener to capture lower-level RFC 6455 protocol pongs returned by upstream WebSocket peers.
- **Reasoning-Aware Pong Watchdog**: Guarded `heartbeatAckTimeoutTimer` (5000ms watchdog) so that if the peer is within the active intra-chunk timeout window (`Date.now() - session.lastSeenAliveMs < wsIntraChunkTimeoutMs`), the timer disarms rather than evicting the peer during silent model reasoning.

### 4. Transparent Decoupled Ingress in `OpenAIAdapter.ts`
In [`src/core/router/adapters/OpenAIAdapter.ts`](file:///Users/bozoegg/Desktop/GALXAI/src/core/router/adapters/OpenAIAdapter.ts):
- Transparently intercepts HTTP 202 responses from the relay daemon.
- For streaming requests (`body.stream === true`), pipes the SSE event stream from `/v1/jobs/:id/stream` directly to the downstream consumer.
- For non-streaming requests (`body.stream === false`), attaches to `/v1/jobs/:id/stream`, accumulates token deltas until `data: [DONE]`, and synthesizes standard OpenAI JSON (`chat.completion`).

### 5. PostgreSQL Shard Hygiene
- Purged 32 placeholder mock shards with fake API keys (`sk-openai-live-secret-test-key-12345`) from `public.galx_shard_accounts` that were artificially prioritized over valid ChatGPT OAuth credentials.

---

## Verification & Empirical Evidence

The architecture was verified via [`scripts/test-inference-pipeline.ts`](file:///Users/bozoegg/Desktop/GALXAI/scripts/test-inference-pipeline.ts) executed through the live Cloudflare Tunnel (`https://ddr-lesser-individuals-panels.trycloudflare.com`):

```text
======================================================================
   ✨ REAL INFERENCE PIPELINE PASSED IN 165479ms (100% INTEGRITY)
   🎉 ALL SAMPLE PROJECTS CREATED IN: output-test/
======================================================================
```

1. **Compilation**: Both `GALXAI` and `LUMI-NEW` compile cleanly with zero TypeScript errors (`npx tsc --noEmit`).
2. **Phase 3 (Streaming SSE)**: Streamed 904 SSE chunks (2,512 characters) in 64,233ms, generating a functional, self-contained HTML5 Canvas game ([`output-test/projects/cyber-snake-arcade/index.html`](file:///Users/bozoegg/Desktop/GALXAI/output-test/projects/cyber-snake-arcade/index.html)).
3. **Phase 4 (Non-Streaming)**: Generated 1,075 tokens in 100,604ms, producing a complete 5-file TypeScript package ([`output-test/projects/rate-governor-service/`](file:///Users/bozoegg/Desktop/GALXAI/output-test/projects/rate-governor-service/)).
4. **Phase 5–7 (Ledger & Revocation)**: $0.0050 wallet hold created, $0.0018 settled, $0.0032 refunded to ledger; instant HTTP 401 fail-closed verification upon key revocation.
5. **Cost**: **$0.00** total infrastructure expenditure.

---

## Consequences

- **Positive**: Complete validation of long-lived frontier model inference between Vercel serverless edge and upstream Codex WebSockets without paying for cloud VPS infrastructure during active development.
- **Positive**: Zero risk of false-positive dead-peer evictions during complex reasoning phases.
- **Trade-Off**: Quick tunnels (`*.trycloudflare.com`) generate ephemeral URLs upon tunnel process restart. For continuous staging, a persistent named tunnel (`cloudflared tunnel create galxai-relay`) or transition to Solution B (Dedicated Cloud VM) remains the production graduation path.
