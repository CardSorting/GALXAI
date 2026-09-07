/**
 * GALXAI: Asynchronous Write-Behind Micro-Batch Egress Buffer for Shard Telemetry & State
 *
 * Coalesces high-frequency L1 BroccoliDB mutations (health probes, latency samples,
 * circuit transitions, and token draw metrics) into bounded micro-batches.
 */

import { randomUUID } from 'node:crypto';
import { ShardHealthRepository, type ShardHealthProbe } from '../../lib/supabase/repositories/ShardHealthRepository';
import { ShardRepository } from '../../lib/supabase/repositories/ShardRepository';
import type { CredentialStatus } from '../contracts/GalxContracts';
import { coalesceHealthTransitions } from './LeaseHealthTransition';

export interface ShardStateTransitionBatchItem {
  shardId: string;
  status: CredentialStatus;
  cooldownUntilMs?: number;
  fencingToken?: number;
  expectedRegistryRevision?: number;
  timestampMs: number;
}

export class GalxShardSyncBuffer {
  private static instance: GalxShardSyncBuffer;

  private pendingHealthProbes: ShardHealthProbe[] = [];
  private pendingStateTransitions = new Map<string, ShardStateTransitionBatchItem>();
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 100;
  private readonly flushIntervalMs = 2500;
  private isFlushing = false;
  private totalFlushFailures = 0;
  private lastFlushErrorAtMs?: number;
  private nextHealthFlushAtMs = 0;
  private nextProbeFlushAtMs = 0;
  private healthFailures = 0;
  private probeFailures = 0;
  private droppedProbes = 0;
  private droppedTransitions = 0;
  private readonly maxPendingProbes = 1000;
  private readonly maxPendingTransitions = 500;

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): GalxShardSyncBuffer {
    if (!GalxShardSyncBuffer.instance) {
      GalxShardSyncBuffer.instance = new GalxShardSyncBuffer();
    }
    return GalxShardSyncBuffer.instance;
  }

  /**
   * Enqueues a health probe asynchronously with zero database roundtrips.
   */
  public enqueueProbe(probe: ShardHealthProbe): void {
    const timestamp = probe.timestampMs ?? Date.now();
    if (!probe.shardId || !probe.workerId || !Number.isFinite(probe.latencyMs)
      || probe.latencyMs < 0 || probe.latencyMs > 600000
      || !Number.isInteger(probe.statusCode) || probe.statusCode < 100 || probe.statusCode > 599
      || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 240000) {
      this.droppedProbes++;
      return;
    }
    this.pendingHealthProbes.push({
      ...probe,
      id: probe.id || randomUUID(),
      timestampMs: timestamp
    });
    if (this.pendingHealthProbes.length > this.maxPendingProbes) {
      this.droppedProbes += this.pendingHealthProbes.length - this.maxPendingProbes;
      this.pendingHealthProbes.splice(0, this.pendingHealthProbes.length - this.maxPendingProbes);
    }
    if (this.pendingHealthProbes.length >= this.maxBatchSize) void this.flushNow();
  }

  /**
   * Enqueues a shard status transition for asynchronous debounced write-behind.
   */
  public enqueueStateTransition(transition: ShardStateTransitionBatchItem): void {
    this.mergeTransition(transition);
    if (this.pendingStateTransitions.size >= this.maxBatchSize) void this.flushNow();
  }

  private mergeTransition(transition: ShardStateTransitionBatchItem): void {
    const previous = this.pendingStateTransitions.get(transition.shardId);
    const selected = coalesceHealthTransitions(previous ? [previous, transition] : [transition])[0];
    if (!selected) return;
    this.pendingStateTransitions.set(selected.shardId, selected);
    if (this.pendingStateTransitions.size > this.maxPendingTransitions) {
      this.pendingStateTransitions.delete(this.pendingStateTransitions.keys().next().value!);
      this.droppedTransitions++;
    }
  }

  public getPendingCount(): { probes: number; transitions: number } {
    return {
      probes: this.pendingHealthProbes.length,
      transitions: this.pendingStateTransitions.size
    };
  }

  public getHealth(): {
    isFlushing: boolean;
    pendingProbes: number;
    pendingTransitions: number;
    totalFlushFailures: number;
    lastFlushErrorAtMs?: number;
    nextHealthFlushAtMs: number;
    nextProbeFlushAtMs: number;
    droppedProbes: number;
    droppedTransitions: number;
  } {
    return {
      isFlushing: this.isFlushing,
      pendingProbes: this.pendingHealthProbes.length,
      pendingTransitions: this.pendingStateTransitions.size,
      totalFlushFailures: this.totalFlushFailures,
      lastFlushErrorAtMs: this.lastFlushErrorAtMs,
      nextHealthFlushAtMs: this.nextHealthFlushAtMs,
      nextProbeFlushAtMs: this.nextProbeFlushAtMs,
      droppedProbes: this.droppedProbes,
      droppedTransitions: this.droppedTransitions
    };
  }

  private startPeriodicFlush(): void {
    if (typeof setInterval !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flushNow().catch(() => {});
      }, this.flushIntervalMs);
      if (this.flushTimer.unref) {
        this.flushTimer.unref();
      }
    }
  }

  /** Independent bounded batches: telemetry failure cannot replay committed health state. */
  public async flushNow(): Promise<{ probesFlushed: number; transitionsFlushed: number }> {
    if (this.isFlushing) return { probesFlushed: 0, transitionsFlushed: 0 };
    if (!this.pendingHealthProbes.length && !this.pendingStateTransitions.size) {
      return { probesFlushed: 0, transitionsFlushed: 0 };
    }
    this.isFlushing = true;
    // Discard stale best-effort telemetry before the server's five-minute limit.
    const fresh = this.pendingHealthProbes.filter(p => Math.abs(Date.now() - p.timestampMs!) <= 240000);
    this.droppedProbes += this.pendingHealthProbes.length - fresh.length;
    this.pendingHealthProbes = fresh;
    const probes = Date.now() >= this.nextProbeFlushAtMs ? this.pendingHealthProbes.splice(0, this.maxBatchSize) : [];
    const transitions = Date.now() >= this.nextHealthFlushAtMs ? [...this.pendingStateTransitions.values()].slice(0, this.maxBatchSize) : [];
    for (const transition of transitions) this.pendingStateTransitions.delete(transition.shardId);
    try {
      const [health, telemetry] = await Promise.allSettled([
        (async () => {
          if (transitions.length) await ShardRepository.getInstance().applyLeaseHealthTransitions(transitions);
        })(),
        (async () => {
          if (probes.length) {
            const result = await ShardHealthRepository.getInstance().reportHealthProbesBatch(probes);
            if (!result.success) throw new Error('Health probe ingestion unavailable');
          }
        })()
      ]);
      if (health.status === 'rejected') {
        // Merge old failures into current observations; never replace newer work.
        for (const transition of transitions) this.mergeTransition(transition);
      }
      if (telemetry.status === 'rejected') {
        const combined = [...probes, ...this.pendingHealthProbes];
        this.droppedProbes += Math.max(0, combined.length - this.maxPendingProbes);
        this.pendingHealthProbes = combined.slice(-this.maxPendingProbes);
      }
      const retryAt = (failures: number) => Date.now()
        + Math.min(30_000, 1000 * 2 ** Math.min(5, failures - 1)) + Math.floor(Math.random() * 250);
      if (health.status === 'rejected') {
        this.nextHealthFlushAtMs = retryAt(++this.healthFailures);
      } else if (transitions.length) {
        this.healthFailures = 0;
        this.nextHealthFlushAtMs = 0;
      }
      if (telemetry.status === 'rejected') {
        this.nextProbeFlushAtMs = retryAt(++this.probeFailures);
      } else if (probes.length) {
        this.probeFailures = 0;
        this.nextProbeFlushAtMs = 0;
      }
      if (health.status === 'rejected' || telemetry.status === 'rejected') {
        this.totalFlushFailures++;
        this.lastFlushErrorAtMs = Date.now();
      }
      return { probesFlushed: telemetry.status === 'fulfilled' ? probes.length : 0,
        transitionsFlushed: health.status === 'fulfilled' ? transitions.length : 0 };
    } finally {
      this.isFlushing = false;
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
