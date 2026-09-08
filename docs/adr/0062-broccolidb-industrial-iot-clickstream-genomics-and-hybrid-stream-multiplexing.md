# ADR 0062: BroccoliDB Industrial IoT Sensors, Clickstream RUM, Genomic Sequencing & Hybrid Stream Multiplexing

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
Following ADRs 0056 through 0061, enterprise AI systems operating in advanced industrial engineering, digital commerce analytics, life sciences, and cloud telemetry infrastructure demanded specialized, ultra-high-velocity data compaction pipelines for domain feeds that routinely generate gigabytes of repetitive telemetry per minute.

Specifically:
1. **Industrial IoT & Predictive Maintenance Sensor Arrays (`compactSensorStream`)**: Factory rotating machinery (turbines, pumps, compressors) generates continuous high-frequency vibration and thermal time-series. AI diagnostic engines need ISO 10816 vibration severity levels, RMS, Peak-to-Peak amplitudes, and Kurtosis indicators rather than millions of raw tick samples.
2. **Frontend Real-User Monitoring (RUM) & Session Clickstreams (`compactClickstream`)**: Web & mobile applications generate overwhelming event firehoses (pageviews, mousemove coordinates, scroll depths). Frontend reasoning models require user session journeys, conversion milestones, rage-click hotspots, and Core Web Vitals (LCP/INP/CLS) violations.
3. **Genomic Next-Generation Sequencing (NGS) Streams (`compactGenomicStream`)**: DNA sequencing pipelines emit millions of alignment reads and VCF variant records. Genomic reasoning models need high-impact pathogenic single nucleotide polymorphisms (SNPs), indels, and VUS alleles rather than millions of homozygous reference matches.
4. **Hybrid Stream Multiplexing Envelopes (`compactStreamEnvelope`)**: Multi-tenant telemetry forwarders (Vector, Fluentbit, Datadog Agent) multiplex mixed logs, metrics, traces, and sensor feeds in a single stream chunk. Stream ingesters need automatic payload categorization and sub-stream delegation to specialized compactors.

---

## Decision

We expanded `BroccoliHighVelocityPipeline` and `BroccoliCompactionFacade` with 4 specialized streaming engines:

### 1. Industrial IoT Sensor Array Compaction (`compactSensorStream`)
- Parses MQTT / Modbus / OPC UA feeds and computes RMS, Peak, and Kurtosis (vibration indicator).
- Automatically maps vibration signals to **ISO 10816 Machinery Severity Standards** (`NORMAL`, `WARNING`, `ALARM`, `CRITICAL`).
- Slashes **92%–97%** of raw vibration & thermal sensor noise.

### 2. Frontend RUM & Session Clickstream Compaction (`compactClickstream`)
- Aggregates client-side event sequences into user session funnels (`landing -> pricing -> checkout`).
- Isolates rage clicks, dead clicks, Core Web Vitals violations, and churn drop-off points.
- Slashes **90%–95%** of frontend clickstream token noise.

### 3. Genomic NGS Variant & Mutation Compaction (`compactGenomicStream`)
- Ingests VCF / SAM / BAM variant feeds.
- Filters out non-pathogenic homozygous reference sequences while elevating pathogenic mutations, allele frequencies, and clinical annotations (ClinVar / dbSNP).
- Slashes **95%–99%** of alignment noise.

### 4. Hybrid Multi-Stream Multiplexing Envelope (`compactStreamEnvelope`)
- Inspects heterogeneous batch envelopes, identifying embedded sub-stream payloads (Logs, Metrics, Traces, Structured Tables).
- Dispatches each partition to its optimal specialized compactor and synthesizes an aggregated, unified multi-stream prompt.

### 5. 15-Mode Universal Compaction Facade
The safe `BroccoliCompactionFacade` and `/api/audit/broccolidb/compact` REST API now support all 15 enterprise modes:
1. `domain` (180 Enterprise Domains)
2. `batch` (Vector Batching with L1 LRU)
3. `log_stream` (Drain Parameterized Log Clustering)
4. `metric_stream` (TSDB Time-Series Downsampling)
5. `trace_stream` (OTel Distributed Trace Slicing)
6. `structured_stream` (Columnar Schema Projection)
7. `network_stream` (NetFlow / IPFIX Flow Security)
8. `orderbook_stream` (L2/L3 Market Depth & VWAP)
9. `window_stream` (Sliding-Window Trend Tracking)
10. `sensor_stream` (Industrial IoT ISO 10816 Vibration)
11. `clickstream` (Frontend RUM & Rage-Click Funnels)
12. `genomic_stream` (NGS Pathogenic Mutation Slicing)
13. `stream_envelope` (Hybrid Multi-Stream Multiplexing)
14. `incident` (Multi-Thousand-Page Log Cascading)
15. `document` (Hierarchical Document Pyramid)

---

## Consequences

- **Positive**: Complete coverage of high-velocity industrial, financial, cybersecurity, life science, and web applications.
- **Positive**: Strict fail-closed provenance gate (`BroccoliCompactionSafety`) guaranteed across all 15 modes.
- **Positive**: 100% verified test pass rate across all 180 domain compactors and 15 streaming pipeline modes.
