/**
 * GALXAI: BroccoliTwoPhaseCommitCoordinator (Zenith Tier)
 *
 * In-process Two-Phase Commit (2PC) protocol coordinator for BroccoliDB.
 * Models prepare/decision handling and exposes heuristic outcomes; durability and RPC are external concerns.
 */

import type {
  Broccoli2pcTransactionSession,
  IBroccoli2pcParticipant,
  IBroccoliTwoPhaseCommitCoordinator,
} from "./broccolidb.contracts";

export class BroccoliTwoPhaseCommitCoordinator implements IBroccoliTwoPhaseCommitCoordinator {
  private readonly participants = new Map<string, IBroccoli2pcParticipant>();
  private readonly sessions = new Map<string, Broccoli2pcTransactionSession>();

  public registerParticipant(participant: IBroccoli2pcParticipant): void {
    if (!participant.participantId.trim()) throw new TypeError("participantId must be non-empty");
    this.participants.set(participant.participantId, participant);
  }

  public unregisterParticipant(participantId: string): void {
    this.participants.delete(participantId);
  }

  public begin2pcTransaction(
    txId: string,
    participantIds?: readonly string[]
  ): Broccoli2pcTransactionSession {
    if (!txId.trim()) throw new TypeError("txId must be non-empty");
    if (this.sessions.has(txId)) throw new Error(`2PC transaction '${txId}' already exists`);
    const pIds = Array.from(new Set(participantIds ?? Array.from(this.participants.keys())));
    if (pIds.length === 0) throw new Error("A 2PC transaction requires at least one participant");
    const unknown = pIds.filter((id) => !this.participants.has(id));
    if (unknown.length > 0) {
      throw new Error(`Unknown 2PC participant(s): ${unknown.join(", ")}`);
    }
    const session: Broccoli2pcTransactionSession = {
      txId,
      createdAt: Date.now(),
      state: "PREPARING",
      participants: [...pIds],
    };
    this.sessions.set(txId, session);
    return session;
  }

  public async execute2pc(txId: string): Promise<boolean> {
    const session = this.sessions.get(txId);
    if (!session || session.state !== "PREPARING") {
      throw new Error(`Invalid 2PC transaction state for txId: ${txId}`);
    }

    const missingIds = session.participants.filter((id) => !this.participants.has(id));
    if (missingIds.length > 0) {
      Object.assign(session, {
        state: "ABORTED",
        failureReason: `Participants unregistered before execution: ${missingIds.join(", ")}`,
      });
      return false;
    }
    const participantsToRun = session.participants.map((id) => this.participants.get(id)!);

    // Phase 1: Prepare (Voting Phase)
    let allPrepared = true;
    const preparedParticipants: IBroccoli2pcParticipant[] = [];
    try {
      const votes = await Promise.all(
        participantsToRun.map(async (participant) => ({
          participant,
          vote: await participant.prepare(txId),
        }))
      );
      for (const result of votes) {
        if (result.vote) preparedParticipants.push(result.participant);
      }
      allPrepared = preparedParticipants.length === participantsToRun.length;
    } catch (error) {
      allPrepared = false;
      Object.assign(session, {
        failureReason: error instanceof Error ? error.message : String(error),
      });
    }
    Object.assign(session, {
      preparedParticipants: preparedParticipants.map((participant) => participant.participantId),
    });

    // Phase 2: Commit or Abort (Decision Phase)
    if (allPrepared) {
      Object.assign(session, { state: "PREPARED" });
      Object.assign(session, { state: "COMMITTING" });
      const commitResults = await Promise.allSettled(participantsToRun.map((p) => p.commit(txId)));
      if (commitResults.every((result) => result.status === "fulfilled")) {
        Object.assign(session, { state: "COMMITTED" });
        return true;
      }
      // Once any commit RPC has succeeded, rollback cannot restore the atomic
      // decision. Surface the standard 2PC heuristic outcome instead of lying
      // that the transaction was cleanly aborted.
      Object.assign(session, {
        state: "HEURISTIC",
        failureReason: "One or more participant commit operations failed after prepare",
      });
      return false;
    } else {
      Object.assign(session, { state: "ABORTING" });
      // Rollback is idempotent by participant contract; invoke every enlisted
      // participant because a failed/exceptional prepare may still have staged work.
      const rollbacks = await Promise.allSettled(participantsToRun.map((p) => p.rollback(txId)));
      const rollbackFailures = rollbacks.filter((result) => result.status === "rejected").length;
      Object.assign(session, {
        state: rollbackFailures === 0 ? "ABORTED" : "HEURISTIC",
        failureReason:
          rollbackFailures === 0
            ? session.failureReason
            : `${rollbackFailures} participant rollback operation(s) failed`,
      });
      return false;
    }
  }

  public getTransaction(txId: string): Broccoli2pcTransactionSession | undefined {
    return this.sessions.get(txId);
  }

  public getActiveTransactions(): readonly Broccoli2pcTransactionSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.state !== "COMMITTED" && s.state !== "ABORTED"
    );
  }
}
