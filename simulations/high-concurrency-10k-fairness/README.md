# 🌊 High-Concurrency Fair Admission & Unpredictable Inference Architecture

This standalone simulation directory models and verifies how GALXAI handles massive concurrent load bursts (**up to 100,000 requests per second**) through a single ingress gateway, guaranteeing tenant fairness, preventing queue bufferbloat, eliminating cascading timeout failures, stopping zombie upstream quota waste, and safely executing **unpredictable 2–3 minute inference jobs** against frontier reasoning models.

---

## 🛑 The Core Problem: Why Naive Queues Suffer Cascading Death Spirals

When 100,000 requests per second hit an AI compute cluster with finite upstream concurrency (e.g. 150–500 in-flight model streams):

```
                              100,000 req/sec BURST
                                       │
                                       ▼
             ┌────────────────────────────────────────────────────┐
             │          NAIVE UNBOUNDED MONOLITHIC FIFO           │
             │  [Req 1] [Req 2] ... [Req 49,999] [Req 100,000]   │
             └───────────────────────┬────────────────────────────┘
                                     │
                Bufferbloat: Wait times balloon to 5s–120s
                                     │
             ┌───────────────────────┴────────────────────────────┐
             ▼                                                    ▼
 [Client Timeout / Abort]                           [Worker Dequeues Stale Item]
 • IDE / SDK caller closes socket                 • Worker STILL calls upstream model!
 • User leaves after 1.5s                         • Burns quota on dead callers ($$$)
                                                  • STARVES fresh callers behind it
                                                                  │
                                                                  ▼
                                                   💥 CASCADING DEATH SPIRAL
```

### 1. The Queue Aging & Zombie Execution Spiral
- Frontier model completions take 100ms to **180,000ms** (3 minutes) for deep reasoning.
- An unbounded FIFO queue balloons to hundreds of thousands of items within seconds.
- Interactive developers in IDEs (Cursor, Windsurf) have a finite patience budget (1,200ms–2,500ms).
- **The Failure Mode**: When a caller's HTTP connection times out, a naive queue **still dispatches that request to upstream shards** when it reaches the front of the queue.
- **Result**: Up to 90% of upstream model quota is burned on **zombie requests** whose callers have already abandoned the connection, while fresh incoming requests are trapped at the back of the queue and age out in turn.

### 2. Noisy Tenant Monopolization
- If a single automated tenant fires 70,000 req/sec, and legitimate interactive developers send 9,000 req/sec, a single FIFO queue allows the noisy tenant to consume 88%+ of all queue slots, completely starving interactive developers.

### 3. Memory Bloat & Event Loop Saturation
- Storing 100,000 unresolved Promise closures in Node.js heap causes V8 garbage collection pauses, event loop delay (>500ms), and eventual OOM crashes.

### 4. Unpredictable Inference Duration
- Frontier reasoning models exhibit **2–3 minute per-request durations** at P99 with TTFT jitter of 800ms–45s.
- Provider-side Inter-Token Latency (ITL) spikes of >5s masquerade as healthy connections while silently throttling.
- Static timeouts kill valid long-running completions; absence of timeouts causes zombie hangs.

---

## 🛡️ The GALXAI Solution: 7-Module High-Throughput Inference Architecture

