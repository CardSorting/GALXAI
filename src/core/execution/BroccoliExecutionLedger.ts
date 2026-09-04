import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import type { IDbTable } from '../broccolidb/broccolidb.contracts';
import type {
  CreateExecutionInput,
  ExecutionDecision,
  ExecutionJournalEntry,
  ExecutionLedgerRecord,
  ExecutionPolicy,
  ExecutionState,
  LedgerCommitInput,
  LedgerCommitResult,
  PendingJournalFact,
} from './ExecutionContracts';
import { DEFAULT_EXECUTION_POLICY } from './ExecutionContracts';

export class ExecutionLedgerConflictError extends Error {
  constructor(readonly executionId: string) {
    super(`Execution ledger ${executionId} changed during commit`);
    this.name = 'ExecutionLedgerConflictError';
  }
}

/**
 * Atomic aggregate ledger for execution authority.
 *
 * BroccoliDB currently offers atomicity within one table record, not across an
 * arbitrary set of tables. The authoritative state, decision idempotency set,
 * and journal consequences therefore live in one aggregate record. A single
 * compare-and-swap makes it impossible to persist a state transition without
 * its recoverable journal facts.
 */
export class BroccoliExecutionLedger {
  public readonly table: IDbTable<ExecutionLedgerRecord>;

  constructor(table: IDbTable<ExecutionLedgerRecord> = new BroccoliDbTable<ExecutionLedgerRecord>('execution_authority_ledger')) {
    this.table = table;
    this.table.createSortedIndex('updatedAtMs');
  }

  public create(input: CreateExecutionInput): ExecutionLedgerRecord {
    if (!input.executionId.trim()) throw new TypeError('executionId must be non-empty');
    if (!input.objective.trim()) throw new TypeError('objective must be non-empty');
    if (!input.actor.id.trim()) throw new TypeError('creating actor id must be non-empty');
    if (input.nowMs !== undefined && (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0)) {
      throw new TypeError('nowMs must be a non-negative safe integer');
    }
    const existing = this.table.get(input.executionId);
    if (existing) {
      if (existing.state.objective !== input.objective) {
        throw new Error(`Execution ${input.executionId} already exists with a different objective`);
      }
      return this.clone(existing);
    }

    const now = input.nowMs ?? Date.now();
    const policy = this.normalizePolicy(input.policy);
    const state: ExecutionState = {
      executionId: input.executionId,
      objective: input.objective,
      status: 'queued',
      executionRevision: 1,
      policy,
      budget: {
        limitTokens: policy.maxBudgetTokens,
        reservedTokens: 0,
        consumedTokens: 0,
        reservations: {},
      },
      lastFencingToken: 0,
      activeChildren: 0,
      createdAtMs: now,
      updatedAtMs: now,
    };
    const created = this.materializeJournalEntry(
      input.executionId,
      state.executionRevision,
      1,
      {
        channel: 'decision',
        type: 'execution.created',
        data: { objective: input.objective, policy },
      },
      {
        proposalId: `create:${input.executionId}`,
        actor: input.actor,
        causationId: `create:${input.executionId}`,
        correlationId: input.correlationId ?? input.executionId,
      },
      now,
    );
    const record: ExecutionLedgerRecord = {
      id: input.executionId,
      ledgerVersion: 1,
      state,
      journalOffset: 1,
      attemptSequenceByAttempt: {},
      journal: [created],
      decisions: [],
      updatedAtMs: now,
    };
    return this.clone(this.table.put(record.id, record));
  }

  public get(executionId: string): ExecutionLedgerRecord | undefined {
    const record = this.table.get(executionId);
    return record ? this.clone(record) : undefined;
  }

  public getAll(): readonly ExecutionLedgerRecord[] {
    return this.table.getAll().map((record) => this.clone(record));
  }

  public findDecision(executionId: string, proposalId: string): ExecutionDecision | undefined {
    const record = this.table.get(executionId);
    const decision = record?.decisions.find((entry) => entry.proposalId === proposalId);
    return decision ? { ...decision, duplicate: true } : undefined;
  }

