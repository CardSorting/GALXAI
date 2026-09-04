/**
 * @file MultiLevelFleetSlicer.ts
 * @description 3-Tier Multi-Level Feedback Queue (MLFQ) and Dynamic Fleet Slicer.
 * Mirrors Linux CFS and Google SRE class-of-service reservation:
 * - Class 0 (Interactive Fast Track): 25% of shard fleet capacity strictly reserved for <10s IDE/Cursor completions.
 * - Class 1 (Deep Reasoning Track): 65% of fleet capacity for 30-90s weighted reasoning jobs.
 * - Class 2 (Relaxed Scavenger Track): 10% capacity + all idle capacity for preemptible 2-3 minute batch runs.
 */

import { ClientRequest, MlfqClass } from './types';

export class MultiLevelFleetSlicer {
  private totalFleetCapacity: number;
  private fastTrackReservedRatio = 0.25;
  private deepTrackRatio = 0.65;
  private relaxedRatio = 0.10;

  private fastInFlight = 0;
  private deepInFlight = 0;
  private relaxedInFlight = 0;

  private fastCompleted = 0;
  private deepCompleted = 0;
  private relaxedCompleted = 0;
  private demotedCount = 0;

  constructor(totalFleetCapacity = 200) {
    this.totalFleetCapacity = totalFleetCapacity;
  }

  /**
   * Classify request into MLFQ Tier based on explicit hints, deadlines, or requested token scale.
   */
  public classify(req: ClientRequest): MlfqClass {
    if (req.mlfqClass !== undefined) return req.mlfqClass;

    // Interactive Fast Track: Cursor/IDE completions or deadlines <= 10s
    if (req.isInteractive || req.deadlineMs <= 10_000 || req.priorityTier === 'developer') {
      return 0;
    }

    // Relaxed Scavenger: Opt-in or free-tier batch runs
    if (req.allowRelaxedMode || req.priorityTier === 'free') {
      return 2;
    }

    // Deep Reasoning Standard: default for enterprise and long reasoning
    return 1;
  }

  /**
   * Check if a specific class can acquire execution capacity.
   */
  public canAcquire(mlfqClass: MlfqClass): boolean {
    const fastQuota = Math.max(1, Math.floor(this.totalFleetCapacity * this.fastTrackReservedRatio));
    const deepQuota = Math.max(1, Math.floor(this.totalFleetCapacity * this.deepTrackRatio));
    const relaxedQuota = Math.max(1, Math.floor(this.totalFleetCapacity * this.relaxedRatio));

    if (mlfqClass === 0) {
      // Class 0 can use its reserved fast capacity + scavenge from deep/relaxed if idle
      return this.fastInFlight < fastQuota || (this.fastInFlight + this.deepInFlight + this.relaxedInFlight < this.totalFleetCapacity);
    }

    if (mlfqClass === 1) {
      // Class 1 can use deep capacity + relaxed capacity if available
      return this.deepInFlight < deepQuota;
    }

    // Class 2: Only runs if relaxed quota has headroom AND overall fleet utilization is below 90%
    const totalInFlight = this.fastInFlight + this.deepInFlight + this.relaxedInFlight;
    return this.relaxedInFlight < relaxedQuota && totalInFlight < Math.floor(this.totalFleetCapacity * 0.90);
  }

  /**
   * Acquire execution slot for a specific MLFQ class.
   */
  public acquire(mlfqClass: MlfqClass): boolean {
    if (!this.canAcquire(mlfqClass)) return false;

    if (mlfqClass === 0) this.fastInFlight++;
    else if (mlfqClass === 1) this.deepInFlight++;
    else this.relaxedInFlight++;

    return true;
  }

  /**
   * Release execution slot when job completes or is aborted.
   */
  public release(mlfqClass: MlfqClass): void {
    if (mlfqClass === 0) {
      this.fastInFlight = Math.max(0, this.fastInFlight - 1);
      this.fastCompleted++;
    } else if (mlfqClass === 1) {
      this.deepInFlight = Math.max(0, this.deepInFlight - 1);
      this.deepCompleted++;
    } else {
      this.relaxedInFlight = Math.max(0, this.relaxedInFlight - 1);
      this.relaxedCompleted++;
    }
  }

  /**
   * Auto-demote: If a Class 0 request unexpectedly takes >10s, migrate to Class 1
   * without dropping client connection.
   */
  public demoteIfSlow(currentClass: MlfqClass, elapsedMs: number): MlfqClass {
    if (currentClass === 0 && elapsedMs > 10_000) {
      this.fastInFlight = Math.max(0, this.fastInFlight - 1);
      this.deepInFlight++;
      this.demotedCount++;
      return 1;
    }
    return currentClass;
  }

  public getStats() {
    return {
      totalCapacity: this.totalFleetCapacity,
      fastInFlight: this.fastInFlight,
      deepInFlight: this.deepInFlight,
      relaxedInFlight: this.relaxedInFlight,
      fastCompleted: this.fastCompleted,
      deepCompleted: this.deepCompleted,
      relaxedCompleted: this.relaxedCompleted,
      demotedCount: this.demotedCount
    };
  }
}
