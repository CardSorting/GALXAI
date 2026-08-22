# ADR 0005: Zero-Allocation Circular Ring Buffer Telemetry & EWMA Latency

## Status
**Accepted** (Implemented and Verified)

## Context
Real-time dashboard rendering, latency routing, and SLA tracking require continuous calculation of $P_{50}, P_{90}, P_{99}$ latency metrics and throughput across active upstream shards.
- Querying a relational or document database on every API request or dashboard poll introduces high I/O latency and garbage collection overhead.
- Simple arithmetic mean latency fails to account for recent degradation and is sensitive to old outliers.

## Decision
We implemented **`GalxMetricsEngine`** with **Circular Ring Buffer Histograms** and **EWMA Latency Routing Feedback**:

### 1. Zero-Allocation Circular Ring Buffer
- Samples (latency, tokens consumed, status code, model ID, shard ID, timestamp) are recorded in an in-memory fixed-size array ring buffer ($N=2000$).
- New samples overwrite the oldest entries via `(head + 1) % bufferSize` with $O(1)$ write complexity and zero memory allocations.
- Sliding window aggregations compute $P_{50}, P_{90}, P_{99}$ percentiles, RPM, TPM, and per-provider error rates in $< 1\text{ms}$.

### 2. Exponentially Weighted Moving Average (EWMA) Latency Feedback
- Each shard maintains an EWMA latency metric updated upon lease release:
  $$\text{EWMA}_{\text{new}} = 0.8 \times \text{EWMA}_{\text{prev}} + 0.2 \times \text{Latency}_{\text{sample}}$$
- The Hydraulic Headroom cycling dispatcher factors EWMA latency directly into its candidate selection formula:
  $$\text{LatencyMultiplier} = \left(\frac{600}{\max(100, \text{averageLatencyMs})}\right)^{0.25}$$
- Shards responding faster automatically absorb higher request throughput.

## Consequences
- **Positive**: Sub-millisecond latency telemetry queries on `/api/pool/telemetry`.
- **Positive**: Zero database read load for live dashboard monitoring.
- **Positive**: Traffic automatically gravitates toward low-latency upstream shards.