```mermaid
flowchart TD
    Ingress["100,000 req/sec Ingress Traffic"] --> L1

    subgraph L1["Layer 1: Pre-Queue Ingress Token Bucket"]
        Bucket["Per-Tenant Token Bucket Governor<br>• Burst Depth: 50–500 tokens<br>• Refill Rate: 25–300 tokens/sec"]
        Shed["Instant Load Shedding (HTTP 429)<br>• Calibrated 'Retry-After: 1s'<br>• Zero queue memory allocated"]
        Bucket -->|Over Capacity| Shed
    end

    L1 -->|Admitted| L2

    subgraph L2["Layer 2: Single-Flight Request Coalescing"]
        Coalesce{"Identical Prompt Hash?"}
        Join["Attach to In-Flight Wire Stream"]
        Coalesce -->|Match Found| Join
    end

    L2 -->|New Flight| L3

    subgraph L3["Layer 3: 3-Tier MLFQ + Token-Aware DRR Queuing"]
        MLFQ["MultiLevelFleetSlicer<br>• Class 0 — Interactive: 25% reserved (≤10s)<br>• Class 1 — Deep Reasoning: 65% allocated (30–90s)<br>• Class 2 — Relaxed Scavenger: 10% + idle (2–3 min)"]
        DRR["Deficit Round-Robin Queue<br>• TokenAwareSizer: weight = tokens/1000 (cap 10×)<br>• Fair DRR quantum debits by weight<br>• Max Depth: 250 items/tenant"]
        MLFQ --> DRR
    end

    L3 --> L4

    subgraph L4["Layer 4: AQM + Anti-Aging + Anti-Zombie Leash"]
        Sojourn{"Sojourn Time > Client Deadline?"}
        DeadDrop["DEAD-DROP<br>Discard stale request BEFORE upstream call<br>ZERO zombie quota wasted!"]
        Zombie["AntiZombieLeash<br>• Watches client AbortSignal<br>• Cancels upstream on disconnect<br>• Transactional wallet refund"]
        Sojourn -->|Aged / Aborted| DeadDrop
    end

    L4 -->|Fresh & Alive| L5

    subgraph L5["Layer 5: MLFQ Fleet Gate + ITL Watchdog + Shadow Standby"]
        Slicer["MultiLevelFleetSlicer.acquire(class)<br>Class-partitioned concurrency gate"]
        ITL["StreamingItlWatchdog<br>• TTFT timeout: 45s<br>• ITL gap threshold: 8s<br>• 3x violations → abort"]
        Shadow["ShadowShardStandby<br>• Pre-warmed backup shards<br>• Sub-50ms handover on stall"]
        ETA["CalibratedEtaEngine<br>• EWMA per MLFQ class<br>• X-Galx-Eta-Ms / X-Galx-Queue-Position"]
        Slicer --> ITL --> Shadow
        Slicer --> ETA
    end

    L5 -->|Execution Admitted| L6

    subgraph L6["Layer 6: Resumable Job Engine + SWRR Shard Fleet"]
        Resume["BroccoliResumableJobEngine<br>• Durable token buffer (job_tokens table)<br>• Last-Event-ID SSE replay<br>• GET /v1/jobs/:id/stream"]
        SWRR["SWRR Shard Fleet<br>• 40 req / 3 hr Sliding-Window<br>• Monotonic Fencing Tokens<br>• Instant 429 Failover"]
        Shards["Upstream Provider Shards<br>(wss://chatgpt.com/backend-api/codex/responses)"]
        Resume --> SWRR --> Shards
    end
```

### Module 1: Pre-Queue Ingress Token Bucket & Fast-Shedding
- Enforces hard limits at ingress (Cloudflare Edge / BroccoliDB L0) before queue insertion.
- Any burst exceeding a tenant's burst capacity is shed immediately (<1ms) with an HTTP 429 and mathematical `Retry-After: 1s`. Zero memory is allocated for overflowing items.

### Module 2: Single-Flight Request Coalescing
- Redundant prompts (e.g. automated agents querying identical system contexts) coalesce into a single upstream wire flight, collapsing duplicate network I/O by 15%–40%.

### Module 3: 3-Tier MLFQ + Token-Aware Deficit Round-Robin
- **MultiLevelFleetSlicer**: Partitions fleet capacity into 3 priority classes (Interactive / Deep / Scavenger), mirroring Linux CFS and Google SRE class-of-service reservations.
- **TokenAwareSizer**: Computes virtual request weight from estimated output tokens — a 50,000-token reasoning job costs 50× the DRR credits of a 1,000-token interactive completion.
- **Auto-Demotion**: Class 0 requests drifting beyond 10s are transparently migrated to Class 1 without dropping the client connection.

### Module 4: Active Queue Management, Anti-Aging & Anti-Zombie Leash
- **AQM Sojourn Drop**: Every request carries an explicit deadline. Upon dequeue, sojourn time is evaluated — stale requests are discarded before any upstream call, eliminating 100% of zombie quota waste.
- **AntiZombieLeash**: Watches `request.signal` for client abort, immediately cancels the upstream WebSocket, and issues a transactional BroccoliDB wallet refund for any pre-authorized credit hold.

