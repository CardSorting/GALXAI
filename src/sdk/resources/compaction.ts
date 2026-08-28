/**
 * GALXAI Developer SDK: BroccoliDB Compaction Resource
 * Safe, size-bounded data compaction, streaming deduplication, and factual provenance verification.
 */

import {
  BroccoliCompactionFacade,
  type CompactionRequest,
  type CompactionResponse,
  type DomainOptimizationResult,
  type HighVelocityBatchResult,
  type MegaIncidentCascaderResult,
  type MegaDocumentPyramidResult,
  type MegaIncidentInput,
  type MultiPageDocumentInput,
  type CompactionBatchItem,
} from '../../core/broccolidb/BroccoliCompactionFacade';
import type { GalxAIClientCore } from '../client';

export class CompactionResource {
  private readonly core?: GalxAIClientCore;

  constructor(core?: GalxAIClientCore) {
    this.core = core;
  }

  /**
   * Safe domain compaction with automatic fail-closed provenance checking.
   */
  public domain(text: string, domainHint?: string): DomainOptimizationResult {
    return BroccoliCompactionFacade.compactDomain(text, domainHint);
  }

  /**
   * High-velocity batch frame compaction and deduplication.
   */
  public batch(
    items: CompactionBatchItem[],
    options?: { flushMetrics?: boolean }
  ): HighVelocityBatchResult {
    return BroccoliCompactionFacade.compactBatch(items, options);
  }

  /**
   * Multi-thousand page incident storm cascading and T0 anomaly isolation.
   */
  public incident(input: MegaIncidentInput): MegaIncidentCascaderResult {
    return BroccoliCompactionFacade.compactIncident(input);
  }

  /**
   * Multi-hundred page hierarchical document pyramid summarization.
   */
  public document(input: MultiPageDocumentInput): MegaDocumentPyramidResult {
    return BroccoliCompactionFacade.compactDocument(input);
  }

  /**
   * Polymorphic dispatcher supporting uniform typed request payloads.
   */
  public compact(request: CompactionRequest): CompactionResponse {
    return BroccoliCompactionFacade.compact(request);
  }

  /**
   * Remote HTTP compaction request to GALXAI Edge Gateway (/api/audit/broccolidb/compact).
   */
  public async compactRemote(request: CompactionRequest): Promise<any> {
    if (!this.core) {
      throw new Error('Remote compaction requires an initialized GalxAI client core with network configuration.');
    }
    return this.core.request('/api/audit/broccolidb/compact', {
      method: 'POST',
      body: request,
    });
  }
}
