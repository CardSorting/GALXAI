# 📈 Maintainer Guide: Telemetry, Observability & Prometheus Metrics

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: Observability Engineers, SREs, and Platform Maintainers.  
> **Subsystem**: OpenTelemetry (OTel), Prometheus metrics exporter, and Structured JSON loggers.

---

## 1. Core Prometheus Metrics Exported by GALXAI

GALXAI exposes a standard Prometheus `/metrics` endpoint with zero-overhead atomic counters and histograms:

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `galx_http_requests_total` | Counter | `method`, `route`, `status` | Total incoming HTTP/REST requests. |
| `galx_compaction_input_tokens_total` | Counter | `mode`, `domain` | Total uncompressed raw input tokens. |
| `galx_compaction_output_tokens_total` | Counter | `mode`, `domain` | Total compacted task-relevant tokens. |
| `galx_compaction_tokens_saved_total` | Counter | `mode`, `domain` | Cumulative token savings delivered by BroccoliDB. |
| `galx_compaction_fidelity_status_total` | Counter | `mode`, `status` | Count of `verified` vs `fallback` compaction results. |
| `galx_vault_decryption_failures_total` | Counter | `tenant_uid`, `reason` | AAD mismatch or decryption failure alarms. |
| `galx_paht_shard_headroom_ratio` | Gauge | `shard_id`, `provider` | Real-time hydraulic headroom ratio ($0.0 - 1.0$). |
| `galx_circuit_breaker_state` | Gauge | `shard_id` | State enum ($0=\text{CLOSED}, 1=\text{DEGRADED}, 2=\text{OPEN}, 3=\text{HALF-OPEN}$). |
| `galx_seat_5h_limit_remaining_pct` | Gauge | `user_id`, `tier` | User's 5-hour sliding window capacity remaining ($0-100\%$). |
| `galx_seat_weekly_limit_remaining_pct` | Gauge | `user_id`, `tier` | User's weekly sliding window capacity remaining ($0-100\%$). |
| `galx_seat_active_leases_total` | Gauge | `user_id` | Number of active concurrent stream leases in `galx_seat_request_leases`. |
| `galx_chat_rolling_memory_hits_total` | Counter | `source` (`l1_broccolidb`, `l2_postgres`) | In-memory RAM vs durable database rolling memory lookups. |
| `galx_chat_prompt_cache_hits_total` | Counter | `model_id` | Count of upstream prompt cache hits verified via stable prefix hashing. |

---

## 2. Structured JSON Log Fields

All serverless and edge logs are emitted in high-density structured JSON format:

```json
{
  "timestamp": "2026-08-28T10:53:00.000Z",
  "level": "info",
  "service": "galx-router",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "tenantUid": "usr_9482_enterprise",
  "modelRequested": "gpt-4o",
  "shardSelected": "shard_openai_tier5_01",
  "compactionMode": "domain",
  "domainHint": "legal-interrogatory",
  "rawTokens": 1479,
  "compactedTokens": 322,
  "savingsPercentage": 78.23,
  "fidelityStatus": "verified",
  "latencyMs": 235,
  "billedDollarsSaved": 0.002892
}
```

---

## 3. High-Priority Alert Rules (Grafana / Alertmanager)

```yaml
groups:
  - name: galxai_critical_alerts
    rules:
      - alert: CompactionFidelityFallbackSpike
        expr: rate(galx_compaction_fidelity_status_total{status="fallback"}[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "BroccoliDB Compaction Safety fallback rate exceeds 5%."

      - alert: ShardFleetHeadroomExhausted
        expr: min(galx_paht_shard_headroom_ratio) < 0.10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Hydraulic headroom is below 10% on all Tier-5 shards."
```

---

*Observe everything with sub-millisecond precision.* 🥦📈⚡
