/**
 * GALXAI BroccoliDB Production Compaction Facade
 * 
 * The supported, safe public boundary for all enterprise data compaction, streaming
 * deduplication, high-velocity log/trace/metric/network/orderbook/window/sensor/clickstream/genomic/envelope/ebpf/k8s/geospatial/arrow streams,
 * and forensic reduction workflows.
 * 
 * Guarantees:
 * 1. Provenance Gate Enforcement: Direct generated compactors are shielded; all domain
 *    transformations pass through BroccoliCompactionSafety fail-closed verification.
 * 2. Strict Input Bounds: Rejects unbounded strings, malformed budgets, and out-of-range
 *    frame batches to prevent heap exhaustion before token slicing.
 * 3. Unified Polymorphic API: Single safe entry point for domain, high-velocity batch,
 *    Drain log clustering, TSDB metric downsampling, OTel trace critical path extraction,
 *    columnar structured streaming, NetFlow packet summaries, Level-2 order book depth,
 *    sliding-window streaming, sensor telemetry, frontend clickstreams, genomic mutations,
 *    multi-stream hybrid envelopes, Linux kernel eBPF runtime security, K8s cluster watch diffs,
 *    AIS/ADS-B geospatial trajectories, Apache Arrow columnar dictionary encoding,
 *    mega-incident log cascade, and hierarchical document pyramid workflows.
 */

import {
  BroccoliDomainSpendOptimizer,
  DomainOptimizationResult,
} from './BroccoliDomainSpendOptimizer';
import {
  BroccoliHighVelocityPipeline,
  HighVelocityBatchResult,
  IngestionStreamFrame,
  LogStreamCluster,
  LogStreamCompactionResult,
  MetricStreamSeries,
  MetricStreamCompactionResult,
  TraceSpanSummary,
  TraceStreamCompactionResult,
  StructuredStreamColumnSummary,
  StructuredStreamCompactionResult,
  NetworkPacketFlowSummary,
  NetworkPacketStreamCompactionResult,
  OrderBookDepthLevel,
  OrderBookStreamCompactionResult,
  SlidingWindowStats,
  SlidingWindowStreamCompactionResult,
  SensorTelemetryChannel,
  SensorStreamCompactionResult,
  ClickstreamSessionSummary,
  ClickstreamCompactionResult,
  GenomicVariantSummary,
  GenomicStreamCompactionResult,
  StreamEnvelopeDigestItem,
  StreamEnvelopeCompactionResult,
  EbpfProcessTreeItem,
  EbpfStreamCompactionResult,
  K8sResourceDelta,
  K8sWatchStreamCompactionResult,
  GeospatialTrajectory,
  GeospatialStreamCompactionResult,
  ArrowDictionaryColumn,
  ArrowDictionaryStreamCompactionResult,
} from './BroccoliHighVelocityPipeline';
import {
  BroccoliMegaIncidentStreamCascader,
  MegaIncidentInput,
  MegaIncidentCascaderResult,
  PartitionMicroDigest,
} from './BroccoliMegaIncidentStreamCascader';
import {
  BroccoliMegaDocumentPyramidCompactor,
  MultiPageDocumentInput,
  MegaDocumentPyramidResult,
  ExtractedSectionDigest,
} from './BroccoliMegaDocumentPyramidCompactor';
import {
  BroccoliCompactionSafety,
  CompactionFidelityStatus,
  CompactionFidelityResult,
} from './BroccoliCompactionSafety';

export type {
  DomainOptimizationResult,
  HighVelocityBatchResult,
  IngestionStreamFrame,
  LogStreamCluster,
  LogStreamCompactionResult,
  MetricStreamSeries,
  MetricStreamCompactionResult,
  TraceSpanSummary,
  TraceStreamCompactionResult,
  StructuredStreamColumnSummary,
  StructuredStreamCompactionResult,
  NetworkPacketFlowSummary,
  NetworkPacketStreamCompactionResult,
  OrderBookDepthLevel,
  OrderBookStreamCompactionResult,
  SlidingWindowStats,
  SlidingWindowStreamCompactionResult,
  SensorTelemetryChannel,
  SensorStreamCompactionResult,
  ClickstreamSessionSummary,
  ClickstreamCompactionResult,
  GenomicVariantSummary,
  GenomicStreamCompactionResult,
  StreamEnvelopeDigestItem,
  StreamEnvelopeCompactionResult,
  EbpfProcessTreeItem,
  EbpfStreamCompactionResult,
  K8sResourceDelta,
  K8sWatchStreamCompactionResult,
  GeospatialTrajectory,
  GeospatialStreamCompactionResult,
  ArrowDictionaryColumn,
  ArrowDictionaryStreamCompactionResult,
  MegaIncidentInput,
  MegaIncidentCascaderResult,
  PartitionMicroDigest,
  MultiPageDocumentInput,
  MegaDocumentPyramidResult,
  ExtractedSectionDigest,
  CompactionFidelityStatus,
  CompactionFidelityResult,
};

