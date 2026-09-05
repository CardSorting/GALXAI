# 🌐 Maintainer Runbook: Cloudflare Edge Mesh & Workers Substrate

> **Target Audience**: Edge SREs, Cloud Infrastructure Maintainers, and Gateway Operators.  
> **Subsystem**: `cloudflare-edge/`, `RATE_LIMIT_KV`, `R2 CDN`, and `GalxSwarmCoordinatorDO`.

---

## 1. Edge Topology & 300+ PoP Deployment Mesh

The Cloudflare Edge Mesh handles high-throughput ingress, sliding-window rate limiting, and zero-copy streaming:

```mermaid
flowchart TD
    Client[Incoming Request] --> Anycast[300+ Cloudflare Edge PoPs]
    
    subgraph Edge Worker Pipeline
        Anycast --> PrefixCheck[Fast-Path Key Prefix Check]
        PrefixCheck --> RateKV[RATE_LIMIT_KV Sliding-Window Bucket]
        RateKV --> SWR[Stale-While-Revalidate Model Catalog Cache]
        SWR --> RouteDO[GalxSwarmCoordinatorDO (Durable Objects)]
    end

    RouteDO --> Origin[Upstream Inference Fleet / Vercel Origin]
    Origin --> R2[Cloudflare R2 Multimodal CDN (assets.galx.ai)]
```

---

## 2. Local Edge Development & Testing

### Running the 46-Point Edge Verification Suite:
```bash
npm run worker:test
```

### Running Local Edge Simulation with Wrangler:
```bash
npm run worker:dev
```

### SDK-to-Edge Live Smoke Probes:
```bash
npx tsx scripts/test-sdk-edge.ts
```

---

## 3. Stale-While-Revalidate (SWR) Model Catalog Cache Operations

- **TTL Settings**: `s-maxage=60, stale-while-revalidate=300`.
- **Edge Cache Key**: `https://api.galx.ai/v1/models`.
- **Manual Cache Purge**:
  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
       -H "Authorization: Bearer ${CF_API_TOKEN}" \
       -H "Content-Type: application/json" \
       -d '{"files":["https://api.galx.ai/v1/models"]}'
  ```

---

## 4. Edge KV Rate Limiter Maintenance (`RATE_LIMIT_KV`)

### Sliding-Window Algorithm:
1. Every incoming request increments an in-memory counter in the local V8 isolate.
2. The count is synchronized to `RATE_LIMIT_KV` in 1-second batches.
3. If KV experiences network degradation, the edge gateway **fails open** to prevent dropping active inference calls.

---

## 5. Canary Release & Zero-Downtime Rollback

### Staging Deployment:
```bash
npm run worker:deploy:staging
```

### Production Deployment:
```bash
npm run worker:deploy
```

### Live Traffic Tail & Logging:
```bash
npm run worker:tail
```

---

## 6. Edge Rolling Context & Seat Telemetry Headers (ADR 0068 & 0071)

The Cloudflare Edge Gateway intercepts upstream model completions and attaches standard telemetry headers:
- `x-galx-seat-5h-limit-remaining`: Sliding 5-hour burst window percentage remaining.
- `x-galx-seat-weekly-limit-remaining`: Sliding 7-day capacity window percentage remaining.
- `x-galx-stable-cache-hash`: SHA-256 stable prefix cache hash locking in $>98\%$ prompt caching.
- `x-galx-rolling-memory-compacted`: Boolean indicating multi-turn memory pyramid compaction.

## 7. LUMI-GALX Edge Transport Operations (`lumi-edge-worker`)

The production multi-token gateway is maintained in the `LUMI-GALX` repository (`https://github.com/CardSorting/LUMI-GALX.git`):

- **Live URL**: `https://lumi-edge-worker.notsosuper688651.workers.dev`
- **Credential Authority**: Supabase PostgreSQL. Edge KV is not an approved long-lived credential store (ADR 0115).

### 1. Inspecting Live Fleet Health & Token Allocations
```bash
# Health check (PoP Ray ID and transport status; do not expose token identities)
curl -sS https://lumi-edge-worker.notsosuper688651.workers.dev/health | jq .

# Verify the authoritative registry from GALXAI instead
cd /Users/bozoegg/Desktop/GALXAI && npm run shards:doctor
```

### 2. Live Log Streaming (`wrangler tail`)
```bash
cd /Users/bozoegg/Desktop/LUMI-NEW
npx wrangler tail lumi-edge-worker
```

### 3. Credential Enrollment

Do not ingest long-lived credentials into edge KV. Run `npm run shards:import` in GALXAI to commit encrypted credentials to the PostgreSQL authority. Any future edge broker must issue short-lived, audience-bound, revocable leases.

### 4. Deploying Updates to the Edge Worker
```bash
cd /Users/bozoegg/Desktop/LUMI-NEW
npm run check
npx wrangler deploy
```

### 5. Transport Demarcation: Edge Worker vs. Always-On VM Relay

| Concern | Cloudflare Edge Worker (`lumi-edge-worker`) | Always-On VM Relay (`galxai-relay.service`) |
| :--- | :--- | :--- |
| **Primary Scope** | Wholesale REST API keys (`sk-...`), KV rate limiting, R2 CDN assets | Persistent bidirectional Codex WebSockets (`chatgpt.com`) |
| **Execution Bounds** | 30s–100s V8 isolate CPU/wall-time limit | Indefinite wall time (300s configurable ceiling) |
| **Upstream Transport** | Outbound HTTP `fetch()` | Native Node.js `ws` socket with TCP ping/pong ACK tracking |
| **Target Endpoints** | `api.openai.com`, `api.x.ai` | `wss://chatgpt.com/backend-api/codex/responses` |
| **WAF Defense** | Subject to Cloudflare-to-Cloudflare datacenter IP blocks | Residential egress proxies, Cloudflare Tunnel (`cloudflared`) |
| **ChatGPT Sessions** | **Rejected** (`HTTP 400 use_vm_relay_required`) | **Authoritative Gateway** (`POST /v1/chat/completions`) |

Maintainers must NOT attempt to route ChatGPT OAuth session tokens through the Cloudflare Edge Worker. Run or inspect the VM Relay daemon instead:
```bash
# Verify local VM Relay health (Host Mac)
curl -s http://localhost:3001/health | jq .

# Or verify via active Cloudflare Tunnel (Remote / Vercel Staging)
curl -s https://<hash>.trycloudflare.com/health | jq .

# Probe live upstream Codex WebSocket wire from VM Relay CLI
cd /Users/bozoegg/Desktop/GALXAI && npx tsx scripts/manage-shards.ts --test
```

---

*For full Cloudflare architectural strategy, see [CLOUDFLARE_STRATEGY.md](../CLOUDFLARE_STRATEGY.md), [ADR 0111](../adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md), [ADR 0112](../adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md), [ADR 0115](../adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md), and [ADR 0120](../adr/0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md).* 🥦🌐🚀