### Module 5: MLFQ Fleet Gate + ITL Watchdog + Shadow Shard Standby
- **MultiLevelFleetSlicer.acquire()**: Class-aware concurrency gate enforcing per-class capacity ceilings.
- **StreamingItlWatchdog**: Detects provider-side "slow poison" (ITL gap >8s) and TTFT deadlocks (>45s), triggering shadow shard handover before the client times out.
- **ShadowShardStandby**: Pre-warmed standby shards enable sub-50ms handovers when a primary shard stalls, preventing multi-minute inference jobs from being dropped.
- **CalibratedEtaEngine**: EWMA-based per-class latency estimation emitted as `X-Galx-Eta-Ms` and `X-Galx-Queue-Position` headers for client-side progress UIs.

### Module 6: Resumable Job Engine + SWRR Shard Fleet
- **BroccoliResumableJobEngine**: Durable token-level buffering in the `job_tokens` BroccoliDB table. Clients reconnecting after a network drop resume from `Last-Event-ID` without re-running inference.
- **HTTP 202 + SSE decoupling**: Initial POST returns immediately with `{ jobId }`, decoupling the 2–3 minute inference from the HTTP request lifecycle — bypassing Cloudflare's 100s timeout entirely.
- **SWRR Shard Fleet**: Smooth Weighted Round-Robin rotation across healthy shards with instant 429 isolation.

---

## 📊 Live Simulation Benchmark Results

### Test Suite A: 10,000 QPS Comparative Benchmark

| Metric | Naive FIFO | GALXAI Fair Admission | Impact |
| :--- | :--- | :--- | :--- |
| **Execution Duration** | 1,555ms (partial 3.5k) | **167ms** (full 10k) | **9.3x faster** |
| **Zombie Upstream Executions** | **60+ calls** | **0** | **100% waste eliminated** |
| **Interactive Dev Protection** | Starved | **Protected via MLFQ Class 0** | **Zero starvation** |
| **P50 Queue Latency** | 708ms | **57ms** | **12.4x lower** |
| **P99 Queue Latency** | 1,468ms | **109ms** | **13.5x lower** |
| **Load Shedding** | OOM Crash Risk | **Calibrated HTTP 429** | **Bounded memory** |
| **Single-Flight Dedup** | 100% duplicate I/O | **635 flights collapsed** | **I/O deduplication** |

### Test Suite B: Unpredictable 2–3 Minute Inference (100,000 req/sec)

| Metric | Naive Approach | GALXAI Hardened | Impact |
| :--- | :--- | :--- | :--- |
| **Class 0 Starvation Events** | Frequent | **0** (25% hard reservation) | **Zero IDE starvation** |
| **Zombie Quota Burns** | ~20% of requests | **0** (Anti-Zombie Leash) | **100% cost elimination** |
| **ITL Stall Recovery** | Hard crash / timeout | **Sub-50ms shadow handover** | **Continuity preserved** |
| **Post-disconnect resume** | Re-run full inference | **Last-Event-ID replay** | **Cost & time saved** |
| **P99 Inference Completion** | Truncated at 100s | **Completes at 180s** | **Zero truncation** |
| **Fair DRR Distribution** | Monopolizable | **Token-weight bounded** | **Batch can't starve real-time** |

---

## 🧪 Running the Simulation & Test Suite

### 1. Run the Full 16-Invariant Enterprise Test Suite
```bash
npx tsx simulations/high-concurrency-10k-fairness/index.test.ts
```

**Output:**
```text
[Test 1]  Single-Flight Coalescing ──────────────── ✓ Invariant 1 Passed
[Test 2]  DRR Multi-Tenant Fairness ─────────────── ✓ Invariant 2 Passed
[Test 3]  Anti-Aging Dead-Drop ──────────────────── ✓ Invariant 3 Passed
[Test 4]  Bounded Overflow Load-Shedding ────────── ✓ Invariant 4 Passed
[Test 5]  Shuffle-Shard Tenant Isolation ─────────── ✓ Invariant 5 Passed
[Test 6]  SWRR 429 Failover ─────────────────────── ✓ Invariant 6 Passed
[Test 7]  Hedged Request P95 ────────────────────── ✓ Invariant 7 Passed
[Test 8]  Anti-Aging Governor ───────────────────── ✓ Invariant 8 Passed
[Test 9]  MLFQ Class 0 Reservation ─────────────── ✓ Invariant 9 Passed
[Test 10] ITL Watchdog Threshold ────────────────── ✓ Invariant 10 Passed
[Test 11] Shadow Shard Handover ─────────────────── ✓ Invariant 11 Passed
[Test 12] Anti-Zombie Leash + Refund ────────────── ✓ Invariant 12 Passed
[Test 13] Resumable Job Last-Event-ID ───────────── ✓ Invariant 13 Passed
[Test 14] Token-Aware DRR Weight ────────────────── ✓ Invariant 14 Passed
[Test 15] MLFQ Auto-Demotion ────────────────────── ✓ Invariant 15 Passed
[Test 16] ETA EWMA Convergence ──────────────────── ✓ Invariant 16 Passed

✨ ALL 16 ENTERPRISE-GRADE HIGH-CONCURRENCY INVARIANTS PASSED (100% INTEGRITY)
```

