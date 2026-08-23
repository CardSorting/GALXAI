# 📊 Telemetry, Metrics & Observability Guide

GALXAI features enterprise-grade in-memory ring-buffer metrics, streaming latency histograms, and Prometheus/Datadog-compatible endpoints.

---

## 1. Real-Time Telemetry Endpoints

### Snapshot Metrics (`GET /api/pool/telemetry`)
Returns live sliding-window percentile latency ($P_{50}, P_{90}, P_{99}$), RPM, TPM, error rates, and per-provider/model breakdowns.

```bash
curl http://localhost:3000/api/pool/telemetry
```

### JSON Response Schema
```json
{
  "metrics": {
    "totalRequests": 5420,
    "totalTokens": 10840000,
    "successfulRequests": 5412,
    "failedRequests": 8,
    "errorRatePercentage": 0.15,
    "requestsPerMinute": 142,
    "tokensPerMinute": 284000,
    "latency": {
      "p50Ms": 240,
      "p90Ms": 480,
      "p99Ms": 890,
      "averageMs": 275,
      "minMs": 85,
      "maxMs": 1420
    },
    "providerBreakdown": {
      "openai": { "requests": 3600, "tokens": 7200000, "avgLatencyMs": 260, "errorRate": 0.1 },
      "xai-grok": { "requests": 1820, "tokens": 3640000, "avgLatencyMs": 310, "errorRate": 0.2 }
    },
    "modelBreakdown": {
      "gpt-5.6-sol": { "requests": 2100, "tokens": 5200000, "avgLatencyMs": 340 },
      "x-ai/grok-4.5": { "requests": 1820, "tokens": 3640000, "avgLatencyMs": 310 }
    }
  }
}
```

---

## 2. Prometheus Scraping & Export

You can configure Prometheus to poll GALXAI's statistics endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'galxai-gateway'
    scrape_interval: 10s
    metrics_path: '/api/pool/telemetry'
    static_configs:
      - targets: ['localhost:3000']
```

---

## 3. Grafana Dashboard Integration

Key dashboard panels to configure:
1. **P99 / P90 / P50 Fleet Latency Graph** (`metrics.latency.p99Ms`, `p90Ms`, `p50Ms`).
2. **Tokens Per Minute Throughput Gauge** (`metrics.tokensPerMinute`).
3. **Active Shard Health Gauge** (`healthyShards` vs `cooldownShards` from `/api/pool/stats`).
4. **Error Rate Percentage Alert** (Trigger when `errorRatePercentage > 1.0%`).

---

## 4. Cloudflare Edge PoP Telemetry & Live Tail Stream

To stream live real-time execution logs, request latencies, and `cf-ray` identifiers across Cloudflare's 300+ global Points of Presence:

```bash
# Stream live production edge gateway telemetry
npm run worker:tail

# Stream live staging telemetry
npx wrangler tail --env staging
```

Each log line provides:
- **`cf-ray`**: Unique edge request tracing token
- **`x-galx-cache`**: SWR Cache status (`HIT` or `MISS`)
- **`edgePoP`**: Physical Cloudflare airport data center code (e.g. `SJC`, `IAD`, `LHR`, `FRA`)
- **`duration`**: Edge isolate execution duration in milliseconds

