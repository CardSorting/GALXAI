/**
 * @file CloudTasksDeduplicationRegistry.ts
 * @description Google Cloud Tasks Named Task Deduplication Registry.
 * Guarantees exactly-once execution for named tasks submitted within the deduplication TTL window.
 */

import { AdmissionResult } from './types';

interface TaskRecord {
  taskName: string;
  result?: AdmissionResult;
  inFlightPromise?: Promise<AdmissionResult>;
  createdAtMs: number;
}

export class CloudTasksDeduplicationRegistry {
  private readonly tasks: Map<string, TaskRecord> = new Map();
  private readonly deduplicationTtlMs: number;
  private deduplicatedCount = 0;

  constructor(deduplicationTtlMs = 15000) {
    this.deduplicationTtlMs = deduplicationTtlMs;
  }

  /**
   * Check if taskName already exists. If so, return existing result or in-flight promise.
   */
  public async getOrExecute(
    taskName: string,
    factory: () => Promise<AdmissionResult>
  ): Promise<{ result: AdmissionResult; wasDeduplicated: boolean }> {
    const now = Date.now();
    const existing = this.tasks.get(taskName);

    if (existing) {
      if (now - existing.createdAtMs < this.deduplicationTtlMs) {
        this.deduplicatedCount++;
        if (existing.result) {
          return {
            result: {
              ...existing.result,
              status: 'deduplicated'
            },
            wasDeduplicated: true
          };
        }

        if (existing.inFlightPromise) {
          const res = await existing.inFlightPromise;
          return {
            result: {
              ...res,
              status: 'deduplicated'
            },
            wasDeduplicated: true
          };
        }
      } else {
        // Expired from window
        this.tasks.delete(taskName);
      }
    }

    // New task: register and execute
    const inFlightPromise = factory().then((res) => {
      const rec = this.tasks.get(taskName);
      if (rec) {
        rec.result = res;
        rec.inFlightPromise = undefined;
      }
      return res;
    });

    this.tasks.set(taskName, {
      taskName,
      inFlightPromise,
      createdAtMs: now
    });

    const result = await inFlightPromise;
    return { result, wasDeduplicated: false };
  }

  public getDeduplicatedCount(): number {
    return this.deduplicatedCount;
  }

  public clear(): void {
    this.tasks.clear();
  }
}
