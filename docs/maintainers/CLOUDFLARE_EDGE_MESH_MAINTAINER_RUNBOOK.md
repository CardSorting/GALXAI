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

*For full Cloudflare architectural strategy, see [CLOUDFLARE_STRATEGY.md](../CLOUDFLARE_STRATEGY.md).* 🥦🌐🚀
