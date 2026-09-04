import {
  BroccoliExecutionLedger,
  ExecutionLedgerConflictError,
} from './BroccoliExecutionLedger';
import type {
  CreateExecutionInput,
  ExecutionDecision,
  ExecutionLedgerRecord,
  ExecutionProposal,
  ExecutionState,
  LedgerCommitResult,
  PendingJournalFact,
} from './ExecutionContracts';
import { isTerminalExecutionStatus } from './ExecutionContracts';

/**
 * A deliberately narrow authority kernel. It does not interpret agent plans;
 * it adjudicates proposed state transitions against revision, lease, budget,
 * permission, verification, and terminality invariants.
 */
export class ExecutionSupervisor {
  constructor(public readonly ledger = new BroccoliExecutionLedger()) {}

  public createExecution(input: CreateExecutionInput): ExecutionLedgerRecord {
    return this.ledger.create(input);
  }

  public getState(executionId: string): ExecutionState | undefined {
    return this.ledger.get(executionId)?.state;
  }

  public propose(proposal: ExecutionProposal): ExecutionDecision {
    this.validateEnvelope(proposal);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return this.adjudicate(proposal).decision;
      } catch (error) {
        if (!(error instanceof ExecutionLedgerConflictError) || attempt === 2) throw error;
      }
    }
    throw new Error(`Unable to adjudicate ${proposal.proposalId}`);
  }

  private adjudicate(proposal: ExecutionProposal): LedgerCommitResult {
    const record = this.ledger.get(proposal.executionId);
    if (!record) throw new Error(`Execution ${proposal.executionId} does not exist`);
    const duplicate = record.decisions.find((decision) => decision.proposalId === proposal.proposalId);
    if (duplicate) {
      return { committed: false, record, decision: { ...duplicate, duplicate: true } };
    }

    if (proposal.type === 'record_observation') {
      return this.recordObservation(record, proposal);
    }

    if (proposal.expectedExecutionRevision !== record.state.executionRevision) {
      return this.decide(
        record,
        proposal,
        'reject',
        'stale_execution_revision',
        record.state,
        false,
        [],
      );
    }

    const attemptSequenceFailure = this.validateAttemptSequence(record, proposal);
    if (attemptSequenceFailure) {
      return this.decide(record, proposal, 'reject', attemptSequenceFailure, record.state, false, []);
    }

    if (isTerminalExecutionStatus(record.state.status)) {
      return this.decide(record, proposal, 'reject', 'execution_is_terminal', record.state, false, []);
    }

    switch (proposal.type) {
      case 'grant_lease':
        return this.grantLease(record, proposal);
      case 'authorize_action':
        return this.authorizeAction(record, proposal);
      case 'record_action_result':
        return this.recordActionResult(record, proposal);
      case 'request_delegation':
        return this.requestDelegation(record, proposal);
      case 'record_child_result':
        return this.recordChildResult(record, proposal);
      case 'claim_completion':
        return this.claimCompletion(record, proposal);
      case 'request_wait':
        return this.requestWait(record, proposal);
      case 'resume_execution':
        return this.resumeExecution(record, proposal);
      case 'verify_completion':
        return this.verifyCompletion(record, proposal);
      case 'request_cancellation':
        return this.requestCancellation(record, proposal);
      case 'confirm_attempt_interrupted':
        return this.confirmAttemptInterrupted(record, proposal);
      case 'finalize_cancellation':
        return this.finalizeCancellationWithoutAttempt(record, proposal);
      case 'fail_execution':
        return this.failExecution(record, proposal);
    }
  }

  private grantLease(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'grant_lease' }>,
  ): LedgerCommitResult {
    if (!this.isControlActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'lease_grant_requires_control_actor', record.state, false, []);
    }
    if (
      record.state.status === 'cancellation_requested' ||
      record.state.status === 'completion_pending_verification' ||
      record.state.status === 'waiting'
    ) {
      return this.decide(record, proposal, 'defer', `execution_${record.state.status}`, record.state, false, []);
    }
    if (
      !proposal.holderId.trim() ||
      !proposal.attemptId.trim() ||
      !proposal.leaseId.trim()
    ) {
      return this.decide(record, proposal, 'reject', 'invalid_lease_identity', record.state, false, []);
    }
    const now = proposal.timestampMs ?? Date.now();
    if (
      !Number.isSafeInteger(proposal.leaseDurationMs) ||
      proposal.leaseDurationMs <= 0 ||
      !Number.isSafeInteger(now + proposal.leaseDurationMs)
    ) {
      return this.decide(record, proposal, 'reject', 'invalid_lease_duration', record.state, false, []);
    }
    const identityWasUsed = record.journal.some((entry) => (
      entry.type === 'work.attempt_authorized' &&
      (entry.data.attemptId === proposal.attemptId || entry.data.leaseId === proposal.leaseId)
    ));
    if (identityWasUsed) {
      return this.decide(record, proposal, 'reject', 'attempt_or_lease_identity_reused', record.state, false, []);
    }
    if (!Number.isSafeInteger(record.state.lastFencingToken + 1)) {
      return this.decide(record, proposal, 'reject', 'fencing_token_exhausted', record.state, false, []);
    }

    const fencingToken = record.state.lastFencingToken + 1;
    const previousLease = record.state.activeLease;
    const state: ExecutionState = {
      ...record.state,
      status: 'running',
      lastFencingToken: fencingToken,
      activeLease: {
        leaseId: proposal.leaseId,
        fencingToken,
        attemptId: proposal.attemptId,
        holderId: proposal.holderId,
        acquiredAtMs: now,
        expiresAtMs: now + proposal.leaseDurationMs,
      },
    };
    const facts: PendingJournalFact[] = [];
    if (previousLease) {
      facts.push(
        {
          channel: 'observation',
          type: 'execution.lease_superseded',
          data: {
            leaseId: previousLease.leaseId,
            attemptId: previousLease.attemptId,
            fencingToken: previousLease.fencingToken,
            supersedingFencingToken: fencingToken,
          },
        },
        {
          channel: 'work_intent',
          type: 'work.interrupt_superseded_attempt',
          data: {
            leaseId: previousLease.leaseId,
            attemptId: previousLease.attemptId,
            fencingToken: previousLease.fencingToken,
          },
        },
      );
    }
    facts.push(
      {
        channel: 'observation',
        type: 'execution.lease_granted',
        data: { leaseId: proposal.leaseId, attemptId: proposal.attemptId, fencingToken },
      },
      {
        channel: 'work_intent',
        type: 'work.attempt_authorized',
        data: {
          leaseId: proposal.leaseId,
          attemptId: proposal.attemptId,
          holderId: proposal.holderId,
          fencingToken,
          objective: record.state.objective,
        },
      },
    );
    return this.decide(record, proposal, 'accept', 'lease_granted', state, true, facts);
  }

  private authorizeAction(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'authorize_action' }>,
  ): LedgerCommitResult {
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure) return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    if (record.state.status === 'completion_pending_verification' || record.state.status === 'cancellation_requested') {
      return this.decide(record, proposal, 'defer', `execution_${record.state.status}`, record.state, false, []);
    }
    if (!record.state.policy.allowedActions.includes(proposal.action)) {
      return this.decide(record, proposal, 'reject', 'action_not_permitted', record.state, false, []);
    }
    if (!this.isValidTokenAmount(proposal.estimatedTokens)) {
      return this.decide(record, proposal, 'reject', 'invalid_token_estimate', record.state, false, []);
    }
    if (proposal.estimatedTokens > this.remainingBudget(record.state)) {
      return this.decide(record, proposal, 'reject', 'budget_exceeded', record.state, false, []);
    }

    const state: ExecutionState = {
      ...record.state,
      status: 'running',
      budget: {
        ...record.state.budget,
        reservedTokens: record.state.budget.reservedTokens + proposal.estimatedTokens,
        reservations: {
          ...record.state.budget.reservations,
          [proposal.proposalId]: {
            authorizationId: proposal.proposalId,
            kind: 'action',
            reservedTokens: proposal.estimatedTokens,
            action: proposal.action,
            attemptId: proposal.attemptId,
            fencingToken: proposal.lease?.fencingToken,
            createdAtMs: proposal.timestampMs ?? Date.now(),
          },
        },
      },
    };
    return this.decide(record, proposal, 'accept', 'action_authorized', state, true, [
      {
        channel: 'work_intent',
        type: 'work.action_authorized',
        data: {
          action: proposal.action,
          authorizationId: proposal.proposalId,
          estimatedTokens: proposal.estimatedTokens,
          payload: proposal.payload ?? {},
        },
      },
    ]);
  }

  private recordActionResult(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'record_action_result' }>,
  ): LedgerCommitResult {
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure) return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    const reservation = record.state.budget.reservations[proposal.authorizationId];
    if (
      !reservation ||
      reservation.kind !== 'action' ||
      reservation.action !== proposal.action ||
      reservation.reservedTokens !== proposal.reservedTokens ||
      (this.requiresLease(proposal.actor.type) && (
        reservation.attemptId !== proposal.attemptId ||
        reservation.fencingToken !== proposal.lease?.fencingToken
      )) ||
      !this.isValidTokenAmount(proposal.reservedTokens) ||
      !this.isValidTokenAmount(proposal.consumedTokens) ||
      !Number.isSafeInteger(record.state.budget.consumedTokens + proposal.consumedTokens) ||
      proposal.reservedTokens > record.state.budget.reservedTokens
    ) {
      return this.decide(record, proposal, 'reject', 'invalid_budget_settlement', record.state, false, []);
    }

    const consumedTokens = record.state.budget.consumedTokens + proposal.consumedTokens;
    const budgetExceeded = consumedTokens > record.state.budget.limitTokens;
    const reservations = { ...record.state.budget.reservations };
    delete reservations[proposal.authorizationId];
    const preservesPendingAuthority =
      record.state.status === 'cancellation_requested' ||
      record.state.status === 'completion_pending_verification';
    const settledState: ExecutionState = {
      ...record.state,
      // A late-but-valid result may settle its reservation while cancellation
      // or verification is pending. It must never resurrect the execution by
      // changing either authoritative process state back to `running`.
      status: preservesPendingAuthority ? record.state.status : 'running',
      budget: {
        ...record.state.budget,
        reservedTokens: record.state.budget.reservedTokens - proposal.reservedTokens,
        consumedTokens,
        reservations,
      },
    };
    const facts: PendingJournalFact[] = [
      {
        channel: 'observation',
        type: 'agent.action_completed',
        data: {
          action: proposal.action,
          authorizationId: proposal.authorizationId,
          consumedTokens: proposal.consumedTokens,
          result: proposal.result ?? {},
        },
      },
    ];
    const failure = budgetExceeded
      ? this.buildFailureTransition(settledState, 'budget_exceeded_during_settlement')
      : undefined;
    if (budgetExceeded) {
      facts.push(...failure!.facts);
    }
    return this.decide(
      record,
      proposal,
      'accept',
      budgetExceeded ? 'result_recorded_and_execution_failed' : 'action_result_recorded',
      failure?.state ?? settledState,
      true,
      facts,
    );
  }

  private recordObservation(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'record_observation' }>,
  ): LedgerCommitResult {
    if (!proposal.observationType.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_observation_type', record.state, false, []);
    }
    const revisionCurrent = proposal.expectedExecutionRevision === record.state.executionRevision;
    const leaseCurrent = !this.requiresLease(proposal.actor.type) || !this.validateActiveLease(record.state, proposal);
    const attemptSequenceCurrent = !this.validateAttemptSequence(record, proposal);
    const authorityAccepted = revisionCurrent && leaseCurrent && attemptSequenceCurrent;
    return this.decide(
      record,
      proposal,
      authorityAccepted ? 'accept' : 'reject',
      authorityAccepted ? 'observation_recorded' : 'stale_observation_recorded_without_authority',
      record.state,
      false,
      [{
        channel: 'observation',
        type: proposal.observationType,
        data: {
          ...proposal.observation,
          authorityAccepted,
          attemptSequenceAccepted: attemptSequenceCurrent,
          proposedExecutionRevision: proposal.expectedExecutionRevision,
        },
      }],
    );
  }

  private requestDelegation(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'request_delegation' }>,
  ): LedgerCommitResult {
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure) return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    if (record.state.status === 'completion_pending_verification' || record.state.status === 'cancellation_requested') {
      return this.decide(record, proposal, 'defer', `execution_${record.state.status}`, record.state, false, []);
    }
    if (!record.state.policy.delegationPermitted) {
      return this.decide(record, proposal, 'reject', 'delegation_not_permitted', record.state, false, []);
    }
    if (record.state.activeChildren >= record.state.policy.maxActiveChildren) {
      return this.decide(record, proposal, 'defer', 'child_concurrency_limit_reached', record.state, false, []);
    }
    if (!this.isValidTokenAmount(proposal.estimatedTokens) || proposal.estimatedTokens > this.remainingBudget(record.state)) {
      return this.decide(record, proposal, 'reject', 'delegation_budget_exceeded', record.state, false, []);
    }
    if (!proposal.childExecutionId.trim() || !proposal.childObjective.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_child_identity', record.state, false, []);
    }
    if (Object.values(record.state.budget.reservations).some(
      (reservation) => reservation.kind === 'child' && reservation.childExecutionId === proposal.childExecutionId,
    )) {
      return this.decide(record, proposal, 'reject', 'child_already_authorized', record.state, false, []);
    }

    const state: ExecutionState = {
      ...record.state,
      activeChildren: record.state.activeChildren + 1,
      budget: {
        ...record.state.budget,
        reservedTokens: record.state.budget.reservedTokens + proposal.estimatedTokens,
        reservations: {
          ...record.state.budget.reservations,
          [proposal.proposalId]: {
            authorizationId: proposal.proposalId,
            kind: 'child',
            reservedTokens: proposal.estimatedTokens,
            childExecutionId: proposal.childExecutionId,
            attemptId: proposal.attemptId,
            fencingToken: proposal.lease?.fencingToken,
            createdAtMs: proposal.timestampMs ?? Date.now(),
          },
        },
      },
    };
    return this.decide(record, proposal, 'accept', 'delegation_authorized', state, true, [{
      channel: 'work_intent',
      type: 'work.child_create_authorized',
      data: {
        authorizationId: proposal.proposalId,
        childExecutionId: proposal.childExecutionId,
        childObjective: proposal.childObjective,
        estimatedTokens: proposal.estimatedTokens,
      },
    }]);
  }

  private recordChildResult(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'record_child_result' }>,
  ): LedgerCommitResult {
    if (!this.isVerifierActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'child_settlement_requires_control_actor', record.state, false, []);
    }
    const reservation = record.state.budget.reservations[proposal.authorizationId];
    if (
      !reservation ||
      reservation.kind !== 'child' ||
      reservation.childExecutionId !== proposal.childExecutionId ||
      !this.isValidTokenAmount(proposal.consumedTokens) ||
      !Number.isSafeInteger(record.state.budget.consumedTokens + proposal.consumedTokens) ||
      record.state.activeChildren <= 0
    ) {
      return this.decide(record, proposal, 'reject', 'invalid_child_settlement', record.state, false, []);
    }

    const consumedTokens = record.state.budget.consumedTokens + proposal.consumedTokens;
    const budgetExceeded = consumedTokens > record.state.budget.limitTokens;
    const reservations = { ...record.state.budget.reservations };
    delete reservations[proposal.authorizationId];
    const settledState: ExecutionState = {
      ...record.state,
      activeChildren: record.state.activeChildren - 1,
      budget: {
        ...record.state.budget,
        reservedTokens: record.state.budget.reservedTokens - reservation.reservedTokens,
        consumedTokens,
        reservations,
      },
    };
    const facts: PendingJournalFact[] = [{
      channel: 'observation',
      type: `execution.child_${proposal.childStatus}`,
      data: {
        authorizationId: proposal.authorizationId,
        childExecutionId: proposal.childExecutionId,
        consumedTokens: proposal.consumedTokens,
        result: proposal.result ?? {},
      },
    }];
    const failure = budgetExceeded
      ? this.buildFailureTransition(settledState, 'budget_exceeded_during_child_settlement')
      : undefined;
    if (budgetExceeded) {
      facts.push(...failure!.facts);
    }
    return this.decide(
      record,
      proposal,
      'accept',
      budgetExceeded ? 'child_recorded_and_execution_failed' : 'child_result_recorded',
      failure?.state ?? settledState,
      true,
      facts,
    );
  }

  private claimCompletion(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'claim_completion' }>,
  ): LedgerCommitResult {
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure) return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    if (record.state.status === 'cancellation_requested') {
      return this.decide(record, proposal, 'defer', 'cancellation_is_pending', record.state, false, []);
    }
    if (record.state.status === 'completion_pending_verification') {
      return this.decide(record, proposal, 'defer', 'completion_verification_is_pending', record.state, false, []);
    }
    if (Object.keys(record.state.budget.reservations).length > 0) {
      return this.decide(record, proposal, 'defer', 'outstanding_budget_reservations', record.state, false, []);
    }
    if (record.state.activeChildren > 0) {
      return this.decide(record, proposal, 'defer', 'active_children_not_terminal', record.state, false, []);
    }

    const now = proposal.timestampMs ?? Date.now();
    const state: ExecutionState = {
      ...record.state,
      status: 'completion_pending_verification',
      completionClaimedAtMs: now,
    };
    return this.decide(record, proposal, 'require_verification', 'completion_claim_requires_verification', state, true, [
      {
        channel: 'observation',
        type: 'agent.completion_claimed',
        data: { evidence: proposal.evidence },
      },
      {
        channel: 'work_intent',
        type: 'work.verify_completion',
        data: {
          evidence: proposal.evidence,
          mode: record.state.policy.completionVerificationRequired ? 'policy' : 'automatic',
        },
      },
    ]);
  }

  private requestWait(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'request_wait' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!this.requiresLease(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'wait_requires_attempt_actor', record.state, false, []);
    }
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure) return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    if (record.state.status === 'completion_pending_verification' || record.state.status === 'cancellation_requested') {
      return this.decide(record, proposal, 'defer', `execution_${record.state.status}`, record.state, false, []);
    }
    if (Object.values(record.state.budget.reservations).some((reservation) => reservation.kind === 'action')) {
      return this.decide(record, proposal, 'defer', 'action_reservations_prevent_wait', record.state, false, []);
    }
    const now = proposal.timestampMs ?? Date.now();
    if (
      proposal.wakeAtMs !== undefined &&
      (!Number.isSafeInteger(proposal.wakeAtMs) || proposal.wakeAtMs <= now)
    ) {
      return this.decide(record, proposal, 'reject', 'invalid_wake_time', record.state, false, []);
    }
    const activeLease = record.state.activeLease!;
    const state: ExecutionState = {
      ...record.state,
      status: 'waiting',
      activeLease: undefined,
      waitingSinceMs: now,
      wakeAtMs: proposal.wakeAtMs,
    };
    const facts: PendingJournalFact[] = [
      {
        channel: 'observation',
        type: 'execution.waiting',
        data: { reason: proposal.reason, wakeAtMs: proposal.wakeAtMs },
      },
      {
        channel: 'work_intent',
        type: 'work.release_attempt',
        data: {
          reason: proposal.reason,
          attemptId: activeLease.attemptId,
          leaseId: activeLease.leaseId,
          fencingToken: activeLease.fencingToken,
        },
      },
    ];
    if (proposal.wakeAtMs !== undefined) {
      facts.push({
        channel: 'work_intent',
        type: 'work.schedule_resume',
        data: { wakeAtMs: proposal.wakeAtMs, reason: proposal.reason },
      });
    }
    return this.decide(record, proposal, 'accept', 'execution_waiting', state, true, facts);
  }

  private resumeExecution(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'resume_execution' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!this.isControlActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'resume_requires_control_actor', record.state, false, []);
    }
    if (record.state.status !== 'waiting') {
      return this.decide(record, proposal, 'reject', 'execution_not_waiting', record.state, false, []);
    }
    const state: ExecutionState = {
      ...record.state,
      status: 'queued',
      waitingSinceMs: undefined,
      wakeAtMs: undefined,
    };
    return this.decide(record, proposal, 'accept', 'execution_resumed', state, true, [
      {
        channel: 'observation',
        type: 'execution.resumed',
        data: { reason: proposal.reason },
      },
      {
        channel: 'work_intent',
        type: 'work.execution_ready',
        data: { reason: proposal.reason },
      },
    ]);
  }

  private verifyCompletion(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'verify_completion' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!this.isVerifierActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'completion_verification_requires_verifier', record.state, false, []);
    }
    if (record.state.status !== 'completion_pending_verification') {
      return this.decide(record, proposal, 'reject', 'completion_not_pending_verification', record.state, false, []);
    }

    const state: ExecutionState = proposal.accepted
      ? {
          ...record.state,
          status: 'completed',
          activeLease: undefined,
          terminalReason: proposal.reason,
        }
      : {
          ...record.state,
          status: 'running',
          completionClaimedAtMs: undefined,
        };
    const facts: PendingJournalFact[] = [{
      channel: 'observation',
      type: proposal.accepted ? 'execution.completed' : 'execution.completion_rejected',
      data: { reason: proposal.reason },
    }];
    if (proposal.accepted && record.state.activeLease) {
      facts.push({
        channel: 'work_intent',
        type: 'work.release_completed_attempt',
        data: {
          attemptId: record.state.activeLease.attemptId,
          leaseId: record.state.activeLease.leaseId,
          fencingToken: record.state.activeLease.fencingToken,
        },
      });
    } else if (!proposal.accepted) {
      facts.push({ channel: 'work_intent', type: 'work.resume_execution', data: { reason: proposal.reason } });
    }
    return this.decide(
      record,
      proposal,
      'accept',
      proposal.accepted ? 'completion_verified' : 'completion_rejected',
      state,
      true,
      facts,
    );
  }

  private requestCancellation(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'request_cancellation' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!['user', 'control', 'system'].includes(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'cancellation_request_not_permitted', record.state, false, []);
    }
    if (record.state.status === 'cancellation_requested') {
      return this.decide(record, proposal, 'defer', 'cancellation_already_requested', record.state, false, []);
    }
    const state: ExecutionState = {
      ...record.state,
      status: 'cancellation_requested',
      cancellationRequestedAtMs: proposal.timestampMs ?? Date.now(),
    };
    const facts: PendingJournalFact[] = [
      {
        channel: 'observation',
        type: 'execution.cancellation_requested',
        data: { reason: proposal.reason },
      },
      {
        channel: 'work_intent',
        type: record.state.activeLease ? 'work.interrupt_attempt' : 'work.finalize_cancellation',
        data: {
          reason: proposal.reason,
          attemptId: record.state.activeLease?.attemptId,
          leaseId: record.state.activeLease?.leaseId,
          fencingToken: record.state.activeLease?.fencingToken,
        },
      },
    ];
    if (record.state.activeChildren > 0) {
      facts.push({
        channel: 'work_intent',
        type: 'work.cancel_children',
        data: { reason: proposal.reason, activeChildren: record.state.activeChildren },
      });
    }
    return this.decide(record, proposal, 'accept', 'cancellation_recorded', state, true, facts);
  }

  private confirmAttemptInterrupted(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'confirm_attempt_interrupted' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (record.state.status !== 'cancellation_requested') {
      return this.decide(record, proposal, 'reject', 'cancellation_not_requested', record.state, false, []);
    }
    if (!record.state.activeLease) {
      return this.decide(record, proposal, 'reject', 'no_active_attempt_to_interrupt', record.state, false, []);
    }
    const leaseFailure = this.validateActiveLease(record.state, proposal);
    if (leaseFailure && !this.isControlActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', leaseFailure, record.state, false, []);
    }
    if (record.state.activeChildren > 0) {
      return this.decide(record, proposal, 'defer', 'active_children_not_cancelled', record.state, false, []);
    }
    return this.commitCancellation(record, proposal);
  }

  private finalizeCancellationWithoutAttempt(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'finalize_cancellation' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!this.isControlActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'cancellation_finalization_requires_control_actor', record.state, false, []);
    }
    if (record.state.status !== 'cancellation_requested') {
      return this.decide(record, proposal, 'reject', 'cancellation_not_requested', record.state, false, []);
    }
    if (record.state.activeLease) {
      return this.decide(record, proposal, 'defer', 'attempt_interruption_not_confirmed', record.state, false, []);
    }
    if (record.state.activeChildren > 0) {
      return this.decide(record, proposal, 'defer', 'active_children_not_cancelled', record.state, false, []);
    }
    return this.commitCancellation(record, proposal);
  }

  private commitCancellation(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'confirm_attempt_interrupted' | 'finalize_cancellation' }>,
  ): LedgerCommitResult {
    const releasedTokens = record.state.budget.reservedTokens;
    const releasedReservations = Object.keys(record.state.budget.reservations).length;
    const state: ExecutionState = {
      ...record.state,
      status: 'cancelled',
      activeLease: undefined,
      terminalReason: proposal.reason,
      budget: {
        ...record.state.budget,
        reservedTokens: 0,
        reservations: {},
      },
    };
    const facts: PendingJournalFact[] = [{
      channel: 'observation',
      type: 'execution.cancelled',
      data: { reason: proposal.reason },
    }];
    if (releasedReservations > 0 || releasedTokens > 0) {
      facts.push({
        channel: 'observation',
        type: 'execution.reservations_released',
        data: { releasedTokens, releasedReservations, reason: 'execution_cancelled' },
      });
    }
    return this.decide(record, proposal, 'accept', 'cancellation_finalized', state, true, facts);
  }

  private failExecution(
    record: ExecutionLedgerRecord,
    proposal: Extract<ExecutionProposal, { type: 'fail_execution' }>,
  ): LedgerCommitResult {
    if (!proposal.reason.trim()) {
      return this.decide(record, proposal, 'reject', 'invalid_reason', record.state, false, []);
    }
    if (!this.isVerifierActor(proposal.actor.type)) {
      return this.decide(record, proposal, 'reject', 'failure_transition_requires_control_actor', record.state, false, []);
    }
    const failure = this.buildFailureTransition(record.state, proposal.reason);
    return this.decide(record, proposal, 'accept', 'execution_failed', failure.state, true, failure.facts);
  }

  /**
   * Terminal failure revokes every capability derived from this execution.
   * Cleanup work is projected from the same atomic journal commit, so a crash
   * cannot leave state terminal without a recoverable interruption request.
   */
  private buildFailureTransition(
    current: ExecutionState,
    reason: string,
  ): { state: ExecutionState; facts: PendingJournalFact[] } {
    const activeLease = current.activeLease;
    const activeChildren = current.activeChildren;
    const releasedTokens = current.budget.reservedTokens;
    const releasedReservations = Object.keys(current.budget.reservations).length;
    const state: ExecutionState = {
      ...current,
      status: 'failed',
      activeLease: undefined,
      activeChildren: 0,
      terminalReason: reason,
      budget: {
        ...current.budget,
        reservedTokens: 0,
        reservations: {},
      },
    };
    const facts: PendingJournalFact[] = [{
      channel: 'observation',
      type: 'execution.failed',
      data: { reason },
    }];
    if (releasedReservations > 0 || releasedTokens > 0) {
      facts.push({
        channel: 'observation',
        type: 'execution.reservations_released',
        data: { reason, releasedReservations, releasedTokens },
      });
    }
    if (activeLease) {
      facts.push({
        channel: 'work_intent',
        type: 'work.interrupt_failed_attempt',
        data: {
          reason,
          attemptId: activeLease.attemptId,
          leaseId: activeLease.leaseId,
          fencingToken: activeLease.fencingToken,
        },
      });
    }
    if (activeChildren > 0) {
      facts.push({
        channel: 'work_intent',
        type: 'work.cancel_children_after_failure',
        data: { reason, activeChildren },
      });
    }
    return { state, facts };
  }

  private decide(
    record: ExecutionLedgerRecord,
    proposal: ExecutionProposal,
    kind: ExecutionDecision['kind'],
    reason: string,
    state: ExecutionState,
    stateChanged: boolean,
    facts: readonly PendingJournalFact[],
  ): LedgerCommitResult {
    const decidedAtMs = proposal.timestampMs ?? Date.now();
    return this.ledger.commit({
      expectedLedgerVersion: record.ledgerVersion,
      state,
      stateChanged,
      proposal,
      recordAttemptSequence: this.isAttemptSequenceAuthentic(record, proposal),
      decision: {
        proposalId: proposal.proposalId,
        executionId: proposal.executionId,
        kind,
        reason,
        decidedAtMs,
      },
      facts,
    });
  }

  private validateActiveLease(
    state: ExecutionState,
    proposal: Pick<ExecutionProposal, 'actor' | 'lease' | 'attemptId' | 'timestampMs'>,
  ): string | undefined {
    if (!this.requiresLease(proposal.actor.type)) return undefined;
    const lease = state.activeLease;
    if (!lease || !proposal.lease) return 'active_lease_required';
    if (
      lease.leaseId !== proposal.lease.leaseId ||
      lease.fencingToken !== proposal.lease.fencingToken ||
      (proposal.attemptId !== undefined && lease.attemptId !== proposal.attemptId)
    ) {
      return 'stale_or_mismatched_lease';
    }
    if (lease.holderId !== proposal.actor.id) return 'lease_holder_mismatch';
    if ((proposal.timestampMs ?? Date.now()) >= lease.expiresAtMs) return 'lease_expired';
    return undefined;
  }

  /**
   * Prevent an unauthenticated high sequence from poisoning a legitimate
   * attempt. Historical attempts may still contribute ordered late evidence
   * when their actor, attempt, lease, and fence match the original grant.
   */
  private isAttemptSequenceAuthentic(
    record: ExecutionLedgerRecord,
    proposal: Pick<ExecutionProposal, 'actor' | 'lease' | 'attemptId' | 'attemptSequence'>,
  ): boolean {
    if (proposal.attemptId === undefined || proposal.attemptSequence === undefined) return false;
    if (!this.requiresLease(proposal.actor.type)) return true;
    if (!proposal.lease) return false;

    const active = record.state.activeLease;
    if (
      active?.attemptId === proposal.attemptId &&
      active.leaseId === proposal.lease.leaseId &&
      active.fencingToken === proposal.lease.fencingToken &&
      active.holderId === proposal.actor.id
    ) {
      return true;
    }

    return record.journal.some((entry) => (
      entry.type === 'work.attempt_authorized' &&
      entry.data.attemptId === proposal.attemptId &&
      entry.data.leaseId === proposal.lease?.leaseId &&
      entry.data.fencingToken === proposal.lease?.fencingToken &&
      entry.data.holderId === proposal.actor.id
    ));
  }

  private validateAttemptSequence(
    record: ExecutionLedgerRecord,
    proposal: Pick<ExecutionProposal, 'attemptId' | 'attemptSequence'>,
  ): string | undefined {
    if (proposal.attemptId === undefined || proposal.attemptSequence === undefined) return undefined;
    const priorSequence = record.attemptSequenceByAttempt?.[proposal.attemptId];
    if (priorSequence !== undefined && proposal.attemptSequence <= priorSequence) {
      return 'non_monotonic_attempt_sequence';
    }
    return undefined;
  }

  private remainingBudget(state: ExecutionState): number {
    return Math.max(0, state.budget.limitTokens - state.budget.consumedTokens - state.budget.reservedTokens);
  }

  private isValidTokenAmount(value: number): boolean {
    return Number.isSafeInteger(value) && value >= 0;
  }

  private requiresLease(actorType: ExecutionProposal['actor']['type']): boolean {
    return actorType === 'agent' || actorType === 'worker';
  }

  private isControlActor(actorType: ExecutionProposal['actor']['type']): boolean {
    return actorType === 'control' || actorType === 'system';
  }

  private isVerifierActor(actorType: ExecutionProposal['actor']['type']): boolean {
    return actorType === 'verifier' || this.isControlActor(actorType);
  }

  private validateEnvelope(proposal: ExecutionProposal): void {
    if (!proposal.proposalId.trim()) throw new TypeError('proposalId must be non-empty');
    if (!proposal.executionId.trim()) throw new TypeError('executionId must be non-empty');
    if (!proposal.actor.id.trim()) throw new TypeError('actor id must be non-empty');
    if (!Number.isSafeInteger(proposal.expectedExecutionRevision) || proposal.expectedExecutionRevision < 1) {
      throw new TypeError('expectedExecutionRevision must be a positive safe integer');
    }
    if (
      proposal.attemptSequence !== undefined &&
      (!Number.isSafeInteger(proposal.attemptSequence) || proposal.attemptSequence < 0)
    ) {
      throw new TypeError('attemptSequence must be a non-negative safe integer');
    }
    if (
      proposal.timestampMs !== undefined &&
      (!Number.isSafeInteger(proposal.timestampMs) || proposal.timestampMs < 0)
    ) {
      throw new TypeError('timestampMs must be a non-negative safe integer');
    }
    if (proposal.lease && (
      !proposal.lease.leaseId.trim() ||
      !Number.isSafeInteger(proposal.lease.fencingToken) ||
      proposal.lease.fencingToken < 1
    )) {
      throw new TypeError('lease context must contain a non-empty id and positive fencing token');
    }
  }
}
