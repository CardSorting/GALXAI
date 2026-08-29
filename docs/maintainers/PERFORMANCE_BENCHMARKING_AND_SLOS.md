# 📊 Maintainer Guide: Performance Benchmarking & Service Level Objectives (SLOs)

> **Target Audience**: Performance Engineers, SREs, and Platform Maintainers.  
> **Mission**: Quantitatively defend sub-millisecond execution, high compression efficiency, and zero memory leaks.

---

## 1. The 4 Core Service Level Objectives (SLOs)

| Metric | Target SLO | Measurement Method | Alert Threshold |
| :--- | :--- | :--- | :--- |
| **L1 Rolling Memory Lookup** | $P_{95} \le 0.08\text{ms}$<br>$P_{99} \le 0.12\text{ms}$ | `performance.now()` in `GalxRollingContextEngine` | $P_{99} > 0.50\text{ms}$ |
| **Reciprocal Rank Fusion (RRF) RAG** | $P_{95} \le 0.45\text{ms}$<br>$P_{99} \le 0.85\text{ms}$ | In-memory 1,000-page document ranking | $P_{99} > 2.0\text{ms}$ |
| **Compaction Execution Overhead** | $P_{95} \le 1.5\text{ms}$<br>$P_{99} \le 5.0\text{ms}$ | `performance.now()` in `BroccoliCompactionFacade` | $P_{99} > 10.0\text{ms}$ |
| **PostgreSQL 1-Hop Composite Gate** | $P_{95} \le 1.5\text{ms}$<br>$P_{99} \le 3.0\text{ms}$ | PL/pgSQL composite stored procedure | $P_{99} > 6.0\text{ms}$ |
| **Time-to-First-Token (TTFT)** | $P_{95} \le 25\text{ms}$ (Edge Mesh)<br>$P_{99} \le 45\text{ms}$ (Serverless Origin) | Synthetic edge probes across global PoPs | $P_{99} > 80.0\text{ms}$ |
| **Token Reduction Efficiency** | $\ge 60\%$ (High Redundancy)<br>$\ge 40\%$ (Moderate Redundancy) | `BroccoliInferenceBoundaryBenchmarker` | Reduction $< 35\%$ on baseline test |
| **Zero-Copy Memory Spillover** | $\le 32\text{MB}$ peak volatile heap | `process.memoryUsage().heapUsed` | Heap breach $> 48\text{MB}$ slab |

---

## 2. Compaction Latency Budget Breakdown

Every compaction request dispatched through `BroccoliCompactionFacade` has a strict latency budget of $<2.0\text{ms}$:

```text
┌────────────────────────────────────────────────────────────────────────┐
│             TOTAL IN-PROCESS COMPACTION BUDGET: < 2.0 ms                │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ 1. String Bounds  │ 2. Aho-Corasick /    │ 3. Fail-Closed Grounding    │
│    Validation     │    Regex Extraction  │    Safety Verification      │
│    (< 0.05 ms)    │    (< 1.20 ms)       │    (< 0.60 ms)              │
└───────────────────┴──────────────────────┴─────────────────────────────┘
```

---

## 3. Running Continuous Performance Regressions

Maintainers should execute the benchmark suite to detect algorithmic regressions before merging:

### 1. Empirical Provider Boundary Benchmarking:
```bash
npm run bench:inference-boundary
```
Measures token compression, latency delta, and dollars saved across `gpt-4o`, `gpt-4o-mini`, and `o3-mini`.

### 2. High-Resolution Domain Cluster Throughput:
```bash
npm run bench:180-domains
```
Asserts that all 180 domain compactors execute in $<1.5\text{ms}$ each with $100\%$ factual grounding.

### 3. Payload Forensic Dissection:
```bash
npm run dissect:payloads
```
Generates visual token-level breakdowns comparing baseline prompts against compacted representations.

---

## 4. Investigating Performance Regressions

If a PR causes a compaction latency spike ($>5\text{ms}$):

1. **Check for Catastrophic Regex Backtracking**:
   Ensure all regular expressions in domain compactors are non-capturing where appropriate and avoid nested unbounded quantifiers (e.g. `(a+)+`).
2. **Verify Memory Allocations**:
   Ensure typed array slices reuse pre-allocated slots rather than allocating fresh objects inside hot loops.
3. **Inspect L1 LRU Cache Hit Rates**:
   In `BroccoliHighVelocityPipeline`, check that repeated token patterns hit the in-memory memoization cache.

---

*Speed is a feature. Measure continuously.* 🥦📊⚡
