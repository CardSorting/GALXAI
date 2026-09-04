/**
 * Contracts for governing uncertain, evolving agent execution.
 *
 * These types deliberately distinguish proposals, authoritative state,
 * journal observations, and projected work. No transport object is allowed in
 * the authority model.
 */

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'streaming'
  | 'waiting'
  | 'completion_pending_verification'
  | 'cancellation_requested'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type ExecutionActorType =
  | 'agent'
  | 'worker'
  | 'user'
  | 'verifier'
  | 'control'
  | 'system';

export interface ExecutionActor {
  readonly id: string;
  readonly type: ExecutionActorType;
}

export interface ExecutionLeaseContext {
  readonly leaseId: string;
  readonly fencingToken: number;
}

export interface ActiveExecutionLease extends ExecutionLeaseContext {
  readonly attemptId: string;
  readonly holderId: string;
  readonly acquiredAtMs: number;
  readonly expiresAtMs: number;
}

export interface ExecutionPolicy {
  readonly allowedActions: readonly string[];
  readonly delegationPermitted: boolean;
  readonly maxActiveChildren: number;
  readonly maxBudgetTokens: number;
  readonly completionVerificationRequired: boolean;
}

export interface ExecutionBudgetState {
  readonly limitTokens: number;
  readonly reservedTokens: number;
  readonly consumedTokens: number;
  readonly reservations: Readonly<Record<string, ExecutionBudgetReservation>>;
}

export interface ExecutionBudgetReservation {
  readonly authorizationId: string;
  readonly kind: 'action' | 'child';
  readonly reservedTokens: number;
  readonly action?: string;
  readonly childExecutionId?: string;
  readonly attemptId?: string;
  readonly fencingToken?: number;
  readonly createdAtMs: number;
}

