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

## 7. LUMI-GALX Multi-Token Edge Fleet Operations (`lumi-edge-worker`)

The production multi-token gateway is maintained in the `LUMI-GALX` repository (`https://github.com/CardSorting/LUMI-GALX.git`):

- **Live URL**: `https://lumi-edge-worker.notsosuper688651.workers.dev`
- **Cloudflare KV Namespace**: `TOKEN_POOL_KV` (`id: 4dcb6b86fc2d41ba95a96844f7a87efa`)

### 1. Inspecting Live Fleet Health & Token Allocations
```bash
# Health check (PoP Ray ID, total and active tokens)
curl -sS https://lumi-edge-worker.notsosuper688651.workers.dev/health | jq .

# Detailed fleet status (token IDs, effective weights, sliding-window limits)
curl -sS https://lumi-edge-worker.notsosuper688651.workers.dev/v1/tokens/status | jq .
```

### 2. Live Log Streaming (`wrangler tail`)
```bash
cd /Users/bozoegg/Desktop/LUMI-NEW
npx wrangler tail lumi-edge-worker
```

### 3. Ingesting Shards into KV
```bash
# Ingest active tokens from ~/.codex/auth.json
npm run token:add -- --from-codex-auth --worker-url https://lumi-edge-worker.notsosuper688651.workers.dev

# Or run interactive OAuth PKCE login
npm run login
```

### 4. Deploying Updates to the Edge Worker
```bash
cd /Users/bozoegg/Desktop/LUMI-NEW
npm run check
npx wrangler deploy
```

---

*For full Cloudflare architectural strategy, see [CLOUDFLARE_STRATEGY.md](../CLOUDFLARE_STRATEGY.md), [ADR 0111](../adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md), and [ADR 0112](../adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md).* 🥦🌐🚀
