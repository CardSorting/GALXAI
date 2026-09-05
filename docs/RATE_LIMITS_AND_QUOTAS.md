# ⏱️ Rate Limits, Concurrency & Fair-Share Quotas

This guide explains how GALXAI enforces fair-share concurrency ceilings, rate limits, and continuous token replenishment.

---

## 1. Gateway Developer Key Tiers

| Tier | Default RPM | Default TPM | Max Concurrent In-Flight | Burst Multiplier |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Tier** | 1,000 RPM | 500,000 TPM | **20 parallel requests** | $1.5\times$ capacity |
| **Priority Tier** | 5,000 RPM | 2,500,000 TPM | **40 parallel requests** | $2.0\times$ capacity |
| **Enterprise Fleet** | Custom | Custom | **Unlimited dedicated** | Custom |

---

## 2. Anti-Starvation Fair-Share Concurrency Ceiling

To prevent a single runaway script or high-volume tenant from monopolizing fleet capacity, GALXAI enforces per-tenant concurrency ceilings:

```typescript
const maxTenantLimit = isPriorityUser ? 40 : 20;
if (currentTenantInFlight >= maxTenantLimit) {
  return {
    status: 'tenant_pool_quota_capped',
    reason: `Tenant '${userId}' reached maximum simultaneous concurrent gateway allocation (${maxTenantLimit})`
  };
}
```

When a tenant hits their concurrency ceiling, subsequent requests receive HTTP 429 with standard `Retry-After: 1` headers until in-flight requests conclude.

---

## 3. Continuous Mathematical Replenishment (No Minute-Boundary Clumping)

Unlike standard fixed-window rate limiters that reset capacity abruptly on the 60th second of every minute, GALXAI recalculates capacity **continuously with microsecond clock precision**:

$$\text{ReplenishedTokens} = \left(\frac{t_{\text{now}} - t_{\text{last}}}{60000.0}\right) \times \text{RefillRatePerMinute}$$

### Benefits
- **Zero Minute-Edge Spikes**: Eliminates thundering herd spikes at the top of every minute.
- **Smooth Traffic Smoothing**: Naturally smooths erratic burst patterns into steady throughput.
- **Microsecond Sub-Remainder Preservation**: Retains fractional token fractions across rapid sub-millisecond queries.

---

## 4. Edge-Native Sliding-Window KV Rate Governance (ADR 0038)

At Cloudflare Edge PoPs, incoming requests to `api.galx.ai` are governed by `RATE_LIMIT_KV` before hitting compute:

```typescript
// Edge sliding-window token bucket throttling (120 req/min default per client IP/Key)
const currentWindow = Math.floor(Date.now() / 60000);
const rateKey = `rate_${clientIp}_${currentWindow}`;
const count = await env.RATE_LIMIT_KV.get(rateKey);

if (count && parseInt(count) >= 120) {
  return new Response(JSON.stringify({ error: { message: 'Edge rate limit exceeded. Retry shortly.' } }), {
    status: 429,
    headers: { 'Retry-After': '60', 'content-type': 'application/json' }
  });
}
```

### Advantages
- **Sub-5ms Throttling**: Rejection occurs at the physical edge PoP without database roundtrips.
- **Fail-Open Resilience**: If KV experiences transient degraded latency, the edge gateway fails open to protect active inference streams.

---

## 5. BroccoliDB Representation Selection & Effective TPM Capacity Multiplier (ADR 0066 & 0067)

When clients enable pre-inference representation compaction (`x-galx-compact: true` or `BroccoliCompactionFacade.selectRepresentation()`):
- **Quota Preservation**: Compacting an 8,000-token credit agreement or eBPF dump down to 1,500 tokens saves 6,500 tokens of TPM quota allocation.
- **Adaptive Density Gate ($\text{ID}(C)$)**: For small or clean contexts ($<200$ tokens), compaction is bypassed, preserving baseline TPM without unforced framing dilation.
- **Effective Throughput Multiplier**: For typical high-redundancy workloads ($75\%–85\%$ reduction), a tenant on a $500\text{k TPM}$ quota achieves an **effective throughput capacity of $2.0\text{M} - 3.3\text{M TPM}$** without hitting upstream foundation lab rate limits.
- **Action Safety Guarantee**: Defends active code invariants across the 7 adversarial corporate traps (`npm run bench:entropy`).
- **Microsecond Execution**: In-process representation selection executes in $< 5\text{ms}$, incurring negligible overhead compared to upstream network round-trips.

---

## 6. Dual Rolling Window Seat Quota Experience & Distributed Leases (ADR 0068)

In addition to token credit limits, organization seats and interactive chat users operate under **Dual Sliding Rolling Windows** without artificial end-of-month cliffs:

