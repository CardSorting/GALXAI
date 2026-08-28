/**
 * GALXAI: BroccoliConnectionPool (Zenith Tier)
 *
 * Enterprise connection pool and multi-tenant lease manager for BroccoliDB.
 * Provides bounded concurrent lease handles, read/write isolation modes, auto-releasing timeouts,
 * fair FIFO queueing, and live pool metrics.
 */

import type {
  BroccoliLeaseHandle,
  BroccoliLeaseMode,
  BroccoliPoolMetrics,
  IBroccoliConnectionPool,
} from "./broccolidb.contracts";
import { randomUUID } from "node:crypto";

interface PendingRequest {
  readonly clientId: string;
  readonly mode: BroccoliLeaseMode;
  readonly resolve: (lease: BroccoliLeaseHandle) => void;
  readonly reject: (err: Error) => void;
  readonly timeoutTimer: NodeJS.Timeout;
  readonly leaseTtlMs: number;
}

export class BroccoliConnectionPool implements IBroccoliConnectionPool {
  private readonly maxTotalLeases: number;
  private readonly maxConcurrentWrites: number;
  private readonly defaultTimeoutMs: number;

  private totalAcquiredCount = 0;
  private totalReleasedCount = 0;
  private peakActiveLeasesCount = 0;

  private readonly activeLeases = new Map<string, BroccoliLeaseHandle>();
  private readonly waitingQueue: PendingRequest[] = [];
  private readonly leaseTimers = new Map<string, NodeJS.Timeout>();
  private readonly drainWaiters = new Set<() => void>();
  private isDraining = false;

  constructor(options: {
    readonly maxTotalLeases?: number;
    readonly maxConcurrentWrites?: number;
    readonly defaultTimeoutMs?: number;
  } = {}) {
    this.maxTotalLeases = this.requirePositiveInteger(options.maxTotalLeases ?? 64, "maxTotalLeases");
    this.maxConcurrentWrites = this.requirePositiveInteger(
      options.maxConcurrentWrites ?? 8,
      "maxConcurrentWrites"
    );
    this.defaultTimeoutMs = this.requirePositiveInteger(options.defaultTimeoutMs ?? 5000, "defaultTimeoutMs");
    if (this.maxConcurrentWrites > this.maxTotalLeases) {
      throw new RangeError("maxConcurrentWrites cannot exceed maxTotalLeases");
    }
  }

  public async acquire(
    clientId: string,
    mode: BroccoliLeaseMode = "SHARED_READ",
    timeoutMs?: number
  ): Promise<BroccoliLeaseHandle> {
    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
    if (!clientId.trim()) throw new TypeError("clientId must be a non-empty string");
    this.requirePositiveInteger(effectiveTimeout, "timeoutMs");
    if (this.isDraining) throw new Error("Connection pool is draining");

    // New arrivals never bypass an older waiter. This prevents sustained read
    // traffic from starving a queued writer.
    if (this.waitingQueue.length === 0 && this.canAcquireImmediately(mode)) {
      return this.grantLease(clientId, mode, effectiveTimeout);
    }

    return new Promise<BroccoliLeaseHandle>((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        const idx = this.waitingQueue.findIndex((req) => req.timeoutTimer === timeoutTimer);
        if (idx !== -1) {
          this.waitingQueue.splice(idx, 1);
          reject(new Error(`Connection lease acquisition timed out after ${effectiveTimeout}ms for client: ${clientId}`));
          this.processNextInQueue();
        }
      }, effectiveTimeout);

      this.waitingQueue.push({
        clientId,
        mode,
        resolve,
        reject,
        timeoutTimer,
        leaseTtlMs: effectiveTimeout,
      });
    });
  }

  public async withLease<T>(
    clientId: string,
    mode: BroccoliLeaseMode,
    fn: (lease: BroccoliLeaseHandle) => Promise<T>
  ): Promise<T> {
    const lease = await this.acquire(clientId, mode);
    try {
      return await fn(lease);
    } finally {
      lease.release();
    }
  }

  public getMetrics(): BroccoliPoolMetrics {
    return {
      totalAcquired: this.totalAcquiredCount,
      totalReleased: this.totalReleasedCount,
      activeLeases: this.activeLeases.size,
      waitingClients: this.waitingQueue.length,
      peakActiveLeases: this.peakActiveLeasesCount,
    };
  }

  public async drain(): Promise<void> {
    this.isDraining = true;
    while (this.waitingQueue.length > 0) {
      const req = this.waitingQueue.shift()!;
      clearTimeout(req.timeoutTimer);
      req.reject(new Error("Connection pool is draining"));
    }
    if (this.activeLeases.size === 0) return;
    await new Promise<void>((resolve) => this.drainWaiters.add(resolve));
  }

  private canAcquireImmediately(mode: BroccoliLeaseMode): boolean {
    if (this.activeLeases.size >= this.maxTotalLeases) {
      return false;
    }

    if (mode === "EXCLUSIVE_WRITE") {
      const currentWrites = Array.from(this.activeLeases.values()).filter(
        (l) => l.mode === "EXCLUSIVE_WRITE"
      ).length;
      return currentWrites < this.maxConcurrentWrites;
    }

    return true;
  }

  private grantLease(
    clientId: string,
    mode: BroccoliLeaseMode,
    ttlMs: number
  ): BroccoliLeaseHandle {
    const leaseId = `lease_${randomUUID()}`;
    const acquiredAt = Date.now();
    const expiresAt = acquiredAt + ttlMs;

    let released = false;

    const lease: BroccoliLeaseHandle = {
      leaseId,
      clientId,
      mode,
      acquiredAt,
      expiresAt,
      release: () => {
        if (released) return;
        released = true;
        const expiryTimer = this.leaseTimers.get(leaseId);
        if (expiryTimer) clearTimeout(expiryTimer);
        this.leaseTimers.delete(leaseId);
        this.activeLeases.delete(leaseId);
        this.totalReleasedCount++;
        this.processNextInQueue();
        if (this.isDraining && this.activeLeases.size === 0) {
          for (const resolve of this.drainWaiters) resolve();
          this.drainWaiters.clear();
        }
      },
    };

    this.activeLeases.set(leaseId, lease);
    this.totalAcquiredCount++;
    if (this.activeLeases.size > this.peakActiveLeasesCount) {
      this.peakActiveLeasesCount = this.activeLeases.size;
    }

    const expiryTimer = setTimeout(() => lease.release(), ttlMs);
    expiryTimer.unref?.();
    this.leaseTimers.set(leaseId, expiryTimer);

    return lease;
  }

  private processNextInQueue(): void {
    if (this.isDraining) return;

    while (this.waitingQueue.length > 0) {
      const candidate = this.waitingQueue[0];
      if (!this.canAcquireImmediately(candidate.mode)) break;
      this.waitingQueue.shift();
      clearTimeout(candidate.timeoutTimer);
      const lease = this.grantLease(candidate.clientId, candidate.mode, candidate.leaseTtlMs);
      candidate.resolve(lease);
    }
  }

  private requirePositiveInteger(value: number, name: string): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer`);
    }
    return value;
  }
}
