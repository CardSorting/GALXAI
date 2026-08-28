/**
 * GALXAI BroccoliDB Distributed Spend Lease & Atomic Budget Bucket
 * 
 * Leverages BroccoliDB atomic Compare-And-Swap (CAS) and lease primitives
 * to prevent double-spend concurrency overruns across multi-worker edge nodes.
 * 
 * Provides sub-microsecond budget reservations, atomic drawdowns, and
 * automatic TTL eviction for dead leases.
 */

import { BroccoliDbTable } from './broccolidb-table';

export interface BudgetBucketRecord {
  id: string; // department or workspace ID
  department: string;
  totalLimitUsd: number;
  allocatedSpendUsd: number;
  reservedLeaseUsd: number;
  availableSpendUsd: number;
  version: number;
  lastUpdatedMs: number;
}

export interface SpendLeaseRecord {
  id: string;
  bucketId: string;
  reservedAmountUsd: number;
  settledAmountUsd?: number;
  status: 'RESERVED' | 'SETTLED' | 'EXPIRED' | 'RELEASED';
  createdAtMs: number;
  expiresAtMs: number;
}

export class BroccoliSpendLease {
  private static instance: BroccoliSpendLease;
  public readonly bucketTable: BroccoliDbTable<BudgetBucketRecord>;
  public readonly leaseTable: BroccoliDbTable<SpendLeaseRecord>;

  private constructor() {
    this.bucketTable = new BroccoliDbTable<BudgetBucketRecord>('budget_buckets');
    this.bucketTable.createIndex('department');

    this.leaseTable = new BroccoliDbTable<SpendLeaseRecord>('spend_leases');
    this.leaseTable.createIndex('bucketId');
    this.leaseTable.createIndex('status');
    this.leaseTable.createSortedIndex('expiresAtMs');
  }

  public static getInstance(): BroccoliSpendLease {
    if (!BroccoliSpendLease.instance) {
      BroccoliSpendLease.instance = new BroccoliSpendLease();
    }
    return BroccoliSpendLease.instance;
  }

  /**
   * Initializes or updates a departmental budget bucket
   */
  public static setBudget(department: string, totalLimitUsd: number): BudgetBucketRecord {
    const manager = this.getInstance();
    const existing = manager.bucketTable.get(department);

    const record: BudgetBucketRecord = {
      id: department,
      department,
      totalLimitUsd,
      allocatedSpendUsd: existing ? existing.allocatedSpendUsd : 0,
      reservedLeaseUsd: existing ? existing.reservedLeaseUsd : 0,
      availableSpendUsd: totalLimitUsd - (existing ? existing.allocatedSpendUsd + existing.reservedLeaseUsd : 0),
      version: (existing ? existing.version : 0) + 1,
      lastUpdatedMs: Date.now(),
    };

    manager.bucketTable.put(department, record);
    return record;
  }

  /**
   * Atomically reserves spend budget before invoking upstream OpenAI
   */
  public static reserveBudget(
    department: string,
    estimatedMaxCostUsd: number,
    leaseTtlMs = 30_000 // 30 seconds lease TTL
  ): {
    success: boolean;
    leaseId?: string;
    availableRemainingUsd: number;
    rejectionReason?: string;
  } {
    const manager = this.getInstance();
    const bucket = manager.bucketTable.get(department);

    if (!bucket) {
      return {
        success: false,
        availableRemainingUsd: 0,
        rejectionReason: `No budget configured for department '${department}'`,
      };
    }

    if (bucket.availableSpendUsd < estimatedMaxCostUsd) {
      return {
        success: false,
        availableRemainingUsd: bucket.availableSpendUsd,
        rejectionReason: `Budget capacity exceeded: requested $${estimatedMaxCostUsd.toFixed(4)}, available $${bucket.availableSpendUsd.toFixed(4)}`,
      };
    }

    // Atomic CAS update
    const casResult = manager.bucketTable.compareAndSwap(
      department,
      (current) => (current ? current.availableSpendUsd >= estimatedMaxCostUsd : false),
      (current) => {
        const reservedLeaseUsd = current.reservedLeaseUsd + estimatedMaxCostUsd;
        const availableSpendUsd = current.totalLimitUsd - (current.allocatedSpendUsd + reservedLeaseUsd);
        return {
          ...current,
          reservedLeaseUsd,
          availableSpendUsd,
          version: current.version + 1,
          lastUpdatedMs: Date.now(),
        };
      }
    );

    if (!casResult.success || !casResult.record) {
      return {
        success: false,
        availableRemainingUsd: bucket.availableSpendUsd,
        rejectionReason: 'Concurrent reservation conflict. Retry request.',
      };
    }

    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    manager.leaseTable.put(
      leaseId,
      {
        id: leaseId,
        bucketId: department,
        reservedAmountUsd: estimatedMaxCostUsd,
        status: 'RESERVED',
        createdAtMs: now,
        expiresAtMs: now + leaseTtlMs,
      },
      { ttlMs: leaseTtlMs }
    );

    return {
      success: true,
      leaseId,
      availableRemainingUsd: casResult.record.availableSpendUsd,
    };
  }

  /**
   * Settles the exact cost after request completion and releases unused reservation
   */
  public static settleSpend(leaseId: string, actualCostUsd: number): boolean {
    const manager = this.getInstance();
    const lease = manager.leaseTable.get(leaseId);
    if (!lease || lease.status !== 'RESERVED') return false;

    const bucket = manager.bucketTable.get(lease.bucketId);
    if (!bucket) return false;

    const unusedReservation = Math.max(0, lease.reservedAmountUsd - actualCostUsd);

    // Update bucket atomically
    manager.bucketTable.compareAndSwap(
      lease.bucketId,
      (current) => current !== undefined,
      (current) => {
        const allocatedSpendUsd = current.allocatedSpendUsd + actualCostUsd;
        const reservedLeaseUsd = Math.max(0, current.reservedLeaseUsd - lease.reservedAmountUsd);
        const availableSpendUsd = current.totalLimitUsd - (allocatedSpendUsd + reservedLeaseUsd);

        return {
          ...current,
          allocatedSpendUsd,
          reservedLeaseUsd,
          availableSpendUsd,
          version: current.version + 1,
          lastUpdatedMs: Date.now(),
        };
      }
    );

    lease.status = 'SETTLED';
    lease.settledAmountUsd = actualCostUsd;
    manager.leaseTable.put(leaseId, lease);

    return true;
  }

  /**
   * Resets all tables for testing
   */
  public static clear(): void {
    const manager = this.getInstance();
    manager.bucketTable.clear();
    manager.leaseTable.clear();
  }
}