export interface ExecutionState {
  readonly executionId: string;
  readonly objective: string;
  readonly status: ExecutionStatus;
  /** Version of accepted authoritative state, not journal or attempt order. */
  readonly executionRevision: number;
  readonly policy: ExecutionPolicy;
  readonly budget: ExecutionBudgetState;
  readonly activeLease?: ActiveExecutionLease;
  readonly lastFencingToken: number;
  readonly activeChildren: number;
  readonly completionClaimedAtMs?: number;
  readonly cancellationRequestedAtMs?: number;
  readonly waitingSinceMs?: number;
  readonly wakeAtMs?: number;
  readonly terminalReason?: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export type ExecutionDecisionKind =
  | 'accept'
  | 'reject'
  | 'defer'
  | 'require_verification';

export interface ExecutionDecision {
  readonly proposalId: string;
  readonly executionId: string;
  readonly kind: ExecutionDecisionKind;
  readonly reason: string;
  readonly executionRevision: number;
  readonly decidedAtMs: number;
  readonly duplicate: boolean;
}

export type ExecutionJournalChannel = 'decision' | 'observation' | 'work_intent';

export interface ExecutionJournalEntry {
  readonly id: string;
  readonly executionId: string;
  /** State revision visible when this fact was atomically committed. */
  readonly executionRevision: number;
  /** Local order inside one attempt; it is not a global causal order. */
  readonly attemptSequence?: number;
  /** Replay order inside one execution ledger. */
  readonly journalOffset: number;
  readonly attemptId?: string;
  readonly leaseId?: string;
  readonly fencingToken?: number;
  readonly causationId: string;
  readonly correlationId: string;
  readonly actor: ExecutionActor;
  readonly channel: ExecutionJournalChannel;
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly timestampMs: number;
  /** Stable key used by at-least-once projector consumers. */
  readonly deliveryKey: string;
}

export interface ExecutionLedgerRecord extends Record<string, unknown> {
  readonly id: string;
  /** CAS version for every aggregate write, including observation-only writes. */
  readonly ledgerVersion: number;
  readonly state: ExecutionState;
  readonly journalOffset: number;
  /** Highest reported local sequence for each attempt; independent of state revision. */
  readonly attemptSequenceByAttempt: Readonly<Record<string, number>>;
  readonly journal: readonly ExecutionJournalEntry[];
  readonly decisions: readonly ExecutionDecision[];
  readonly updatedAtMs: number;
}

export interface ExecutionProposalEnvelope {
  readonly proposalId: string;
  readonly executionId: string;
  readonly expectedExecutionRevision: number;
  readonly actor: ExecutionActor;
  readonly lease?: ExecutionLeaseContext;
  readonly attemptId?: string;
  readonly attemptSequence?: number;
  readonly causationId?: string;
  readonly correlationId?: string;
  /** Trusted authority-ingress time. DurableExecutionAuthority overwrites caller input. */
  readonly timestampMs?: number;
}

export type ExecutionProposal = ExecutionProposalEnvelope & (
  | {
      readonly type: 'grant_lease';
      readonly holderId: string;
      readonly attemptId: string;
      readonly leaseId: string;
      readonly leaseDurationMs: number;
    }
  | {
      readonly type: 'authorize_action';
      readonly action: string;
      readonly estimatedTokens: number;
      readonly payload?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'record_action_result';
      readonly authorizationId: string;
      readonly action: string;
      readonly reservedTokens: number;
      readonly consumedTokens: number;
      readonly result?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'record_observation';
      readonly observationType: string;
      readonly observation: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'request_delegation';
      readonly childExecutionId: string;
      readonly childObjective: string;
      readonly estimatedTokens: number;
    }
  | {
      readonly type: 'record_child_result';
      readonly authorizationId: string;
      readonly childExecutionId: string;
      readonly consumedTokens: number;
      readonly childStatus: 'completed' | 'cancelled' | 'failed';
      readonly result?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'claim_completion';
      readonly evidence: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'request_wait';
      readonly reason: string;
      readonly wakeAtMs?: number;
    }
  | {
      readonly type: 'resume_execution';
      readonly reason: string;
    }
  | {
      readonly type: 'verify_completion';
      readonly accepted: boolean;
      readonly reason: string;
    }
  | {
      readonly type: 'request_cancellation';
      readonly reason: string;
    }
  | {
      readonly type: 'confirm_attempt_interrupted';
      readonly reason: string;
    }
  | {
      readonly type: 'finalize_cancellation';
      readonly reason: string;
    }
  | {
      readonly type: 'fail_execution';
      readonly reason: string;
    }
);

export interface CreateExecutionInput {
  readonly executionId: string;
  readonly objective: string;
  readonly actor: ExecutionActor;
  readonly correlationId?: string;
  readonly policy?: Partial<ExecutionPolicy>;
  /** Trusted authority-ingress time. DurableExecutionAuthority overwrites caller input. */
  readonly nowMs?: number;
}

export interface PendingJournalFact {
  readonly channel: ExecutionJournalChannel;
  readonly type: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface LedgerCommitInput {
  readonly expectedLedgerVersion: number;
  readonly state: ExecutionState;
  readonly stateChanged: boolean;
  readonly proposal: ExecutionProposalEnvelope;
  /** True only after the authority kernel authenticates the attempt identity. */
  readonly recordAttemptSequence: boolean;
  readonly decision: Omit<ExecutionDecision, 'executionRevision' | 'duplicate'>;
  readonly facts: readonly PendingJournalFact[];
}

export interface LedgerCommitResult {
  readonly committed: boolean;
  readonly record: ExecutionLedgerRecord;
  readonly decision: ExecutionDecision;
}

export interface ProjectionCursorRecord extends Record<string, unknown> {
  readonly id: string;
  readonly projectorId: string;
  readonly executionId: string;
  readonly journalOffset: number;
  readonly updatedAtMs: number;
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  allowedActions: ['model.invoke', 'tool.read'],
  delegationPermitted: false,
  maxActiveChildren: 0,
  maxBudgetTokens: 100_000,
  completionVerificationRequired: true,
};

export function isTerminalExecutionStatus(status: ExecutionStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'failed';
}
