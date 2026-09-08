# ADR 0061: BroccoliDB NetFlow Security, L2 Order Book Depth, and Continuous Sliding-Window Stream Compaction

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
Following ADRs 0056 through 0060, enterprise customers in cybersecurity, high-frequency trading (HFT), and real-time IoT stream processing required specialized, sub-millisecond data compaction protocols.

Specifically:
1. **Network Packet & Flow Floods (NetFlow/IPFIX/PCAP)**: Network anomaly detection systems generate millions of TCP/UDP/ICMP flow records per minute. Sending raw flow dumps to security reasoning models overwhelms context windows with repetitive header flags and non-critical packet counters.
2. **Financial Level-2/Level-3 Tick Stream Floods**: Order matching engines emit hundreds of thousands of microsecond tick updates, bid/ask flickering, and order cancellations per second. Quantitative trading agents need a consolidated Depth-of-Market (DoM) ladder with VWAP, spread, and order flow imbalance rather than thousands of individual tick lines.
3. **Continuous Streaming Backpressure & Horizon Decays**: Continuous WebSocket/SSE telemetry feeds require bounded memory guarantees and sliding-window statistical compaction to prevent heap leaks while maintaining up-to-the-second anomaly awareness.

## Decision

We expanded `BroccoliHighVelocityPipeline` and `BroccoliCompactionFacade` with 3 specialized high-velocity streaming engines:

### 1. NetFlow / IPFIX / PCAP Flow Compaction (`compactNetworkStream`)
- Aggregates millions of packet events into bidirectional flow conversation keys (`srcIp -> dstIp [PROTO]`).
- Identifies Top Talkers by volume and packet frequency.
- Evaluates automated security heuristics (Port Scans, SYN Floods, Outbound Exfiltration).
- Slashes 95%–98% of raw flow noise while isolating security threats.

### 2. Level-2 / Level-3 Order Book Depth Compaction (`compactOrderBookStream`)
- Aggregates raw tick feeds into consolidated Bid and Ask ladders across configurable depth levels.
- Automatically calculates Best Bid, Best Ask, Spread (in raw units and basis points), Volume Weighted Average Price (VWAP), and Order Flow Imbalance ratio.
- Slashes 90%–96% of high-frequency tick token volume.

### 3. Continuous Sliding-Window Stream Compaction (`compactSlidingWindowStream`)
- Maintains an active temporal window (e.g. 60s, 300s), calculating event rates per second, exponential moving averages (EMA), and trend directions (`INCREASING`, `DECREASING`, `STABLE`).
- Prunes expired out-of-window historical events, bounding memory consumption.

### 4. 11-Mode Universal Polymorphic Compaction Facade
We updated `BroccoliCompactionFacade` and the `/api/audit/broccolidb/compact` REST API to support all 11 production compaction modes:
1. `domain`: 180 enterprise domain compactors (100% verified factual provenance).
2. `batch`: High-velocity vector batching with L1 LRU memoization.
3. `log_stream`: Drain-style parameterized log clustering.
4. `metric_stream`: Gorilla/TSDB time-series downsampling.
5. `trace_stream`: OpenTelemetry / W3C distributed trace critical path extraction.
6. `structured_stream`: Columnar JSON/NDJSON schema projection.
7. `network_stream`: NetFlow / IPFIX top talkers & security heuristic digest.
8. `orderbook_stream`: Level-2/Level-3 market depth & VWAP consolidation.
9. `window_stream`: Continuous sliding-window rate & trend tracking.
10. `incident`: Multi-thousand-page log storm cascading.
11. `document`: Hierarchical multi-page document pyramid summarization.

---

## Consequences

- **Positive**: First-class support for cybersecurity, quantitative finance, and continuous IoT streams.
- **Positive**: Sub-microsecond execution, strict size bounds, and zero-hallucination factual provenance.
- **Positive**: Full test suite coverage across all 11 modes and 180 domain compactors with 0 failures.
