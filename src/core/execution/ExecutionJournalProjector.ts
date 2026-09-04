import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import type { IDbTable } from '../broccolidb/broccolidb.contracts';
import { BroccoliExecutionLedger } from './BroccoliExecutionLedger';
import type {
  ExecutionJournalEntry,
  ProjectionCursorRecord,
} from './ExecutionContracts';

export interface ExecutionProjectorOptions {
  readonly projectorId: string;
  readonly accepts: (entry: ExecutionJournalEntry) => boolean;
  readonly deliver: (entry: ExecutionJournalEntry) => void | Promise<void>;
  readonly onError?: (error: unknown, entry: ExecutionJournalEntry) => void;
  readonly cursorTable?: IDbTable<ProjectionCursorRecord>;
  /** CDC for volatile/local tables; manual for a durability-gated host. */
  readonly deliveryMode?: 'cdc' | 'manual';
  /** Highest journal offset known durable for one execution. */
  readonly getHighWaterMark?: (executionId: string) => number;
}

/**
 * Independently retryable, at-least-once journal projector.
 *
 * Cursor advancement happens only after delivery succeeds. A crash after the
 * external side effect but before cursor persistence can redeliver an entry;
 * deliveryKey is therefore part of the consumer contract.
 */
export class ExecutionJournalProjector {
  public readonly cursorTable: IDbTable<ProjectionCursorRecord>;
  private readonly chains = new Map<string, Promise<void>>();
  private readonly idleWaiters = new Set<() => void>();
  private unsubscribe?: () => void;
  private pendingDrains = 0;
  private started = false;

  constructor(
    private readonly ledger: BroccoliExecutionLedger,
    private readonly options: ExecutionProjectorOptions,
  ) {
    this.cursorTable = options.cursorTable ?? new BroccoliDbTable<ProjectionCursorRecord>(
      `execution_projection_cursor_${options.projectorId}`,
    );
    this.cursorTable.createIndex('executionId');
  }

  public start(replayExisting = true): void {
    if (this.started) return;
    this.started = true;
    if ((this.options.deliveryMode ?? 'cdc') === 'cdc') {
      this.unsubscribe = this.ledger.subscribe((record) => this.schedule(record.id));
    }
    if (replayExisting) this.replayAll();
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.started = false;
  }

  /** Called by durability-gated hosts only after their commit boundary succeeds. */
  public notifyAvailable(): void {
    if (this.started) this.replayAll();
  }

  public replayAll(): void {
    for (const record of this.ledger.getAll()) this.schedule(record.id);
  }

  public replay(executionId: string): void {
    this.schedule(executionId);
  }

  public getCursor(executionId: string): number {
    return this.cursorTable.get(this.cursorId(executionId))?.journalOffset ?? 0;
  }

  public whenIdle(): Promise<void> {
    if (this.pendingDrains === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.add(resolve));
  }

  private schedule(executionId: string): void {
    const previous = this.chains.get(executionId) ?? Promise.resolve();
    this.pendingDrains++;
    const next = previous
      .then(() => this.drain(executionId))
      .catch(() => {
        // drain() reports the specific entry through onError. Keeping the
        // chain alive permits an explicit replay or later CDC update to retry.
      })
      .finally(() => {
        this.pendingDrains--;
        if (this.chains.get(executionId) === next) this.chains.delete(executionId);
        this.resolveIdleIfNeeded();
      });
    this.chains.set(executionId, next);
  }

  private async drain(executionId: string): Promise<void> {
    const record = this.ledger.get(executionId);
    if (!record) return;
    let cursor = this.getCursor(executionId);
    const highWaterMark = this.options.getHighWaterMark?.(executionId) ?? Number.POSITIVE_INFINITY;

    for (const entry of record.journal) {
      if (entry.journalOffset <= cursor) continue;
      if (entry.journalOffset > highWaterMark) break;
      try {
        if (this.options.accepts(entry)) await this.options.deliver(entry);
      } catch (error) {
        this.options.onError?.(error, entry);
        throw error;
      }

      cursor = entry.journalOffset;
      this.cursorTable.put(this.cursorId(executionId), {
        id: this.cursorId(executionId),
        projectorId: this.options.projectorId,
        executionId,
        journalOffset: cursor,
        updatedAtMs: Date.now(),
      });
    }
  }

  private cursorId(executionId: string): string {
    return `${this.options.projectorId}:${executionId}`;
  }

  private resolveIdleIfNeeded(): void {
    if (this.pendingDrains !== 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}

export class ExecutionWorkProjector extends ExecutionJournalProjector {
  constructor(
    ledger: BroccoliExecutionLedger,
    options: Omit<ExecutionProjectorOptions, 'accepts'>,
  ) {
    super(ledger, { ...options, accepts: (entry) => entry.channel === 'work_intent' });
  }
}

export class ExecutionObservationProjector extends ExecutionJournalProjector {
  constructor(
    ledger: BroccoliExecutionLedger,
    options: Omit<ExecutionProjectorOptions, 'accepts'>,
  ) {
    super(ledger, { ...options, accepts: (entry) => entry.channel !== 'work_intent' });
  }
}
