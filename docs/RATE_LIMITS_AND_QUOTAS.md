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
