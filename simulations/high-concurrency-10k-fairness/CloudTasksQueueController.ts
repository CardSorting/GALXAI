/**
 * @file CloudTasksQueueController.ts
 * @description Google Cloud Tasks 2-Axis Queue Controller.
 * Decouples dispatch rate (maxDispatchesPerSecond) from in-flight concurrency (maxConcurrentDispatches),
 * with exponential backoff, max doublings, and Poison Pill Dead Letter Queue (DLQ).
 */

import { CloudTasksConfig, DeadLetterTaskRecord, AdmissionResult, ClientRequest } from './types';

export class CloudTasksQueueController {
  private readonly config: CloudTasksConfig;
  private dispatchTokens: number;
  private lastDispatchRefillMs: number;
  private activeConcurrentDispatches = 0;
  private readonly deadLetterQueue: DeadLetterTaskRecord[] = [];

  constructor(config: Partial<CloudTasksConfig> = {}) {
    this.config = {
      maxDispatchesPerSecond: config.maxDispatchesPerSecond ?? 500, // Axis 1
      maxConcurrentDispatches: config.maxConcurrentDispatches ?? 150, // Axis 2
      maxBurstSize: config.maxBurstSize ?? 100,
      minBackoffMs: config.minBackoffMs ?? 100,
      maxBackoffMs: config.maxBackoffMs ?? 3000,
      maxDoublings: config.maxDoublings ?? 4,
      maxAttempts: config.maxAttempts ?? 3,
      deduplicationTtlMs: config.deduplicationTtlMs ?? 15000
    };

    this.dispatchTokens = this.config.maxBurstSize;
    this.lastDispatchRefillMs = Date.now();
  }

  public canDispatch(): boolean {
    // Check Axis 2: Concurrency limit
    if (this.activeConcurrentDispatches >= this.config.maxConcurrentDispatches) {
      return false;
    }

    // Check Axis 1: Dispatch token bucket
    this.refillDispatchTokens();
    return this.dispatchTokens >= 1;
  }

  public acquireDispatchSlot(): boolean {
    if (!this.canDispatch()) return false;
    this.dispatchTokens -= 1;
    this.activeConcurrentDispatches++;
    return true;
  }

  public releaseDispatchSlot(): void {
    this.activeConcurrentDispatches = Math.max(0, this.activeConcurrentDispatches - 1);
  }

  /**
   * Cloud Tasks Exponential Backoff Calculus:
   * backoff = min(maxBackoff, minBackoff * 2^min(attempt - 1, maxDoublings)) + uniform(0, jitter)
   */
  public calculateBackoffMs(attempt: number): number {
    const doublings = Math.min(attempt - 1, this.config.maxDoublings);
    const baseBackoff = Math.min(
      this.config.maxBackoffMs,
      this.config.minBackoffMs * Math.pow(2, Math.max(0, doublings))
    );
    const jitter = Math.floor(Math.random() * (baseBackoff * 0.3));
    return baseBackoff + jitter;
  }

  /**
   * Evaluates if task has exceeded max attempts. If so, routes to Dead Letter Queue.
   */
  public handleFailure(req: ClientRequest, error: string): { routeToDlq: boolean; backoffMs?: number } {
    const attempts = (req.attemptCount ?? 0) + 1;
    req.attemptCount = attempts;

    if (attempts >= this.config.maxAttempts) {
      this.deadLetterQueue.push({
        taskId: req.id,
        taskName: req.taskName,
        tenantId: req.tenantId,
        attempts,
        lastError: error,
        enqueuedAtMs: req.enqueuedAtMs,
        routedToDlqAtMs: Date.now()
      });

      return { routeToDlq: true };
    }

    return { routeToDlq: false, backoffMs: this.calculateBackoffMs(attempts) };
  }

  private refillDispatchTokens(nowMs = Date.now()): void {
    const elapsedSec = (nowMs - this.lastDispatchRefillMs) * 0.001;
    if (elapsedSec > 0.005) {
      this.lastDispatchRefillMs = nowMs;
      this.dispatchTokens = Math.min(
        this.config.maxBurstSize,
        this.dispatchTokens + elapsedSec * this.config.maxDispatchesPerSecond
      );
    }
  }

  public getDlqRecords(): DeadLetterTaskRecord[] {
    return [...this.deadLetterQueue];
  }

  public getStats() {
    return {
      activeConcurrentDispatches: this.activeConcurrentDispatches,
      maxConcurrentDispatches: this.config.maxConcurrentDispatches,
      dispatchTokens: Math.floor(this.dispatchTokens),
      dlqCount: this.deadLetterQueue.length
    };
  }
}
