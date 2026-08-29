# 📈 Playbook 03: Live Traffic, Sharding & Fleet Scaling

> **Stage 3**: P-AHT Hydraulic Headroom Balancing, Rate Limiter Tuning, BYOQ Shard Rebalancing, SWR Catalog Caching & Asynchronous Queue Fleet Management.

---

## 🎯 Objective & Overview
This playbook provides instructions for monitoring real-time inference traffic, adjusting rate limits, balancing credential shard utilization, and scaling pull worker pools during peak load events.

---

## 🧭 Live Traffic Monitoring & Telemetry Inspection

### Inspecting Fleet Telemetry Endpoints:
```bash
# 1. Inspect real-time Edge Gateway health and capabilities
curl -X GET https://api.galx.ai/api/health

# 2. Inspect active shard pool statistics (healthy, cooldown, exhausted counts)
curl -X GET https://galx.ai/api/pool/stats \
  -H "Authorization: Bearer galx_live_..."

# 3. Inspect continuous sliding-window latency percentiles (P50, P90, P99)
curl -X GET https://galx.ai/api/pool/telemetry \
  -H "Authorization: Bearer galx_live_..."
```

---

## ⚖️ Shard Fleet Balancing & P-AHT Tuning

When traffic surges, the **Predictive Adaptive Headroom Tracking (P-AHT)** algorithm dynamically scores and distributes requests across all registered BYOQ shards:

$$\text{HeadroomScore} = w_r \cdot (1 - u_{\text{rpm}}) + w_t \cdot (1 - u_{\text{tpm}}) - w_c \cdot \left(\frac{c_{\text{active}}}{c_{\text{max}}}\right) - w_l \cdot \left(\frac{L_{\text{EWMA}}}{L_{\text{target}}}\right)$$

### Operational Procedures for Shard Imbalance:
1. **Symptom**: One shard shows high concurrent utilization ($C_{\text{active}} \to C_{\text{max}}$) while others remain idle.
2. **Remedy**:
   - Verify Tenant-Affinity Shard Dispersion (TASD) in `src/core/pool/GalxCredentialPool.ts`.
   - Deposit additional parallel API keys for saturated providers via `/vault/deposit`.
   - Decrease the cooldown recovery multiplier if upstream rate limits have cleared.

---

## ⏱️ Rate Limiter Dynamic Configuration

Edge rate limiting is enforced via Cloudflare `RATE_LIMIT_KV` using a sliding-window token bucket algorithm:

| Key Tier | Default Requests/Min (RPM) | Default Tokens/Min (TPM) | Max In-Flight Streams |
| :--- | :--- | :--- | :--- |
| **Starter Tier** | $120\text{ RPM}$ | $100{,}000\text{ TPM}$ | $5\text{ Concurrent}$ |
| **Growth Tier** | $600\text{ RPM}$ | $500{,}000\text{ TPM}$ | $20\text{ Concurrent}$ |
| **Enterprise / Priority** | $3{,}000\text{ RPM}$ | $2{,}500{,}000\text{ TPM}$ | $50\text{ Concurrent}$ |

### Elevating a Tenant's Rate Limit Tier:
1. Navigate to `/keys` in the developer portal or update the tenant record in Supabase:
```sql
UPDATE public.galx_api_keys
SET tier = 'priority', max_concurrency = 50
WHERE key_prefix = 'galx_live_abc123';
```
2. Edge PoPs invalidate the cached tenant tier within 60 seconds (or immediately upon SWR refresh).

---

## ⚡ Asynchronous Task Queue & Pull Worker Scaling

When background batch processing or agent DAG fan-in workflows increase in volume:

```bash
# 1. Inspect queue depth, backlog, and active lease count
curl -X GET https://api.galx.ai/api/queues \
  -H "Authorization: Bearer galx_live_..."

# 2. Scale external pull workers by leasing larger batch chunks
curl -X POST https://api.galx.ai/api/queues/llm-batch/lease \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{"workerId": "worker-pool-us-east-01", "maxTasks": 25, "leaseDurationMs": 120000}'

# 3. Trigger bulk DLQ redrive for stalled tasks
curl -X POST https://api.galx.ai/api/queues/llm-batch/redrive \
  -H "Authorization: Bearer galx_live_..." \
  -H "Content-Type: application/json" \
  -d '{"maxTasks": 50}'
```

---

## 🧊 Stale-While-Revalidate (SWR) Model Catalog Cache Management

Model catalog queries (`/v1/models`) are cached at Edge PoPs with an SWR policy ($60\text{s}$ fresh, $86{,}400\text{s}$ stale):
- If a new model is introduced (e.g. `gpt-5.6-sol`), the cache will naturally revalidate on the next request.
- To force an instant purge across all 300+ Edge PoPs:
```bash
npx wrangler kv:key delete --binding=CACHE_KV "galx:models:catalog"
```

---

## 💺 6. Dual Rolling Window Seat Quota & Concurrency Leases (ADR 0068)

Interactive chat requests consume dynamic capacity evaluated across two simultaneous sliding rolling meters:

| Seat Tier | 5-Hour Burst Limit | 7-Day Weekly Limit | Max Concurrent Stream Leases |
| :--- | :--- | :--- | :--- |
| **`standard`** | 100,000 tokens | 1,000,000 tokens | 2 active streams |
| **`pro`** | 500,000 tokens | 5,000,000 tokens | 5 active streams |
| **`enterprise`** | 2,000,000 tokens | 20,000,000 tokens | 15 active streams |
| **`custom`** | Negotiated | Negotiated | Unlimited / Custom |

### Inspecting & Elevating Seat Quotas:
```sql
-- 1. Inspect live rolling 5-hour and 7-day token consumption
SELECT * FROM fn_get_seat_window_telemetry('user_uuid_here');

-- 2. Upgrade user seat tier in Supabase
UPDATE public.galx_user_seats
SET tier = 'enterprise', concurrency_limit = 15
WHERE user_id = 'user_uuid_here';
```
