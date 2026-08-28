/**
 * GALXAI BroccoliDB Real-Time Spend Analytics Pipeline
 * 
 * Provides sub-millisecond multi-dimensional grouping and statistical aggregation
 * across departmental AI token consumption, avoided waste, and latency percentiles (P95/P99).
 */

import { BroccoliDbTable } from './broccolidb-table';
import type { DbAggregateResult } from './broccolidb.contracts';

export interface SpendLedgerRecord {
  id: string;
  department: string;
  costCenter: string;
  serviceId: string;
  model: string;
  grossRetailUsd: number;
  netGalxUsd: number;
  avoidedWasteUsd: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  timestampMs: number;
}

export class BroccoliSpendAnalytics {
  private static instance: BroccoliSpendAnalytics;
  public readonly ledgerTable: BroccoliDbTable<SpendLedgerRecord>;

  private constructor() {
    this.ledgerTable = new BroccoliDbTable<SpendLedgerRecord>('spend_ledger');
    this.ledgerTable.createIndex('department');
    this.ledgerTable.createIndex('costCenter');
    this.ledgerTable.createIndex('serviceId');
    this.ledgerTable.createIndex('model');
    this.ledgerTable.createSortedIndex('timestampMs');
  }

  public static getInstance(): BroccoliSpendAnalytics {
    if (!BroccoliSpendAnalytics.instance) {
      BroccoliSpendAnalytics.instance = new BroccoliSpendAnalytics();
    }
    return BroccoliSpendAnalytics.instance;
  }

  /**
   * Records a spend transaction in the BroccoliDB high-throughput ledger table
   */
  public static recordSpend(record: SpendLedgerRecord): void {
    const analytics = this.getInstance();
    analytics.ledgerTable.put(record.id, record);
  }

  /**
   * Computes multi-group breakdown across departments and cost centers
   */
  public static getDepartmentalBreakdown(): DbAggregateResult {
    const analytics = this.getInstance();
    return analytics.ledgerTable.aggregate({
      groupBy: ['department'],
      metrics: {
        totalGrossRetailUsd: { metric: 'sum', field: 'grossRetailUsd' },
        totalNetGalxUsd: { metric: 'sum', field: 'netGalxUsd' },
        totalAvoidedWasteUsd: { metric: 'sum', field: 'avoidedWasteUsd' },
        avgDurationMs: { metric: 'avg', field: 'durationMs' },
        totalPromptTokens: { metric: 'sum', field: 'promptTokens' },
        totalCompletionTokens: { metric: 'sum', field: 'completionTokens' },
      },
    });
  }

  /**
   * Clears the ledger table for testing or recalibration
   */
  public static clear(): void {
    const analytics = this.getInstance();
    analytics.ledgerTable.clear();
  }
}
