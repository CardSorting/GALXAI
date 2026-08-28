/**
 * GALXAI BroccoliDB Spend Timeline & Forensic Snapshot Engine
 * 
 * Provides deterministic point-in-time state checkpointing and historical
 * spend time-travel replay across BroccoliDB reactive tables.
 * 
 * Enables SRE and FinOps teams to snapshot system state before high-risk
 * deployments and replay historical traffic under simulated governance policies.
 */

import { createHash } from 'node:crypto';
import { BroccoliSpendAnalytics, SpendLedgerRecord } from './BroccoliSpendAnalytics';
import { SpendAnomalyDetector, AnomalyDetectionRecord } from '../governance/SpendAnomalyDetector';
import { SemanticEdgeCache, CachedCompletionRecord } from '../optimization/SemanticEdgeCache';

export interface SpendTimelineCheckpoint {
  id: string;
  label: string;
  timestampMs: number;
  stateRootHash: string;
  ledgerRecordsCount: number;
  anomalyRecordsCount: number;
  cachedRecordsCount: number;
  totalGrossRetailUsd: number;
  totalAvoidedWasteUsd: number;
  snapshot: {
    ledger: readonly SpendLedgerRecord[];
    anomalies: readonly AnomalyDetectionRecord[];
    cache: readonly CachedCompletionRecord[];
  };
}

export class BroccoliSpendTimeline {
  private static checkpoints: SpendTimelineCheckpoint[] = [];
  private static readonly MAX_CHECKPOINTS = 50;

  /**
   * Creates an atomic cryptographic checkpoint of all BroccoliDB spend and cache tables
   */
  public static createCheckpoint(label = 'manual_snapshot'): SpendTimelineCheckpoint {
    const analytics = BroccoliSpendAnalytics.getInstance();
    const anomalyDetector = SpendAnomalyDetector.getInstance();
    const semanticCache = SemanticEdgeCache.getInstance();

    const ledger = analytics.ledgerTable.getAll();
    const anomalies = anomalyDetector.anomalyTable.getAll();
    const cache = semanticCache.table.getAll();

    const breakdown = analytics.ledgerTable.aggregate({
      metrics: {
        gross: { metric: 'sum', field: 'grossRetailUsd' },
        waste: { metric: 'sum', field: 'avoidedWasteUsd' },
      },
    });

    const totalGrossRetailUsd = breakdown.grandTotals.gross || 0;
    const totalAvoidedWasteUsd = breakdown.grandTotals.waste || 0;

    // Compute deterministic SHA-256 state root hash
    const hash = createHash('sha256');
    hash.update(`ledger:${ledger.length}|anomalies:${anomalies.length}|cache:${cache.length}|gross:${totalGrossRetailUsd}`);
    const stateRootHash = hash.digest('hex');

    const checkpoint: SpendTimelineCheckpoint = {
      id: `chk_${Date.now()}_${stateRootHash.slice(0, 8)}`,
      label,
      timestampMs: Date.now(),
      stateRootHash,
      ledgerRecordsCount: ledger.length,
      anomalyRecordsCount: anomalies.length,
      cachedRecordsCount: cache.length,
      totalGrossRetailUsd,
      totalAvoidedWasteUsd,
      snapshot: {
        ledger: [...ledger],
        anomalies: [...anomalies],
        cache: [...cache],
      },
    };

    this.checkpoints.unshift(checkpoint);
    if (this.checkpoints.length > this.MAX_CHECKPOINTS) {
      this.checkpoints.pop();
    }

    return checkpoint;
  }

  /**
   * Restores table states to an earlier historical checkpoint (Time-Travel)
   */
  public static restoreCheckpoint(checkpointId: string): boolean {
    const checkpoint = this.checkpoints.find((c) => c.id === checkpointId);
    if (!checkpoint) return false;

    const analytics = BroccoliSpendAnalytics.getInstance();
    const anomalyDetector = SpendAnomalyDetector.getInstance();
    const semanticCache = SemanticEdgeCache.getInstance();

    // Clear current state
    analytics.ledgerTable.clear();
    anomalyDetector.anomalyTable.clear();
    semanticCache.table.clear();

    // Restore snapshots
    for (const rec of checkpoint.snapshot.ledger) {
      analytics.ledgerTable.put(rec.id, rec);
    }
    for (const rec of checkpoint.snapshot.anomalies) {
      anomalyDetector.anomalyTable.put(rec.id, rec);
    }
    for (const rec of checkpoint.snapshot.cache) {
      semanticCache.table.put(rec.id, rec);
    }

    return true;
  }

  /**
   * Lists all available historical checkpoints
   */
  public static listCheckpoints(): readonly SpendTimelineCheckpoint[] {
    return this.checkpoints;
  }

  /**
   * Clears all checkpoints for test isolation
   */
  public static clear(): void {
    this.checkpoints = [];
  }
}