### 6.1. Dual Window Structure
1. **5-Hour Burst Limit**: Governs fast-recovery interactive chat turns and developer iterations (e.g. 30 units on Developer, 100 on Small Business, 350 on Enterprise, 1,500 on Apex). Resets continuously with human-readable countdowns (`"You have used some of your 5-hour limit, it will fully refresh in 4 hours, 17 minutes. 90%"`).
2. **Weekly (7-Day) Capacity Limit**: Governs continuous weekly volume (e.g. 200 units on Developer, 1,000 on Small Business, 5,000 on Enterprise, 25,000 on Apex). Resets continuously (`"You have used some of your weekly limit, it will fully refresh in 3 days. 55%"`).

### 6.2. Seat Tier Entitlements

| Entitlement Tier | 5-Hour Limit | Weekly Limit | Max Output Tokens | Allowed Models | Max Concurrency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Developer** | 30 units | 200 units | 16,384 tokens | `gpt-5.6-sol` | 20 streams |
| **Small Business** | 100 units | 1,000 units | 32,768 tokens | `gpt-5.6-sol`, `gpt-5.6-terra`, `claude-3-7-sonnet` | 50 streams |
| **Enterprise Fleet** | 350 units | 5,000 units | 65,536 tokens | All models + Deep Reasoning + Image API | 200 streams |
| **Apex Sovereign** | 1,500 units | 25,000 units | 128,000 tokens | All models + Sovereign Custom Enclaves | 500 streams |

### 6.3. Distributed Expiring Request Leases (`galx_seat_request_leases`)
To prevent concurrent stream leaks across distributed worker nodes, requests acquire an atomic expiring lease:
- **Preflight Allocation**: `fn_evaluate_and_acquire_seat_gate_v2` checks all 5-hour, weekly, spend-cap, and concurrency boundaries in 1 single transaction and reserves an expiring lease (`expires_at = NOW() + TTL`).
- **Stream Completion**: `fn_settle_seat_stream_completion_composite_v2` writes actual token consumption and marks the lease as settled.
- **Fail-Safe Expiration**: In-flight stream disconnects automatically release their slot upon lease TTL expiration (`180s`), preventing orphaned locks.

---

## 7. Shard Dual-Window Quota Calculus & Sliding Window Request Logs (ADR 0087)

For upstream provider shards with discrete rolling limits (e.g., 5 requests per 5 hours or 40 requests per 3 hours):
- **Hybrid Calculus**: The gateway evaluates both continuous token bucket refill (for TPM/RPM) and discrete sliding window timestamps:
  ```typescript
  const cutoff = nowMs - windowDurationMs;
  const activeTimestamps = requestHistoryTimestampsMs.filter(ts => ts > cutoff);
  const remaining = Math.max(0, maxRequestsPerWindow - activeTimestamps.length);
  ```
- **Out-of-Band Zero-Trust Resync**: When an upstream 429 reveals external out-of-band usage, `syncSlidingWindowFromReset()` recalculates timestamps against the authoritative reset header and immediately triggers zero-delay shard failover.
- **Natural Language Reset Parsing**: Automatically extracts reset durations from error bodies (e.g., `"resets in 4 hours 12 minutes"`, `"5h30m"`, `"resets at 3:45 PM"`).

---

## 8. Anti-Stampede Bounded Admission Queue / Waiting Room (ADR 0089)

When the entire provider fleet is momentarily saturated or in brief cooldown:
- **Earliest-Reset Forecasting**: The gateway calculates $t_{\text{earliestReset}} = \min_{s} (t_{\text{cooldown}, s}, t_{\text{windowReset}, s})$.
- **Waiting Room Enqueueing**: If $t_{\text{earliestReset}} - t_{\text{now}} \le \text{maxQueueWaitMs}$ (default 4,000ms), incoming requests enter a bounded in-memory priority queue (`admissionQueue`), resolving smoothly as soon as a slot opens.
- **Reflexive Event-Driven Draining**: Whenever any active request releases its lease or commits tokens, `drainAdmissionQueue()` executes immediately to satisfy queued requests with zero polling delay.

---

## 9. Adaptive In-Flight Concurrency Limiting (AIMD)

To prevent slow-poisoning / tarpitting when an upstream provider experiences severe server latency degradation:
- **Fast Shards ($\text{EWMA} < 400\text{ms}$)**: Concurrency ceiling boosted up to $\min(25, \text{base} + 4)$.
- **Moderately Degraded ($\text{EWMA} > 1200\text{ms}$)**: Concurrency capped at $\max(3, \lfloor\text{base} \times 0.7\rfloor)$.
- **Severely Degraded ($\text{EWMA} > 2000\text{ms}$)**: Concurrency choked to $\max(2, \lfloor\text{base} \times 0.4\rfloor)$.