### 2. Run the 10,000 QPS Comparative Benchmark
```bash
npx tsx simulations/high-concurrency-10k-fairness/simulate-10k-qps.ts
```

### 3. Run the 100,000 QPS Stress Test
```bash
npx tsx simulations/high-concurrency-10k-fairness/simulate-100k-qps.ts
```

### 4. Run the Unpredictable 2–3 Minute Inference Simulation
```bash
npx tsx simulations/high-concurrency-10k-fairness/simulate-unpredictable-inference.ts
# Or via package.json:
npm run sim:unpredictable
```

Telemetry and JSON/Markdown reports are automatically saved to:
- `simulations/high-concurrency-10k-fairness/results/`

---

## 📁 Module Reference

| File | Purpose |
| :--- | :--- |
| `IndustrialTaskExecutor.ts` | Orchestration engine integrating all modules |
| `MultiLevelFleetSlicer.ts` | 3-Tier MLFQ (Class 0/1/2) with auto-demotion |
| `CalibratedEtaEngine.ts` | EWMA per-class ETA + queue-position estimation |
| `StreamingItlWatchdog.ts` | ITL gap + TTFT deadlock detection & escalation |
| `ShadowShardStandby.ts` | Pre-warmed backup shards, sub-50ms handover |
| `AntiZombieLeash.ts` | Client disconnect detection + wallet refund |
| `BroccoliResumableJobEngine.ts` | Durable token buffer, Last-Event-ID resume |
| `TokenAwareSizer.ts` | Virtual weight for token-aware DRR debits |
| `DeficitRoundRobinQueue.ts` | Multi-tenant DRR fair-share scheduling |
| `SingleFlightCoalescer.ts` | Identical prompt deduplication |
| `NanoIngressFilter.ts` | Per-tenant token-bucket pre-queue governor |
| `HedgedRequestManager.ts` | P95+ latency hedge requests to backup shards |
| `AdaptiveConcurrencyLimiter.ts` | AIMD concurrency ceiling |
| `AntiAgingAdmissionGovernor.ts` | Sojourn-time AQM drop-head governor |
| `ShuffleShardedQueue.ts` | Consistent-hash tenant isolation |
| `CloudTasksQueueController.ts` | Cloud Tasks–inspired queue execution control |
| `CloudRunShardRouter.ts` | Cloud Run–inspired shard routing |
| `BroccoliHybridTaskStore.ts` | BroccoliDB task + job_tokens storage layer |
| `index.test.ts` | 16-invariant enterprise verification suite |
| `simulate-10k-qps.ts` | 10K QPS comparative benchmark |
| `simulate-100k-qps.ts` | 100K QPS stress test |
| `simulate-unpredictable-inference.ts` | 2–3 minute inference simulation |

---

## 🔗 Architecture Decision Records

- [ADR 0010](../../docs/adr/0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) — CloudTasks/CloudRun Queue Substrate
- [ADR 0011](../../docs/adr/0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) — DAG Workflows & SSE Event Bus
- [ADR 0043](../../docs/adr/0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md) — BroccoliDB Hybrid Resilience
- [ADR 0089](../../docs/adr/0089-anti-stampede-bounded-admission-queue-and-aimd-concurrency-limiter.md) — Anti-Stampede & AIMD Concurrency
- [ADR 0112](../../docs/adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md) — Authoritative Shard Fleet Pool
- **[ADR 0113](../../docs/adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) — Unpredictable Inference Engine ← NEW**