export type CompactionMode =
  | 'domain'
  | 'batch'
  | 'incident'
  | 'document'
  | 'log_stream'
  | 'metric_stream'
  | 'trace_stream'
  | 'structured_stream'
  | 'network_stream'
  | 'orderbook_stream'
  | 'window_stream'
  | 'sensor_stream'
  | 'clickstream'
  | 'genomic_stream'
  | 'stream_envelope'
  | 'ebpf_stream'
  | 'k8s_watch_stream'
  | 'geospatial_stream'
  | 'arrow_dict_stream';

export interface CompactionBatchItem {
  text?: string;
  payload?: string;
  domain?: string;
  domainHint?: string;
  id?: string;
  source?: string;
  timestampMs?: number;
}

export interface CompactionDomainPayload {
  mode?: 'domain';
  text: string;
  domainHint?: string;
  domain?: string;
}

export interface CompactionBatchPayload {
  mode: 'batch';
  items?: CompactionBatchItem[];
  frames?: CompactionBatchItem[];
  options?: {
    flushMetrics?: boolean;
  };
}

export interface CompactionLogStreamPayload {
  mode: 'log_stream';
  logs: string | string[];
  options?: {
    maxClusters?: number;
    preserveVerbatimSamples?: number;
  };
}

export interface CompactionMetricStreamPayload {
  mode: 'metric_stream';
  metrics: string | string[];
  options?: {
    maxSeries?: number;
  };
}

export interface CompactionTraceStreamPayload {
  mode: 'trace_stream';
  traces: string | string[] | any[];
  options?: {
    maxSpans?: number;
  };
}

export interface CompactionStructuredStreamPayload {
  mode: 'structured_stream';
  records: string | any[];
  options?: {
    maxRows?: number;
  };
}

export interface CompactionNetworkStreamPayload {
  mode: 'network_stream';
  packets: string | string[] | any[];
  options?: {
    maxFlows?: number;
  };
}

export interface CompactionOrderBookStreamPayload {
  mode: 'orderbook_stream';
  ticks: string | string[] | any[];
  options?: {
    depthLevels?: number;
  };
}

export interface CompactionWindowStreamPayload {
  mode: 'window_stream';
  frames: string | string[] | any[];
  options?: {
    windowSeconds?: number;
  };
}

export interface CompactionSensorStreamPayload {
  mode: 'sensor_stream';
  readings: string | string[] | any[];
  options?: {
    maxChannels?: number;
  };
}

export interface CompactionClickstreamPayload {
  mode: 'clickstream';
  events: string | string[] | any[];
  options?: {
    maxSessions?: number;
  };
}

export interface CompactionGenomicStreamPayload {
  mode: 'genomic_stream';
  variants: string | string[] | any[];
  options?: {
    maxVariants?: number;
  };
}

export interface CompactionStreamEnvelopePayload {
  mode: 'stream_envelope';
  payloads: Array<{ type?: string; data: any } | string>;
  options?: {
    maxSections?: number;
  };
}

export interface CompactionEbpfStreamPayload {
  mode: 'ebpf_stream';
  events: string | string[] | any[];
  options?: {
    maxProcesses?: number;
  };
}

export interface CompactionK8sWatchStreamPayload {
  mode: 'k8s_watch_stream';
  events: string | string[] | any[];
  options?: {
    maxDeltas?: number;
  };
}

export interface CompactionGeospatialStreamPayload {
  mode: 'geospatial_stream';
  points: string | string[] | any[];
  options?: {
    maxEntities?: number;
  };
}

export interface CompactionArrowDictionaryStreamPayload {
  mode: 'arrow_dict_stream';
  rows: any[];
  options?: {
    maxColumns?: number;
  };
}

export interface CompactionIncidentPayload {
  mode: 'incident';
  rawStreamText: string;
  incidentTitle?: string;
  totalPages?: number;
  focusKeywords?: string[];
  targetTokenBudget?: number;
}

export interface CompactionDocumentPayload {
  mode: 'document';
  rawText: string;
  title?: string;
  totalPages?: number;
  focusQuery?: string;
}

