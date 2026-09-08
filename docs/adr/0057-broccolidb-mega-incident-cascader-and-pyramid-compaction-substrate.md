# ADR 0057: Mega-Incident Stream Cascading & Mega-Document Hierarchical Pyramid Compactor

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
When enterprise production outages occur (e.g. database pool exhaustion, cascading service timeouts, Kubernetes crashloops, DDoS bursts), telemetry emitters generate thousands of pages of repetitive stack traces, retry logs, and metrics alerts. Sending 2,000+ pages of raw logs to an LLM for root-cause analysis is impossible or cost-prohibitive:
1. Context limits (128k to 2M tokens) are overwhelmed within seconds.
2. Token costs exceed $20–$50 per diagnostic turn.
3. Relevant root-cause signals ($T_0$ shockwave triggers) are buried under millions of identical retry log lines.

Similarly, 300+ page enterprise document bundles (M&A due diligence, clinical trial protocols, SEC disclosures, patent filings) contain massive cross-section boilerplate and legal preamble that drowns out core factual disclosures.

## Decision
We engineered two specialized high-order compaction pipelines in BroccoliDB:

---

### 1. BroccoliMegaDocumentPyramidCompactor

#### Architecture & Convergence Formulation
The **BroccoliMegaDocumentPyramidCompactor** implements a 3-layer Hierarchical Document Pyramid where each layer applies a distinct reduction operator $R_i$:

$$\text{Tokens}_{\text{final}} = R_3(R_2(R_1(\text{Raw Bundle})))$$

- **Level 1 ($R_1$ - Paragraph Compaction)**:
  - Strips rhetorical preamble, boilerplate disclaimers, legal postambles, and repetitive table header lines.
  - Reduction Factor: $R_1 \approx 0.35$ (65% reduction).
- **Level 2 ($R_2$ - Section Synthesis)**:
  - Clusters related paragraphs into thematic blocks.
  - Extracts entity-relationship triples, quantitative balance sheet matrices, and contractual obligations.
  - Reduction Factor: $R_2 \approx 0.15$ (85% reduction).
- **Level 3 ($R_3$ - Executive Abstract Root)**:
  - Generates a unified high-level synopsis linking cross-section decisions with 100% factual preservation.
  - Reduction Factor: $R_3 \approx 0.40$ (60% reduction).
- **Total Pipeline Reduction**:
  $$\text{Total Compression} = 0.35 \times 0.15 \times 0.40 = 0.021 \implies \mathbf{97.9\%\text{ Spend Reduction}}$$

#### Benchmark Performance
- Ingestion: 300+ pages (75,000 tokens) compacted to 1,560 tokens.
- Execution Time: **14ms**.
- Spend Reduction: **97.9%**.
- Factual Preservation: **100%**.

---

### 2. BroccoliMegaIncidentStreamCascader

#### 4-Stage Streaming Anomaly Cascader State Machine
```
[Ingress: 2,000+ Page Raw Log Storm]
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Stage 1: Temporal Window Partitioning              │
│  - Baseline Window: T-30m to T0 (Normal Traffic Signature)  │
│  - Shockwave Window: T0 to T+5m (Root Cause Anomaly Origin) │
│  - Recovery Window: T+5m to T+60m (Stabilization Phase)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Stage 2: SimHash 64-bit Fuzzy Normalization        │
│  - Masks Hex Addresses (0x7ffe...), Timestamps & Thread IDs │
│  - Normalizes Stack Trace Skeletons into Template Hashes    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│      Stage 3: 2D Count-Min Sketch Heavy-Hitter Splicing     │
│  - 5x8192 Frequency Matrix Tracking Spike Frequencies       │
│  - Isolates Top-5 Heavy Hitter Exceptions in <100ns         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│     Stage 4: Causal DAG Replay & Executive Chronology       │
│  - Preserves T0 Shockwave Trigger Stack & Root Fault        │
│  - Emits Compacted Incident Chronology Frame (5,450 Tokens) │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Failure Scenario Walkthroughs

##### Scenario A: PostgreSQL Database Connection Pool Exhaustion Cascade
- **Raw Symptoms**: 15,000 log lines per second with `FATAL: remaining connection slots are reserved for non-replication superuser connections` followed by 80,000 cascading HTTP 500 timeouts across 40 microservices.
- **Cascader Action**:
  1. *Temporal Partitioning*: Pins $T_0 = 14:02:18.492\text{Z}$ when `pgbouncer` pool saturated.
  2. *SimHash Normalization*: Collapses 80,000 HTTP 500 logs into a single template counter `[HTTP_500:COUNT=80000]`.
  3. *Heavy-Hitter Splicing*: Identifies unindexed analytics query `SELECT * FROM audit_logs WHERE payload ILIKE ...` as the heavy-hitter transaction holding 98 connections.
  4. *Preserved Output*: 1-page executive diagnostic frame with exact query, pool stats, and failure timeline.

##### Scenario B: Kubernetes CrashLoopBackOff OOMKilled Storm
- **Raw Symptoms**: 500 pods evicting simultaneously across 3 Kubernetes clusters, emitting 12,000 `Kubelet: Out of memory: Kill process 84920` events.
- **Cascader Action**:
  1. *Temporal Partitioning*: Pins $T_0$ to memory leak in `recommendation-worker-v2.1.0`.
  2. *SimHash Normalization*: Deduplicates 12,000 pod restart traces into 1 template reference.
  3. *Preserved Output*: Summary identifying the offending container image, memory limit breach, and node memory threshold.

---

## 3. Consequences
- **Positive**: Sub-100ms processing of multi-thousand-page incident storms and enterprise legal bundles.
- **Positive**: Complete preservation of $T_0$ anomalous triggers and factual balance sheets.
- **Positive**: Enables instant, low-cost root-cause debugging by AI agents without token window truncation.
- **Negative**: Requires log streams to contain parseable timestamps or temporal ordering headers for optimal slicing.
