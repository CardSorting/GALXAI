import type { IDbTable } from '../broccolidb/broccolidb.contracts';
import { BroccoliExecutionLedger } from './BroccoliExecutionLedger';
import type {
  ExecutionJournalEntry,
  ProjectionCursorRecord,
} from './ExecutionContracts';
import {
  ExecutionObservationProjector,
  ExecutionWorkProjector,
} from './ExecutionJournalProjector';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) > 0 ? value as number : undefined;
}

export interface AuthorizedExecutionIntent {
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly executionRevision: number;
  readonly journalOffset: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly attemptId?: string;
  readonly leaseId?: string;
  readonly fencingToken?: number;
  readonly causationId: string;
  readonly correlationId: string;
}

/** A queue adapter must deduplicate on `idempotencyKey`. It does not own execution truth. */
export interface AuthorizedIntentQueue {
  enqueueAuthorizedIntent(intent: AuthorizedExecutionIntent): void | Promise<void>;
}

export interface ExecutionQueueProjectorOptions {
  readonly projectorId: string;
  readonly queue: AuthorizedIntentQueue;
  readonly cursorTable?: IDbTable<ProjectionCursorRecord>;
  readonly deliveryMode?: 'cdc' | 'manual';
  readonly getHighWaterMark?: (executionId: string) => number;
  readonly onError?: (error: unknown, entry: ExecutionJournalEntry) => void;
}

/** Projects only supervisor-authorized, journaled work into a delivery queue. */
export class ExecutionQueueProjector extends ExecutionWorkProjector {
  constructor(ledger: BroccoliExecutionLedger, options: ExecutionQueueProjectorOptions) {
    super(ledger, {
      projectorId: options.projectorId,
      cursorTable: options.cursorTable,
      deliveryMode: options.deliveryMode,
      getHighWaterMark: options.getHighWaterMark,
      onError: options.onError,
      deliver: (entry) => {
        const projectedAttemptId = entry.attemptId ?? stringValue(entry.data.attemptId);
        const projectedLeaseId = entry.leaseId ?? stringValue(entry.data.leaseId);
        const projectedFence = entry.fencingToken ?? positiveInteger(entry.data.fencingToken);
        return options.queue.enqueueAuthorizedIntent({
          idempotencyKey: entry.deliveryKey,
          executionId: entry.executionId,
          executionRevision: entry.executionRevision,
          journalOffset: entry.journalOffset,
          type: entry.type,
          payload: entry.data,
          attemptId: projectedAttemptId,
          leaseId: projectedLeaseId,
          fencingToken: projectedFence,
          causationId: entry.causationId,
          correlationId: entry.correlationId,
        });
      },
    });
  }
}

export interface ExecutionLiveEvent {
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly executionRevision: number;
  readonly journalOffset: number;
  readonly channel: 'decision' | 'observation';
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly causationId: string;
  readonly correlationId: string;
}

/** WS, SSE, metrics, and UI adapters consume this projection; none may mutate authority. */
export interface ExecutionEventSink {
  publishExecutionEvent(event: ExecutionLiveEvent): void | Promise<void>;
}

export interface ExecutionEventProjectorOptions {
  readonly projectorId: string;
  readonly sink: ExecutionEventSink;
  readonly cursorTable?: IDbTable<ProjectionCursorRecord>;
  readonly deliveryMode?: 'cdc' | 'manual';
  readonly getHighWaterMark?: (executionId: string) => number;
  readonly onError?: (error: unknown, entry: ExecutionJournalEntry) => void;
}

/** Projects accepted decisions and observations into live, replayable views. */
export class ExecutionEventProjector extends ExecutionObservationProjector {
  constructor(ledger: BroccoliExecutionLedger, options: ExecutionEventProjectorOptions) {
    super(ledger, {
      projectorId: options.projectorId,
      cursorTable: options.cursorTable,
      deliveryMode: options.deliveryMode,
      getHighWaterMark: options.getHighWaterMark,
      onError: options.onError,
      deliver: (entry) => options.sink.publishExecutionEvent({
        idempotencyKey: entry.deliveryKey,
        executionId: entry.executionId,
        executionRevision: entry.executionRevision,
        journalOffset: entry.journalOffset,
        channel: entry.channel as 'decision' | 'observation',
        type: entry.type,
        data: entry.data,
        causationId: entry.causationId,
        correlationId: entry.correlationId,
      }),
    });
  }
}