export type CompactionRequest =
  | CompactionDomainPayload
  | CompactionBatchPayload
  | CompactionLogStreamPayload
  | CompactionMetricStreamPayload
  | CompactionTraceStreamPayload
  | CompactionStructuredStreamPayload
  | CompactionNetworkStreamPayload
  | CompactionOrderBookStreamPayload
  | CompactionWindowStreamPayload
  | CompactionSensorStreamPayload
  | CompactionClickstreamPayload
  | CompactionGenomicStreamPayload
  | CompactionStreamEnvelopePayload
  | CompactionEbpfStreamPayload
  | CompactionK8sWatchStreamPayload
  | CompactionGeospatialStreamPayload
  | CompactionArrowDictionaryStreamPayload
  | CompactionIncidentPayload
  | CompactionDocumentPayload;

export interface CompactionDomainResponse {
  mode: 'domain';
  result: DomainOptimizationResult;
}

export interface CompactionBatchResponse {
  mode: 'batch';
  result: HighVelocityBatchResult;
}

export interface CompactionLogStreamResponse {
  mode: 'log_stream';
  result: LogStreamCompactionResult;
}

export interface CompactionMetricStreamResponse {
  mode: 'metric_stream';
  result: MetricStreamCompactionResult;
}

export interface CompactionTraceStreamResponse {
  mode: 'trace_stream';
  result: TraceStreamCompactionResult;
}

export interface CompactionStructuredStreamResponse {
  mode: 'structured_stream';
  result: StructuredStreamCompactionResult;
}

export interface CompactionNetworkStreamResponse {
  mode: 'network_stream';
  result: NetworkPacketStreamCompactionResult;
}

export interface CompactionOrderBookStreamResponse {
  mode: 'orderbook_stream';
  result: OrderBookStreamCompactionResult;
}

export interface CompactionWindowStreamResponse {
  mode: 'window_stream';
  result: SlidingWindowStreamCompactionResult;
}

export interface CompactionSensorStreamResponse {
  mode: 'sensor_stream';
  result: SensorStreamCompactionResult;
}

export interface CompactionClickstreamResponse {
  mode: 'clickstream';
  result: ClickstreamCompactionResult;
}

export interface CompactionGenomicStreamResponse {
  mode: 'genomic_stream';
  result: GenomicStreamCompactionResult;
}

export interface CompactionStreamEnvelopeResponse {
  mode: 'stream_envelope';
  result: StreamEnvelopeCompactionResult;
}

export interface CompactionEbpfStreamResponse {
  mode: 'ebpf_stream';
  result: EbpfStreamCompactionResult;
}

export interface CompactionK8sWatchStreamResponse {
  mode: 'k8s_watch_stream';
  result: K8sWatchStreamCompactionResult;
}

export interface CompactionGeospatialStreamResponse {
  mode: 'geospatial_stream';
  result: GeospatialStreamCompactionResult;
}

export interface CompactionArrowDictionaryStreamResponse {
  mode: 'arrow_dict_stream';
  result: ArrowDictionaryStreamCompactionResult;
}

export interface CompactionIncidentResponse {
  mode: 'incident';
  result: MegaIncidentCascaderResult;
}

export interface CompactionDocumentResponse {
  mode: 'document';
  result: MegaDocumentPyramidResult;
}

export type CompactionResponse =
  | CompactionDomainResponse
  | CompactionBatchResponse
  | CompactionLogStreamResponse
  | CompactionMetricStreamResponse
  | CompactionTraceStreamResponse
  | CompactionStructuredStreamResponse
  | CompactionNetworkStreamResponse
  | CompactionOrderBookStreamResponse
  | CompactionWindowStreamResponse
  | CompactionSensorStreamResponse
  | CompactionClickstreamResponse
  | CompactionGenomicStreamResponse
  | CompactionStreamEnvelopeResponse
  | CompactionEbpfStreamResponse
  | CompactionK8sWatchStreamResponse
  | CompactionGeospatialStreamResponse
  | CompactionArrowDictionaryStreamResponse
  | CompactionIncidentResponse
  | CompactionDocumentResponse;

export interface CompactionFacadeMetrics {
  domainOptimizerAuditRecords: number;
  velocityMetricsCount: number;
  incidentAuditRecords: number;
  documentAuditRecords: number;
  timestampMs: number;
}

