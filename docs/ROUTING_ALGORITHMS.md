# 🌊 Quota Routing Algorithms & Mathematical Calculus

GALXAI employs mathematical dispatch algorithms designed to maximize throughput, prevent upstream rate-limit collisions, and provide latency-optimized allocation across pooled credentials.

---

## 1. Predictive Adaptive Hydraulic Headroom (P-AHT)

The primary and recommended quota cycling algorithm is **Predictive Adaptive Hydraulic Headroom (P-AHT)**. It treats the pooled credential fleet as a system of interconnected pressurized hydraulic reservoirs.

### Mathematical Formulation

For each candidate shard $i$, the dynamic hydraulic score $S_i$ is computed continuously in real-time:

$$S_i = \left( R_i \right)^{1.2} \times C_i \times H_i \times D_i \times L_i \times W_i \times P_i \times M_i \times T_i + \epsilon_i$$

Where:

| Factor | Symbol | Formula | Description |
| :--- | :--- | :--- | :--- |
| **Post-Allocation Headroom Ratio** | $R_i$ | $\max\left(0.01, \frac{T_{\text{remaining}} - T_{\text{reserved}} - T_{\text{estimated}}}{T_{\text{max}}}\right)$ | Measures token capacity after deducting estimated request cost. Power exponent ($1.2$) naturally levels load across homogeneous shards. |
| **Power-Law Concurrency Headroom** | $C_i$ | $\max\left(0.01, 1 - \left(\frac{\text{inFlight}_i}{\text{maxInFlight}}\right)^{1.5}\right)$ | Non-linear saturation curve that aggressively deflects new traffic as a shard approaches 80–90% in-flight capacity. |
| **Circuit Health Multiplier** | $H_i$ | Canary Multiplier ($0.25 \to 0.75 \to 1.0$) | Traffic throttle applied as a shard emerges from cooldown back into full health. |
| **Failure Dampening** | $D_i$ | $0.85^{\text{consecutiveFailures}_i}$ | Exponential penalty for recent intermittent errors. |
| **EWMA Latency Multiplier** | $L_i$ | $\min\left(1.5, \max\left(0.7, \left(\frac{600}{\max(100, \text{avgLatencyMs}_i)}\right)^{0.25}\right)\right)$ | Rewards shards responding faster than the $600\text{ms}$ fleet baseline. |
| **Dynamic Reliability Weight** | $W_i$ | $\text{baseWeight}_i \times \left(\frac{\text{successes} + 10}{\text{total} + 10}\right) \times \left(\frac{600}{\max(100, \text{avgLatencyMs}_i)}\right)^{0.2}$ | Laplace-smoothed historical uptime auto-tuning. |
| **Priority Tier Boost** | $P_i$ | $\text{isPriorityUser} \mathbin{?} \frac{\text{priority}_i}{10} : 1.0$ | Tier multiplier for premium gateway plans. |
| **Predictive Drain Avoidance (`MDA-Floor`)** | $M_i$ | $\begin{cases} 0.35 & \text{if } \text{DrainRatio} < 0.10 \\ 0.75 & \text{if } \text{DrainRatio} < 0.20 \\ 1.0 & \text{otherwise} \end{cases}$ | Pre-emptively protects nearly-exhausted buckets from total drain, giving continuous replenishment calculus time to refill capacity. |
| **Tenant-Affinity Dispersion (`TASD`)** | $T_i$ | $0.88^{\text{tenantLeasesOnShard}_i}$ | Fans multi-request tenant bursts evenly across distinct shards, preventing single-shard monopolization. |
| **Adaptive Micro-Jitter Entropy** | $\epsilon_i$ | $\text{Uniform}(-\Delta, +\Delta)$ ($\Delta = 0.05$ if fleet in-flight $> 10$, else $0.02$) | Prevents simultaneous parallel worker threads from picking identical shards during burst spikes. |

---

## 2. Smooth Weighted Round-Robin (SWRR)

Based on the **Envoy Proxy & Nginx upstream load balancing algorithm**, SWRR guarantees completely smooth interleaving of traffic without burst clumping across homogeneous or weighted credentials.

### Algorithm Mechanics

1. Each shard $i$ has an effective weight $w_i \ge 1$ and an internal dynamic state variable $c_i$ (`currentWeight`), initialized to $0$.
2. Upon request arrival:
   - For every candidate shard $i$: $c_i \leftarrow c_i + w_i$.
   - Select candidate $k$ with the maximum current weight: $k = \arg\max_i(c_i)$.
   - Deduct total weight sum from selected shard: $c_k \leftarrow c_k - \sum_i w_i$.
3. Return shard $k$.

### Mathematical Invariant

Over any window of $N = \sum_i w_i$ requests, shard $i$ is selected exactly $w_i$ times, and selections are distributed with mathematical maximum uniformity:

$$\max_{t_1, t_2} \left| \text{Selections}_i(t_1, t_2) - w_i \frac{t_2 - t_1}{N} \right| < 1$$

---

## 3. Weighted Least-Utilized (WLC)

Designed for batch background pipelines and long-context reasoning models:

$$\text{Rank}(i) = \left( \text{inFlight}_i, \; \text{totalTokensConsumed}_i, \; -\text{priority}_i, \; \text{id}_i \right)$$

Sorts candidates primarily by active in-flight worker count, breaking ties by lifetime token consumption leveler.

---

## 4. Priority Failover Cascade

Designed for mission-critical enterprise workloads requiring hierarchical cascade routing:

1. Highest priority tier shards ($\text{priority} \ge 90$) receive 100% of traffic.
## 5. BroccoliDB Sub-Microsecond Candidate Pre-Filtering

Before scoring algorithms evaluate candidate shards, **BroccoliDB reactive secondary indices** pre-filter candidate pools in $< 2\mu\text{s}$:

```text
Full Shard Fleet (N Shards in accountTable)
                 │
                 ▼
  [Index Lookup: provider == 'openai' & status != 'revoked']  -> O(1) Candidate Set
                 │
                 ▼
  [Index Lookup: shardMode == 'pooled' & permissionRetracted == false] -> O(1) Filter
                 │
                 ▼
  [Circuit Breaker Filter: status != 'dead' & status != 'exhausted']
                 │
                 ▼
  [P-AHT Mathematical Scoring Matrix: S_i]
                 │
                 ▼
       Selected Execution Shard
```

---

## 📊 Strategy Selection Matrix

| Use Case | Recommended Strategy | Primary Advantage |
| :--- | :--- | :--- |
| **Mixed Interactive AI Workloads** | `adaptive_headroom` | Lowest latency, zero 429 stampedes, proactive token leveling |
| **Homogeneous High-Volume Queues** | `smooth_weighted_round_robin` | Perfectly smooth interleave, zero burst clumping |
| **Long-Running Batch Inference** | `least_utilized` | Prevents token debt skew across credentials |
| **Tiered Failover Deployments** | `priority_failover` | Strict hierarchical failover guarantees |
| **Micro-Subsecond Substrate Queries** | `broccolidb_natural` | Offline deterministic AST matching with zero GC overhead |

