/**
 * GALXAI Unified BroccoliDB AI Spend Governance Substrate
 * 
 * Master coordinator orchestrating:
 * 1. BroccoliPromptCASVault: Content-addressable prompt deduplication & Brotli compression.
 * 2. SemanticEdgeCache: Sub-microsecond semantic query caching (<0.5µs).
 * 3. BroccoliSpendLease: Atomic CAS budget reservations & double-spend prevention.
 * 4. BroccoliSpendWAL: Binary write-ahead log for zero-data-loss durability.
 * 5. SpendAnomalyDetector: Real-time Z-score spend anomaly detection.
 * 6. BroccoliSpendAnalytics: Multi-dimensional departmental aggregations.
 * 7. BroccoliSpendStreamer: Reactive Change Data Capture (CDC) streaming.
 * 8. BroccoliSpendTimeline: Point-in-time cryptographic state checkpointing.
 */

import { BroccoliPromptCASVault } from './BroccoliPromptCASVault';
import { SemanticEdgeCache, SemanticCacheLookupResult } from '../optimization/SemanticEdgeCache';
import { BroccoliSpendLease } from './BroccoliSpendLease';
import { BroccoliSpendWAL } from './BroccoliSpendWAL';
import { SpendAnomalyDetector, AnomalyDetectionRecord } from '../governance/SpendAnomalyDetector';
import { BroccoliSpendAnalytics, SpendLedgerRecord } from './BroccoliSpendAnalytics';
import { BroccoliSpendStreamer } from './BroccoliSpendStreamer';
import { BroccoliSpendTimeline, SpendTimelineCheckpoint } from './BroccoliSpendTimeline';

export interface RequestLifecycleParams {
  traceId: string;
  department: string;
  costCenter: string;
  serviceId: string;
  model: string;
  promptText: string;
  estimatedCostUsd: number;
  actualCostUsd?: number;
  avoidedWasteUsd?: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

export interface RequestLifecycleResult {
  cacheLookup: SemanticCacheLookupResult;
  promptCasHash: string;
  leaseId?: string;
  walSequence: number;
  anomaly?: AnomalyDetectionRecord;
  settled: boolean;
}

export class BroccoliSpendSubstrate {
  private static isInitialized = false;

  /**
   * Initializes the unified BroccoliDB spend substrate
   */
  public static init(): void {
    if (this.isInitialized) return;
    BroccoliSpendStreamer.init();
    this.isInitialized = true;
  }

  /**
   * Executes the complete BroccoliDB spend governance lifecycle for a request
   */
  public static processLifecycle(params: RequestLifecycleParams): RequestLifecycleResult {
    this.init();

    // 1. Content-Addressable Prompt Deduplication
    const casResult = BroccoliPromptCASVault.storePrompt(params.promptText);

    // 2. Sub-microsecond Semantic Cache Lookup
    const cacheLookup = SemanticEdgeCache.lookup(params.promptText, params.model);

    // 3. Atomic CAS Budget Reservation
    const lease = BroccoliSpendLease.reserveBudget(params.department, params.estimatedCostUsd);

    // 4. Record spend in WAL and Analytics Ledger
    const actualCost = params.actualCostUsd ?? params.estimatedCostUsd;
    const avoidedWaste = params.avoidedWasteUsd ?? 0;

    const ledgerRecord: SpendLedgerRecord = {
      id: params.traceId,
      department: params.department,
      costCenter: params.costCenter,
      serviceId: params.serviceId,
      model: params.model,
      grossRetailUsd: actualCost + avoidedWaste,
      netGalxUsd: actualCost,
      avoidedWasteUsd: avoidedWaste,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      durationMs: params.durationMs,
      timestampMs: Date.now(),
    };

    const walFrame = BroccoliSpendWAL.append(ledgerRecord);

    // 5. Evaluate Anomaly Detection
    const anomaly = SpendAnomalyDetector.recordAndEvaluate({
      timestampMs: Date.now(),
      costUsd: actualCost,
      tokens: params.promptTokens + params.completionTokens,
      serviceId: params.serviceId,
      department: params.department,
    });

    // 6. Settle Lease if reserved
    let settled = false;
    if (lease.success && lease.leaseId) {
      settled = BroccoliSpendLease.settleSpend(lease.leaseId, actualCost);
    }

    return {
      cacheLookup,
      promptCasHash: casResult.sha256,
      leaseId: lease.leaseId,
      walSequence: walFrame.seq,
      anomaly: anomaly.isAnomaly ? anomaly : undefined,
      settled,
    };
  }

  /**
   * Captures an instant cryptographic state snapshot
   */
  public static createCheckpoint(label?: string): SpendTimelineCheckpoint {
    return BroccoliSpendTimeline.createCheckpoint(label);
  }

  /**
   * Resets all BroccoliDB spend tables
   */
  public static clearAll(): void {
    BroccoliPromptCASVault.clear();
    SemanticEdgeCache.clear();
    BroccoliSpendLease.clear();
    BroccoliSpendWAL.clear();
    SpendAnomalyDetector.resetWindows();
    BroccoliSpendAnalytics.clear();
    BroccoliSpendTimeline.clear();
  }
}
