/**
 * GALXAI BroccoliDB Production Compaction Facade
 * 
 * The supported, safe public boundary for all enterprise data compaction, streaming
 * deduplication, and forensic log reduction workflows.
 * 
 * Guarantees:
 * 1. Provenance Gate Enforcement: Direct generated compactors are shielded; all domain
 *    transformations pass through BroccoliCompactionSafety fail-closed verification.
 * 2. Strict Input Bounds: Rejects unbounded strings, malformed budgets, and out-of-range
 *    frame batches to prevent heap exhaustion before token slicing.
 * 3. Unified Polymorphic API: Single safe entry point for domain, high-velocity batch,
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
  MegaIncidentInput,
  MegaIncidentCascaderResult,
  PartitionMicroDigest,
  MultiPageDocumentInput,
  MegaDocumentPyramidResult,
  ExtractedSectionDigest,
  CompactionFidelityStatus,
  CompactionFidelityResult,
};

export type CompactionMode = 'domain' | 'batch' | 'incident' | 'document';

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
        throw new RangeError(`Unsupported compaction mode: ${(req as any).mode}. Supported modes: domain, batch, incident, document`);
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