  public commit(input: LedgerCommitInput): LedgerCommitResult {
    const before = this.table.get(input.proposal.executionId);
    if (!before) throw new Error(`Execution ${input.proposal.executionId} does not exist`);

    const duplicate = before.decisions.find((entry) => entry.proposalId === input.proposal.proposalId);
    if (duplicate) {
      return { committed: false, record: this.clone(before), decision: { ...duplicate, duplicate: true } };
    }

    const commitResult = this.table.compareAndSwap(
      before.id,
      (current) => current?.ledgerVersion === input.expectedLedgerVersion,
      (current) => {
        const now = input.proposal.timestampMs ?? Date.now();
        const executionRevision = input.stateChanged
          ? current.state.executionRevision + 1
          : current.state.executionRevision;
        const nextState: ExecutionState = {
          ...this.clone(input.state),
          executionRevision,
          updatedAtMs: input.stateChanged ? now : current.state.updatedAtMs,
        };
        const decision: ExecutionDecision = {
          ...input.decision,
          executionRevision,
          duplicate: false,
        };
        const decisionFact: PendingJournalFact = {
          channel: 'decision',
          type: `proposal.${decision.kind}`,
          data: {
            proposalId: decision.proposalId,
            reason: decision.reason,
          },
        };
        const pendingFacts = [decisionFact, ...input.facts];
        if (
          !Number.isSafeInteger(current.ledgerVersion + 1) ||
          (input.stateChanged && !Number.isSafeInteger(current.state.executionRevision + 1)) ||
          current.journalOffset > Number.MAX_SAFE_INTEGER - pendingFacts.length
        ) {
          throw new RangeError(`Execution ledger ${current.id} exhausted its safe integer version space`);
        }
        const attemptSequenceByAttempt = { ...(current.attemptSequenceByAttempt ?? {}) };
        if (
          input.recordAttemptSequence &&
          input.proposal.attemptId &&
          input.proposal.attemptSequence !== undefined
        ) {
          const priorSequence = attemptSequenceByAttempt[input.proposal.attemptId] ?? -1;
          attemptSequenceByAttempt[input.proposal.attemptId] = Math.max(
            priorSequence,
            input.proposal.attemptSequence,
          );
        }
        const journalEntries: ExecutionJournalEntry[] = [];
        let journalOffset = current.journalOffset;
        for (const fact of pendingFacts) {
          journalOffset++;
          journalEntries.push(this.materializeJournalEntry(
            current.id,
            executionRevision,
            journalOffset,
            fact,
            input.proposal,
            now,
          ));
        }

        return {
          id: current.id,
          ledgerVersion: current.ledgerVersion + 1,
          state: nextState,
          journalOffset,
          attemptSequenceByAttempt,
          journal: [...current.journal, ...journalEntries],
          decisions: [...current.decisions, decision],
          updatedAtMs: now,
        };
      },
    );

    if (!commitResult.success || !commitResult.record) {
      throw new ExecutionLedgerConflictError(before.id);
    }
    const record = this.clone(commitResult.record);
    const decision = record.decisions.find((entry) => entry.proposalId === input.proposal.proposalId);
    if (!decision) throw new Error(`Committed proposal ${input.proposal.proposalId} without a decision`);
    return { committed: true, record, decision: { ...decision } };
  }

  public subscribe(listener: (record: ExecutionLedgerRecord) => void): () => void {
    const subscription = this.table.subscribe((change) => {
      if (change.after) listener(this.clone(change.after));
    });
    return () => subscription.unsubscribe();
  }

  private normalizePolicy(policy?: Partial<ExecutionPolicy>): ExecutionPolicy {
    const allowedActions = policy?.allowedActions ?? DEFAULT_EXECUTION_POLICY.allowedActions;
    if (
      !Array.isArray(allowedActions) ||
      allowedActions.some((action) => typeof action !== 'string' || !action.trim())
    ) {
      throw new Error('allowedActions must contain only non-empty strings');
    }
    const normalized: ExecutionPolicy = {
      ...DEFAULT_EXECUTION_POLICY,
      ...policy,
      allowedActions: [...new Set(allowedActions)],
    };
    if (!Number.isSafeInteger(normalized.maxBudgetTokens) || normalized.maxBudgetTokens < 0) {
      throw new Error('maxBudgetTokens must be a non-negative safe integer');
    }
    if (!Number.isSafeInteger(normalized.maxActiveChildren) || normalized.maxActiveChildren < 0) {
      throw new Error('maxActiveChildren must be a non-negative safe integer');
    }
    return normalized;
  }

  private materializeJournalEntry(
    executionId: string,
    executionRevision: number,
    journalOffset: number,
    fact: PendingJournalFact,
    proposal: {
      readonly proposalId: string;
      readonly actor: { readonly id: string; readonly type: 'agent' | 'worker' | 'user' | 'verifier' | 'control' | 'system' };
      readonly lease?: { readonly leaseId: string; readonly fencingToken: number };
      readonly attemptId?: string;
      readonly attemptSequence?: number;
      readonly causationId?: string;
      readonly correlationId?: string;
    },
    timestampMs: number,
  ): ExecutionJournalEntry {
    const id = `${executionId}:${journalOffset}`;
    return {
      id,
      executionId,
      executionRevision,
      attemptSequence: proposal.attemptSequence,
      journalOffset,
      attemptId: proposal.attemptId,
      leaseId: proposal.lease?.leaseId,
      fencingToken: proposal.lease?.fencingToken,
      causationId: proposal.causationId ?? proposal.proposalId,
      correlationId: proposal.correlationId ?? executionId,
      actor: { ...proposal.actor },
      channel: fact.channel,
      type: fact.type,
      data: this.clone(fact.data ?? {}),
      timestampMs,
      deliveryKey: id,
    };
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
