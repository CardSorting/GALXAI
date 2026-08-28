/**
 * GALXAI: BroccoliRaftConsensusEngine (Zenith Tier)
 *
 * Local Raft protocol state model for BroccoliDB.
 * Implements vote and AppendEntries rules; transport, timers, durability, quorum replication,
 * and linearizable read barriers must be supplied by a complete Raft runtime.
 */

import type {
  BroccoliRaftAppendEntriesRequest,
  BroccoliRaftAppendEntriesResponse,
  BroccoliRaftLogEntry,
  BroccoliRaftNodeRole,
  BroccoliRaftVoteRequest,
  BroccoliRaftVoteResponse,
  IBroccoliRaftConsensusEngine,
} from "./broccolidb.contracts";

export class BroccoliRaftConsensusEngine implements IBroccoliRaftConsensusEngine {
  readonly nodeId: string;
  private role: BroccoliRaftNodeRole = "FOLLOWER";
  private currentTerm = 0;
  private votedFor: string | null = null;
  private leaderId: string | null = null;
  private commitIndex = 0;
  private readonly log: BroccoliRaftLogEntry[] = [];
  private readonly clusterNodes: string[];

  constructor(nodeId: string, clusterNodes: readonly string[] = []) {
    if (!nodeId.trim()) throw new TypeError("nodeId must be non-empty");
    this.nodeId = nodeId;
    this.clusterNodes = clusterNodes.length > 0 ? Array.from(new Set(clusterNodes)) : [nodeId];
    if (!this.clusterNodes.includes(nodeId)) this.clusterNodes.push(nodeId);
  }

  public getRole(): BroccoliRaftNodeRole {
    return this.role;
  }

  public getCurrentTerm(): number {
    return this.currentTerm;
  }

  public getLeaderId(): string | null {
    return this.leaderId;
  }

  public getCommitIndex(): number {
    return this.commitIndex;
  }

  public requestVote(request: BroccoliRaftVoteRequest): BroccoliRaftVoteResponse {
    if (!request.candidateId.trim()) throw new TypeError("candidateId must be non-empty");
    this.validateTerm(request.term, "term");
    this.validateIndex(request.lastLogIndex, "lastLogIndex");
    this.validateTerm(request.lastLogTerm, "lastLogTerm");
    // 1. If term < currentTerm, reject
    if (request.term < this.currentTerm) {
      return { term: this.currentTerm, voteGranted: false };
    }

    // 2. If term > currentTerm, step down
    if (request.term > this.currentTerm) {
      this.currentTerm = request.term;
      this.role = "FOLLOWER";
      this.votedFor = null;
      this.leaderId = null;
    }

    // 3. Check vote eligibility and log up-to-date invariant
    const canVote = this.votedFor === null || this.votedFor === request.candidateId;
    const lastLog = this.log[this.log.length - 1];
    const myLastTerm = lastLog ? lastLog.term : 0;
    const myLastIndex = lastLog ? lastLog.index : 0;

    const isLogOk =
      request.lastLogTerm > myLastTerm ||
      (request.lastLogTerm === myLastTerm && request.lastLogIndex >= myLastIndex);

    if (canVote && isLogOk) {
      this.votedFor = request.candidateId;
      return { term: this.currentTerm, voteGranted: true };
    }

    return { term: this.currentTerm, voteGranted: false };
  }

  public appendEntries(request: BroccoliRaftAppendEntriesRequest): BroccoliRaftAppendEntriesResponse {
    if (!request.leaderId.trim()) throw new TypeError("leaderId must be non-empty");
    this.validateTerm(request.term, "term");
    this.validateIndex(request.prevLogIndex, "prevLogIndex");
    this.validateTerm(request.prevLogTerm, "prevLogTerm");
    this.validateIndex(request.leaderCommit, "leaderCommit");
    // 1. If term < currentTerm, reject
    if (request.term < this.currentTerm) {
      return { term: this.currentTerm, success: false, matchIndex: 0 };
    }

    // 2. Recognize leader and update term
    if (request.term >= this.currentTerm) {
      if (request.term > this.currentTerm) this.votedFor = null;
      this.currentTerm = request.term;
      this.role = "FOLLOWER";
      this.leaderId = request.leaderId;
    }

    for (let i = 0; i < request.entries.length; i++) {
      const expectedIndex = request.prevLogIndex + i + 1;
      const entry = request.entries[i];
      if (entry.index !== expectedIndex || !Number.isSafeInteger(entry.term) || entry.term < 0) {
        return { term: this.currentTerm, success: false, matchIndex: this.log.length };
      }
      if (i > 0 && entry.term < request.entries[i - 1].term) {
        return { term: this.currentTerm, success: false, matchIndex: this.log.length };
      }
    }

    // 3. Verify log matching invariant
    if (request.prevLogIndex > 0) {
      const prevEntry = this.log[request.prevLogIndex - 1];
      if (!prevEntry || prevEntry.term !== request.prevLogTerm) {
        return { term: this.currentTerm, success: false, matchIndex: this.log.length };
      }
    }

    // 4. Append new entries
    for (let i = 0; i < request.entries.length; i++) {
      const entry = request.entries[i];
      const existing = this.log[entry.index - 1];
      if (existing) {
        if (existing.term !== entry.term) {
          // Truncate conflicting log entries
          this.log.splice(entry.index - 1);
          this.log.push({ ...entry });
        }
      } else {
        this.log.push({ ...entry });
      }
    }

    // 5. Update commit index
    if (request.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(request.leaderCommit, this.log.length);
    }

    return {
      term: this.currentTerm,
      success: true,
      matchIndex: request.prevLogIndex + request.entries.length,
    };
  }

  public async proposeCommand(command: string, payload?: unknown): Promise<BroccoliRaftLogEntry> {
    if (this.role !== "LEADER") {
      throw new Error(`Node '${this.nodeId}' is not the leader (current leader: '${this.leaderId ?? "none"}')`);
    }
    if (!command.trim()) throw new TypeError("command must be non-empty");

    const index = this.log.length + 1;
    const entry: BroccoliRaftLogEntry = {
      index,
      term: this.currentTerm,
      command,
      payload,
      timestamp: Date.now(),
    };

    this.log.push(entry);
    // In single-node / leader-only configuration, commit immediately
    if (this.clusterNodes.length <= 1) {
      this.commitIndex = index;
    }

    return { ...entry };
  }

  public async startElection(): Promise<boolean> {
    this.role = "CANDIDATE";
    this.currentTerm++;
    this.votedFor = this.nodeId;
    this.leaderId = null;

    let votes = 1; // Self-vote
    const majority = Math.floor(this.clusterNodes.length / 2) + 1;

    if (votes >= majority) {
      this.role = "LEADER";
      this.leaderId = this.nodeId;
      return true;
    }

    return false;
  }

  public getLogEntries(fromIndex = 1): readonly BroccoliRaftLogEntry[] {
    if (!Number.isSafeInteger(fromIndex) || fromIndex < 1) throw new RangeError("fromIndex must be positive");
    return this.log.filter((e) => e.index >= fromIndex).map((entry) => ({ ...entry }));
  }

  private validateTerm(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  }

  private validateIndex(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  }
}
