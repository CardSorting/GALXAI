import {
  BroccoliDatabaseKernel,
  type DatabaseKernelOptions,
} from '../broccolidb/broccolidb-kernel';
import type { IDbTable } from '../broccolidb/broccolidb.contracts';
import { BroccoliExecutionLedger } from './BroccoliExecutionLedger';
import type {
  CreateExecutionInput,
  ExecutionDecision,
  ExecutionLedgerRecord,
  ExecutionProposal,
  ExecutionState,
  ProjectionCursorRecord,
} from './ExecutionContracts';
import {
  ExecutionObservationProjector,
  ExecutionJournalProjector,
  ExecutionWorkProjector,
  type ExecutionProjectorOptions,
} from './ExecutionJournalProjector';
import {
  ExecutionEventProjector,
  ExecutionQueueProjector,
  type ExecutionEventProjectorOptions,
  type ExecutionQueueProjectorOptions,
} from './ExecutionPlaneProjectors';
import { ExecutionSupervisor } from './ExecutionSupervisor';

export interface DurableExecutionAuthorityOptions extends DatabaseKernelOptions {
  readonly ledgerTableName?: string;
  readonly cursorTablePrefix?: string;
}

/**
 * Server-only authority host backed by the BroccoliDB WAL/checkpoint kernel.
 *
 * The supervisor remains a small synchronous transition kernel. This host
 * defines the durability boundary: create/propose do not resolve until the
 * aggregate write containing both state and journal consequences is flushed.
 */
export class DurableExecutionAuthority {
  private readonly kernel: BroccoliDatabaseKernel;
  private readonly ledger: BroccoliExecutionLedger;
  private readonly supervisor: ExecutionSupervisor;

  private readonly cursorTablePrefix: string;
  private readonly projectors = new Set<ExecutionJournalProjector>();
  private readonly durableOffsets = new Map<string, number>();
  private closed = false;
  private durabilityFailure?: Error;

  private constructor(
    kernel: BroccoliDatabaseKernel,
    ledger: BroccoliExecutionLedger,
    cursorTablePrefix: string,
  ) {
    this.kernel = kernel;
    this.ledger = ledger;
    this.supervisor = new ExecutionSupervisor(ledger);
    this.cursorTablePrefix = cursorTablePrefix;
    this.refreshDurableOffsets();
  }

  public static async open(options: DurableExecutionAuthorityOptions = {}): Promise<DurableExecutionAuthority> {
    const kernel = new BroccoliDatabaseKernel(options);
    await kernel.start();
    const ledgerTable = kernel.getTable<ExecutionLedgerRecord>(
      options.ledgerTableName ?? 'execution_authority_ledger',
    );
    const ledger = new BroccoliExecutionLedger(ledgerTable);
    return new DurableExecutionAuthority(
      kernel,
      ledger,
      options.cursorTablePrefix ?? 'execution_projection_cursor',
    );
  }

  public async createExecution(input: CreateExecutionInput): Promise<ExecutionLedgerRecord> {
    this.assertOpen();
    const record = this.supervisor.createExecution({ ...input, nowMs: Date.now() });
    await this.flushOrPoison();
    return record;
  }

  public async propose(proposal: ExecutionProposal): Promise<ExecutionDecision> {
    this.assertOpen();
    // Lease expiry and journal time must be evaluated against authority time,
    // never a timestamp supplied by an uncertain actor.
    const trustedProposal = { ...proposal, timestampMs: Date.now() } as ExecutionProposal;
    const decision = this.supervisor.propose(trustedProposal);
    await this.flushOrPoison();
    return decision;
  }

  public getState(executionId: string): ExecutionState | undefined {
    this.assertOpen();
    return this.supervisor.getState(executionId);
  }

  public getRecord(executionId: string): ExecutionLedgerRecord | undefined {
    this.assertOpen();
    return this.ledger.get(executionId);
  }

  public createWorkProjector(
    options: Omit<ExecutionProjectorOptions, 'accepts' | 'cursorTable' | 'deliveryMode' | 'getHighWaterMark'>,
  ): ExecutionWorkProjector {
    this.assertOpen();
    return this.register(new ExecutionWorkProjector(this.ledger, {
      ...options,
      cursorTable: this.cursorTable(options.projectorId),
      deliveryMode: 'manual',
      getHighWaterMark: (executionId) => this.durableOffsets.get(executionId) ?? 0,
    }));
  }

  public createObservationProjector(
    options: Omit<ExecutionProjectorOptions, 'accepts' | 'cursorTable' | 'deliveryMode' | 'getHighWaterMark'>,
  ): ExecutionObservationProjector {
    this.assertOpen();
    return this.register(new ExecutionObservationProjector(this.ledger, {
      ...options,
      cursorTable: this.cursorTable(options.projectorId),
      deliveryMode: 'manual',
      getHighWaterMark: (executionId) => this.durableOffsets.get(executionId) ?? 0,
    }));
  }

  public createQueueProjector(
    options: Omit<ExecutionQueueProjectorOptions, 'cursorTable' | 'deliveryMode' | 'getHighWaterMark'>,
  ): ExecutionQueueProjector {
    this.assertOpen();
    return this.register(new ExecutionQueueProjector(this.ledger, {
      ...options,
      cursorTable: this.cursorTable(options.projectorId),
      deliveryMode: 'manual',
      getHighWaterMark: (executionId) => this.durableOffsets.get(executionId) ?? 0,
    }));
  }

  public createEventProjector(
    options: Omit<ExecutionEventProjectorOptions, 'cursorTable' | 'deliveryMode' | 'getHighWaterMark'>,
  ): ExecutionEventProjector {
    this.assertOpen();
    return this.register(new ExecutionEventProjector(this.ledger, {
      ...options,
      cursorTable: this.cursorTable(options.projectorId),
      deliveryMode: 'manual',
      getHighWaterMark: (executionId) => this.durableOffsets.get(executionId) ?? 0,
    }));
  }

  public async flush(): Promise<void> {
    this.assertOpen();
    await this.flushOrPoison();
  }

  public async checkpoint(label = 'execution_authority_checkpoint'): Promise<void> {
    this.assertOpen();
    await this.kernel.checkpoint(label);
  }

  public async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const projector of this.projectors) projector.stop();
    await Promise.all([...this.projectors].map((projector) => projector.whenIdle()));
    await this.kernel.stop();
  }

  private cursorTable(projectorId: string): IDbTable<ProjectionCursorRecord> {
    return this.kernel.getTable<ProjectionCursorRecord>(`${this.cursorTablePrefix}_${projectorId}`);
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('DurableExecutionAuthority is closed');
    if (this.durabilityFailure) {
      throw new Error('DurableExecutionAuthority is poisoned after a WAL failure', {
        cause: this.durabilityFailure,
      });
    }
  }

  private async flushOrPoison(): Promise<void> {
    try {
      await this.kernel.flush();
      this.refreshDurableOffsets();
      for (const projector of this.projectors) projector.notifyAvailable();
    } catch (error) {
      this.durabilityFailure = error instanceof Error ? error : new Error(String(error));
      throw this.durabilityFailure;
    }
  }

  private register<T extends ExecutionJournalProjector>(projector: T): T {
    this.projectors.add(projector);
    return projector;
  }

  private refreshDurableOffsets(): void {
    for (const record of this.ledger.getAll()) {
      this.durableOffsets.set(record.id, record.journalOffset);
    }
  }
}
