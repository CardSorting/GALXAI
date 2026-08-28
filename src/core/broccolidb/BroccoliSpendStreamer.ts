/**
 * GALXAI BroccoliDB Reactive Spend CDC Streamer
 * 
 * Subscribes to in-memory reactive table mutations across the spend ledger,
 * anomaly tables, and semantic edge caches, and emits real-time CDC deltas
 * for live SSE dashboards and real-time FinOps webhooks.
 */

import { BroccoliSpendAnalytics, SpendLedgerRecord } from './BroccoliSpendAnalytics';
import { SpendAnomalyDetector, AnomalyDetectionRecord } from '../governance/SpendAnomalyDetector';
import type { TableChangeEvent } from './broccolidb.contracts';

export type SpendStreamListener = (event: {
  type: 'SPEND_RECORDED' | 'ANOMALY_TRIGGERED' | 'CACHE_SAVINGS';
  payload: Record<string, unknown>;
  timestampMs: number;
}) => void;

export class BroccoliSpendStreamer {
  private static listeners = new Set<SpendStreamListener>();
  private static isSubscribed = false;

  /**
   * Initializes CDC subscriptions across BroccoliDB reactive tables
   */
  public static init(): void {
    if (this.isSubscribed) return;

    const analytics = BroccoliSpendAnalytics.getInstance();
    analytics.ledgerTable.subscribe((change: TableChangeEvent<SpendLedgerRecord>) => {
      if (change.operation === 'INSERT' && change.after) {
        this.broadcast({
          type: 'SPEND_RECORDED',
          payload: change.after as unknown as Record<string, unknown>,
          timestampMs: change.timestamp,
        });
      }
    });

    const anomalyDetector = SpendAnomalyDetector.getInstance();
    anomalyDetector.anomalyTable.subscribe((change: TableChangeEvent<AnomalyDetectionRecord>) => {
      if (change.operation === 'INSERT' && change.after) {
        this.broadcast({
          type: 'ANOMALY_TRIGGERED',
          payload: change.after as unknown as Record<string, unknown>,
          timestampMs: change.timestamp,
        });
      }
    });

    this.isSubscribed = true;
  }

  /**
   * Registers a real-time listener for streaming spend CDC events
   */
  public static subscribe(listener: SpendStreamListener): () => void {
    this.init();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static broadcast(event: {
    type: 'SPEND_RECORDED' | 'ANOMALY_TRIGGERED' | 'CACHE_SAVINGS';
    payload: Record<string, unknown>;
    timestampMs: number;
  }): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in spend stream listener:', err);
      }
    }
  }
}