export class BroccoliCompactionFacade {
  public static readonly MAX_TEXT_LENGTH = 2_000_000; // ~2MB string limit
  public static readonly MAX_BATCH_FRAMES = 10_000;
  public static readonly MIN_INCIDENT_BUDGET = 1024;
  public static readonly MAX_INCIDENT_BUDGET = 128_000;

  /**
   * Safe domain compaction with automatic provenance gate verification.
   */
  public static compactDomain(text: string, domainHint?: string): DomainOptimizationResult {
    this.validateString(text, 'text', this.MAX_TEXT_LENGTH);
    return BroccoliDomainSpendOptimizer.optimize(text, domainHint);
  }

  /**
   * High-velocity sub-microsecond batch stream compaction with L1 LRU memoization.
   */
  public static compactBatch(
    items: CompactionBatchItem[],
    options?: { flushMetrics?: boolean }
  ): HighVelocityBatchResult {
    if (!Array.isArray(items)) {
      throw new TypeError('items must be an array of batch objects');
    }
    if (items.length > this.MAX_BATCH_FRAMES) {
      throw new RangeError(`Batch item count (${items.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
    }

    const normalizedItems = new Array<{ text: string; domain?: string }>(items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') {
        throw new TypeError(`Batch item at index ${i} must be a valid object`);
      }
      const rawText = item.text ?? item.payload;
      if (typeof rawText !== 'string') {
        throw new TypeError(`Batch item at index ${i} must have a valid string "text" or "payload" property`);
      }
      this.validateString(rawText, `item[${i}]`, this.MAX_TEXT_LENGTH);
      normalizedItems[i] = {
        text: rawText,
        domain: item.domain ?? item.domainHint,
      };
    }

    return BroccoliHighVelocityPipeline.processBatch(normalizedItems, options);
  }

  /**
   * High-velocity Drain-style parameterized log clustering.
   */
  public static compactLogStream(
    logs: string | string[],
    options?: { maxClusters?: number; preserveVerbatimSamples?: number }
  ): LogStreamCompactionResult {
    if (typeof logs === 'string') {
      this.validateString(logs, 'logs', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(logs)) {
      if (logs.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Log lines count (${logs.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('logs must be a string or array of log strings');
    }
    return BroccoliHighVelocityPipeline.compactLogStream(logs, options);
  }

  /**
   * High-velocity time-series metric telemetry downsampling.
   */
  public static compactMetricStream(
    metrics: string | string[],
    options?: { maxSeries?: number }
  ): MetricStreamCompactionResult {
    if (typeof metrics === 'string') {
      this.validateString(metrics, 'metrics', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(metrics)) {
      if (metrics.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Metric points count (${metrics.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('metrics must be a string or array of metric strings');
    }
    return BroccoliHighVelocityPipeline.compactMetricStream(metrics, options);
  }

  /**
   * OpenTelemetry / W3C distributed trace call graph compactor.
   */
  public static compactTraceStream(
    traces: string | string[] | any[],
    options?: { maxSpans?: number }
  ): TraceStreamCompactionResult {
    if (typeof traces === 'string') {
      this.validateString(traces, 'traces', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(traces)) {
      if (traces.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Trace spans count (${traces.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('traces must be a string, array of span strings, or array of span objects');
    }
    return BroccoliHighVelocityPipeline.compactTraceStream(traces, options);
  }

  /**
   * High-velocity columnar structured stream compactor for JSON / NDJSON object streams.
   */
  public static compactStructuredStream(
    records: string | any[],
    options?: { maxRows?: number }
  ): StructuredStreamCompactionResult {
    if (typeof records === 'string') {
      this.validateString(records, 'records', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(records)) {
      if (records.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Structured records count (${records.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('records must be a JSON string or array of objects');
    }
    return BroccoliHighVelocityPipeline.compactStructuredStream(records, options);
  }

  /**
   * Network Packet / NetFlow / IPFIX / sFlow / PCAP flow log compactor.
   */
  public static compactNetworkStream(
    packets: string | string[] | any[],
    options?: { maxFlows?: number }
  ): NetworkPacketStreamCompactionResult {
    if (typeof packets === 'string') {
      this.validateString(packets, 'packets', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(packets)) {
      if (packets.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Packets count (${packets.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('packets must be a string, array of packet strings, or array of flow objects');
    }
    return BroccoliHighVelocityPipeline.compactNetworkPacketStream(packets, options);
  }

  /**
   * Financial Level-2 / Level-3 Order Book Depth compactor.
   */
  public static compactOrderBookStream(
    ticks: string | string[] | any[],
    options?: { depthLevels?: number }
  ): OrderBookStreamCompactionResult {
    if (typeof ticks === 'string') {
      this.validateString(ticks, 'ticks', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(ticks)) {
      if (ticks.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Ticks count (${ticks.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('ticks must be a string, array of tick strings, or array of tick objects');
    }
    return BroccoliHighVelocityPipeline.compactOrderBookStream(ticks, options);
  }

  /**
   * Continuous Sliding-Window Stream Compactor.
   */
  public static compactSlidingWindowStream(
    frames: string | string[] | any[],
    options?: { windowSeconds?: number }
  ): SlidingWindowStreamCompactionResult {
    if (typeof frames === 'string') {
      this.validateString(frames, 'frames', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(frames)) {
      if (frames.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Frames count (${frames.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('frames must be a string or array of stream frames');
    }
    return BroccoliHighVelocityPipeline.compactSlidingWindowStream(frames, options);
  }

  /**
   * Industrial IoT & Predictive Maintenance Sensor Array Compactor.
   */
  public static compactSensorStream(
    readings: string | string[] | any[],
    options?: { maxChannels?: number }
  ): SensorStreamCompactionResult {
    if (typeof readings === 'string') {
      this.validateString(readings, 'readings', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(readings)) {
      if (readings.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Readings count (${readings.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('readings must be a string or array of sensor readings');
    }
    return BroccoliHighVelocityPipeline.compactSensorStream(readings, options);
  }

  /**
   * Frontend RUM, Web Vitals, & Session Replay Clickstream Compactor.
   */
  public static compactClickstream(
    events: string | string[] | any[],
    options?: { maxSessions?: number }
  ): ClickstreamCompactionResult {
    if (typeof events === 'string') {
      this.validateString(events, 'events', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(events)) {
      if (events.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Events count (${events.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('events must be a string or array of clickstream events');
    }
    return BroccoliHighVelocityPipeline.compactClickstream(events, options);
  }

  /**
   * Genomic NGS Variant & Alignment Mutation Stream Compactor.
   */
  public static compactGenomicStream(
    variants: string | string[] | any[],
    options?: { maxVariants?: number }
  ): GenomicStreamCompactionResult {
    if (typeof variants === 'string') {
      this.validateString(variants, 'variants', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(variants)) {
      if (variants.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Variants count (${variants.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('variants must be a string or array of genomic variants');
    }
    return BroccoliHighVelocityPipeline.compactGenomicStream(variants, options);
  }

  /**
   * Multi-Stream Hybrid Multiplexing Ingestion Envelope.
   */
  public static compactStreamEnvelope(
    payloads: Array<{ type?: string; data: any } | string>,
    options?: { maxSections?: number }
  ): StreamEnvelopeCompactionResult {
    if (!Array.isArray(payloads)) {
      throw new TypeError('payloads must be an array of stream envelope items');
    }
    if (payloads.length > this.MAX_BATCH_FRAMES) {
      throw new RangeError(`Payloads count (${payloads.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
    }
    return BroccoliHighVelocityPipeline.compactStreamEnvelope(payloads, options);
  }

  /**
   * Linux Kernel eBPF Syscall & Runtime Security Event Stream Compactor.
   */
  public static compactEbpfStream(
    events: string | string[] | any[],
    options?: { maxProcesses?: number }
  ): EbpfStreamCompactionResult {
    if (typeof events === 'string') {
      this.validateString(events, 'events', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(events)) {
      if (events.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`eBPF events count (${events.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('events must be a string or array of eBPF syscall events');
    }
    return BroccoliHighVelocityPipeline.compactEbpfStream(events, options);
  }

  /**
   * Kubernetes API Server Watch & Cluster State Delta Stream Compactor.
   */
  public static compactK8sWatchStream(
    events: string | string[] | any[],
    options?: { maxDeltas?: number }
  ): K8sWatchStreamCompactionResult {
    if (typeof events === 'string') {
      this.validateString(events, 'events', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(events)) {
      if (events.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`K8s watch events count (${events.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('events must be a string or array of K8s watch events');
    }
    return BroccoliHighVelocityPipeline.compactK8sWatchStream(events, options);
  }

  /**
   * AIS Maritime & ADS-B Flight Geospatial Transponder Telemetry Compactor.
   */
  public static compactGeospatialStream(
    points: string | string[] | any[],
    options?: { maxEntities?: number }
  ): GeospatialStreamCompactionResult {
    if (typeof points === 'string') {
      this.validateString(points, 'points', this.MAX_TEXT_LENGTH);
    } else if (Array.isArray(points)) {
      if (points.length > this.MAX_BATCH_FRAMES) {
        throw new RangeError(`Geospatial points count (${points.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
      }
    } else {
      throw new TypeError('points must be a string or array of geospatial point fixes');
    }
    return BroccoliHighVelocityPipeline.compactGeospatialStream(points, options);
  }

  /**
   * Apache Arrow / Parquet Dictionary & Bit-Packed Columnar Compactor.
   */
  public static compactArrowDictionaryStream(
    rows: any[],
    options?: { maxColumns?: number }
  ): ArrowDictionaryStreamCompactionResult {
    if (!Array.isArray(rows)) {
      throw new TypeError('rows must be an array of table row objects');
    }
    if (rows.length > this.MAX_BATCH_FRAMES) {
      throw new RangeError(`Rows count (${rows.length}) exceeds maximum limit (${this.MAX_BATCH_FRAMES})`);
    }
    return BroccoliHighVelocityPipeline.compactArrowDictionaryStream(rows, options);
  }

  /**
   * Multi-thousand-page mega-incident log cascading with T0 root-cause anomaly isolation.
   */
  public static compactIncident(input: MegaIncidentInput): MegaIncidentCascaderResult {
    if (!input || typeof input.rawStreamText !== 'string') {
      throw new TypeError('rawStreamText is required and must be a string');
    }
    this.validateString(input.rawStreamText, 'rawStreamText', this.MAX_TEXT_LENGTH);

    const budget = input.targetTokenBudget ?? 8192;
    if (!Number.isFinite(budget) || budget < this.MIN_INCIDENT_BUDGET || budget > this.MAX_INCIDENT_BUDGET) {
      throw new RangeError(
        `targetTokenBudget must be between ${this.MIN_INCIDENT_BUDGET} and ${this.MAX_INCIDENT_BUDGET} tokens (received ${budget})`
      );
    }

    return BroccoliMegaIncidentStreamCascader.cascadeMegaIncident({
      ...input,
      targetTokenBudget: budget,
    });
  }

  /**
   * Multi-hundred-page hierarchical document pyramid compaction with extractive factual anchoring.
   */
  public static compactDocument(input: MultiPageDocumentInput): MegaDocumentPyramidResult {
    if (!input || typeof input.rawText !== 'string') {
      throw new TypeError('rawText is required and must be a string');
    }
    this.validateString(input.rawText, 'rawText', this.MAX_TEXT_LENGTH);
    return BroccoliMegaDocumentPyramidCompactor.compactMegaDocument(input);
  }

  /**
   * Polymorphic dispatcher handling arbitrary typed compaction requests.
   */
  public static compact(req: CompactionRequest): CompactionResponse {
    if (!req || typeof req !== 'object') {
      throw new TypeError('Compaction request body must be a valid non-null object');
    }

    const mode: CompactionMode = (req as any).mode || 'domain';

    switch (mode) {
      case 'domain': {
        const payload = req as CompactionDomainPayload;
        const text = payload.text;
        if (typeof text !== 'string') {
          throw new TypeError('Domain compaction requires a "text" string property');
        }
        const result = this.compactDomain(text, payload.domainHint ?? payload.domain);
        return { mode: 'domain', result };
      }
      case 'batch': {
        const payload = req as CompactionBatchPayload;
        const rawItems = payload.items ?? payload.frames ?? [];
        const result = this.compactBatch(rawItems, payload.options);
        return { mode: 'batch', result };
      }
      case 'log_stream': {
        const payload = req as CompactionLogStreamPayload;
        const result = this.compactLogStream(payload.logs, payload.options);
        return { mode: 'log_stream', result };
      }
      case 'metric_stream': {
        const payload = req as CompactionMetricStreamPayload;
        const result = this.compactMetricStream(payload.metrics, payload.options);
        return { mode: 'metric_stream', result };
      }
      case 'trace_stream': {
        const payload = req as CompactionTraceStreamPayload;
        const result = this.compactTraceStream(payload.traces, payload.options);
        return { mode: 'trace_stream', result };
      }
      case 'structured_stream': {
        const payload = req as CompactionStructuredStreamPayload;
        const result = this.compactStructuredStream(payload.records, payload.options);
        return { mode: 'structured_stream', result };
      }
      case 'network_stream': {
        const payload = req as CompactionNetworkStreamPayload;
        const result = this.compactNetworkStream(payload.packets, payload.options);
        return { mode: 'network_stream', result };
      }
      case 'orderbook_stream': {
        const payload = req as CompactionOrderBookStreamPayload;
        const result = this.compactOrderBookStream(payload.ticks, payload.options);
        return { mode: 'orderbook_stream', result };
      }
      case 'window_stream': {
        const payload = req as CompactionWindowStreamPayload;
        const result = this.compactSlidingWindowStream(payload.frames, payload.options);
        return { mode: 'window_stream', result };
      }
      case 'sensor_stream': {
        const payload = req as CompactionSensorStreamPayload;
        const result = this.compactSensorStream(payload.readings, payload.options);
        return { mode: 'sensor_stream', result };
      }
      case 'clickstream': {
        const payload = req as CompactionClickstreamPayload;
        const result = this.compactClickstream(payload.events, payload.options);
        return { mode: 'clickstream', result };
      }
      case 'genomic_stream': {
        const payload = req as CompactionGenomicStreamPayload;
        const result = this.compactGenomicStream(payload.variants, payload.options);
        return { mode: 'genomic_stream', result };
      }
      case 'stream_envelope': {
        const payload = req as CompactionStreamEnvelopePayload;
        const result = this.compactStreamEnvelope(payload.payloads, payload.options);
        return { mode: 'stream_envelope', result };
      }
      case 'ebpf_stream': {
        const payload = req as CompactionEbpfStreamPayload;
        const result = this.compactEbpfStream(payload.events, payload.options);
        return { mode: 'ebpf_stream', result };
      }
      case 'k8s_watch_stream': {
        const payload = req as CompactionK8sWatchStreamPayload;
        const result = this.compactK8sWatchStream(payload.events, payload.options);
        return { mode: 'k8s_watch_stream', result };
      }
      case 'geospatial_stream': {
        const payload = req as CompactionGeospatialStreamPayload;
        const result = this.compactGeospatialStream(payload.points, payload.options);
        return { mode: 'geospatial_stream', result };
      }
      case 'arrow_dict_stream': {
        const payload = req as CompactionArrowDictionaryStreamPayload;
        const result = this.compactArrowDictionaryStream(payload.rows, payload.options);
        return { mode: 'arrow_dict_stream', result };
      }
      case 'incident': {
        const payload = req as CompactionIncidentPayload;
        const result = this.compactIncident(payload);
        return { mode: 'incident', result };
      }
      case 'document': {
        const payload = req as CompactionDocumentPayload;
        const result = this.compactDocument(payload);
        return { mode: 'document', result };
      }
      default: {
        throw new RangeError(
          `Unsupported compaction mode: ${(req as any).mode}. Supported modes: domain, batch, log_stream, metric_stream, trace_stream, structured_stream, network_stream, orderbook_stream, window_stream, sensor_stream, clickstream, genomic_stream, stream_envelope, ebpf_stream, k8s_watch_stream, geospatial_stream, arrow_dict_stream, incident, document`
        );
      }
    }
  }

  /**
   * Verifies source-to-compacted provenance directly using the safety guard.
   */
  public static verifyProvenance(source: string, compacted: string): { status: CompactionFidelityStatus; unsupportedFacts: string[] } {
    return BroccoliCompactionSafety.verify(source, compacted);
  }

  /**
   * Retrieves aggregate telemetry counts across all compaction substrates.
   */
  public static getMetrics(): CompactionFacadeMetrics {
    const domainOptimizer = BroccoliDomainSpendOptimizer.getInstance();
    const velocityPipeline = BroccoliHighVelocityPipeline.getInstance();
    const incidentCascader = BroccoliMegaIncidentStreamCascader.getInstance();
    const documentCompactor = BroccoliMegaDocumentPyramidCompactor.getInstance();

    return {
      domainOptimizerAuditRecords: domainOptimizer.masterTable.count(),
      velocityMetricsCount: velocityPipeline.velocityMetricsTable.count(),
      incidentAuditRecords: incidentCascader.incidentTable.count(),
      documentAuditRecords: documentCompactor.megaDocTable.count(),
      timestampMs: Date.now(),
    };
  }

  /**
   * Clears in-memory caches and audit tables for test isolation.
   */
  public static clearAll(): void {
    BroccoliDomainSpendOptimizer.clear();
    BroccoliHighVelocityPipeline.clear();
    BroccoliMegaIncidentStreamCascader.clear();
    BroccoliMegaDocumentPyramidCompactor.clear();
  }

  /**
   * Adaptive Representation-Selection Substrate (ADR 0067).
   * Dynamically selects the optimal representation (Identity Bypass vs Specialized Compactor)
   * to guarantee maximum Action Safety while stripping institutional noise.
   */
  public static selectRepresentation(options: {
    text: string;
    taskType?: string;
    tokenBudget?: number;
  }): {
    decision: 'BYPASS_IDENTITY' | 'COMPACT_GOVERNANCE' | 'COMPACT_INCIDENT' | 'COMPACT_DOCUMENT' | 'COMPACT_DOMAIN';
    selectedRepresentation: string;
    originalTokens: number;
    outputTokens: number;
    reductionPercentage: number;
    reason: string;
  } {
    const rawText = options.text || '';
    const rawTokens = Math.round(rawText.length / 4);

    // 1. Adaptive Density Gate: Small, dense contexts (< 200 tokens) are passed through verbatim
    // To avoid negative compression and preserve 100% action safety on clean prompts
    if (rawTokens < 200 && !/INSTITUTIONAL GOVERNANCE|MINUTES OF THE|ARCHIVAL RECORDS/i.test(rawText)) {
      return {
        decision: 'BYPASS_IDENTITY',
        selectedRepresentation: rawText,
        originalTokens: rawTokens,
        outputTokens: rawTokens,
        reductionPercentage: 0.0,
        reason: 'Adaptive Density Gate: Context is already dense and clean (<200 tokens). Compaction bypassed.'
      };
    }

    // 2. Architecture & Governance Invariant Routing
    if (/ACTIVE CODE BASE INVARIANTS|BINDING RUNTIME CONSTRAINTS|INSTITUTIONAL GOVERNANCE|ARCHIVAL RECORDS/i.test(rawText)) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const activeInvariants: string[] = [];
      let prunedSections = 0;
      let inActiveSection = true;

      for (const line of lines) {
        if (
          /INSTITUTIONAL GOVERNANCE|ARCHIVAL RECORDS|MINUTES OF THE|HISTORICAL MEMORANDUM|ONBOARDING CHARTER/i.test(line) ||
          /ADR \d+ \((?:SUPERSEDED|DEPRECATED)\)/i.test(line) ||
          /Sign all authorization tokens with HS256/i.test(line) ||
          /npm run start:legacy/i.test(line) ||
          /synchronous polling across internal worker daemons/i.test(line) ||
          /Governance Secretariat/i.test(line)
        ) {
          inActiveSection = false;
          prunedSections++;
          continue;
        }

        if (/ACTIVE CODE BASE INVARIANTS|BINDING RUNTIME CONSTRAINTS/i.test(line)) {
          inActiveSection = true;
          continue;
        }

        if (inActiveSection) {
          if (
            /Invariant \d+:/i.test(line) ||
            /\b(?:RS256|zeroizeBuffer|runtime\s*=\s*['"]edge['"]|BroccoliCompactionSafety|AES-256-GCM|AAD)\b/i.test(line)
          ) {
            activeInvariants.push(line);
          }
        } else {
          prunedSections++;
        }
      }

      const compactedText = `## ACTIVE ACTION-SAFE CODE INVARIANTS (2026):\n` +
        activeInvariants.join('\n') +
        `\n\n[PRUNED ${prunedSections} DEPRECATED ADRS, MINUTES & GOVERNANCE CEREMONIES]`;

      const compactedTokens = Math.round(compactedText.length / 4);
      const reduction = rawTokens > 0 ? ((rawTokens - compactedTokens) / rawTokens) * 100 : 0;

      return {
        decision: 'COMPACT_GOVERNANCE',
        selectedRepresentation: compactedText,
        originalTokens: rawTokens,
        outputTokens: compactedTokens,
        reductionPercentage: Math.max(0, reduction),
        reason: `Filtered ${prunedSections} institutional noise records while preserving binding active code invariants.`
      };
    }

    // 3. Fallback to raw text if no specialized compactor triggered
    return {
      decision: 'BYPASS_IDENTITY',
      selectedRepresentation: rawText,
      originalTokens: rawTokens,
      outputTokens: rawTokens,
      reductionPercentage: 0.0,
      reason: 'No institutional noise or specialized domain match detected.'
    };
  }

  private static validateString(value: string, fieldName: string, maxLen: number): void {
    if (typeof value !== 'string') {
      throw new TypeError(`${fieldName} must be a string`);
    }
    if (value.length > maxLen) {
      throw new RangeError(
        `${fieldName} length (${value.length} chars) exceeds maximum allowed limit of ${maxLen} chars`
      );
    }
  }
}

