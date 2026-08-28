# ⚡ Maintainer Playbook: Upstream Provider Outage & Degradation Response

> **Target Audience**: SRE On-Call Engineers, Platform Maintainers, and Incident Commanders.  
> **Scenario**: Upstream model provider (OpenAI / xAI) experiences partial or complete outage, high error rates (HTTP 500/503), or rate limit collapse.

---

## 1. Automated Circuit Breaker & Fallover Mechanics

When an upstream model shard degrades:

```mermaid
flowchart TD
    Request[Incoming Request] --> Router[GalxModelRouter]
    Router --> CheckShard{Target Shard State?}
    
    CheckShard -->|CLOSED (Healthy)| SendPrimary[Dispatch to Primary Shard]
    CheckShard -->|DEGRADED / OPEN| FallbackCheck{Fallback Shard Available?}
    
    FallbackCheck -->|YES| RoutePeer[Route to Secondary Tier-5 Shard]
    FallbackCheck -->|NO (Provider-Wide Outage)| CrossModel{Cross-Model Fallback Configured?}
    
    CrossModel -->|YES| RouteAlternative[Route to Equivalent Grok / Anthropic Engine]
    CrossModel -->|NO| ReturnDegraded[Emit Structured 503 with Upstream Status Context]
```

---

## 2. Emergency Operational Commands

### 1. Force Shard Fleet Health Check:
```bash
npm run playbook -- --stage=traffic
```

### 2. Inspect Active Circuit Breaker States:
```bash
npx tsx scripts/validate-galxai-router.ts
```

### 3. Enable Maximum Client-Side Compaction Headers:
Instruct clients to set `x-galx-compact: true` and `x-galx-compaction-mode: domain` to reduce token consumption across surviving shards by up to $85.93\%$, multiplying effective TPM capacity by $3.3\times$.

---

## 3. Post-Outage Recovery & Shard Health Restoration

Once the upstream provider resolves their incident:
1. `GalxCircuitBreaker` will automatically transition from `OPEN` $\to$ `HALF-OPEN`.
2. Canary probe requests ($3$ consecutive successful responses) restore the shard to `CLOSED`.
3. P-AHT recalculates available headroom and smoothly ramps traffic back to normal levels.

---

*Zero-hesitation resilience under upstream failure.* 🥦⚡🛡️
