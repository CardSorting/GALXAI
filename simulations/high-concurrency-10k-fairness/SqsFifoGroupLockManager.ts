/**
 * @file SqsFifoGroupLockManager.ts
 * @description AWS SQS FIFO Message Group ID (`groupId`) Sequential Lock Manager.
 * Guarantees strict sequential, in-order execution for tasks with the same groupId,
 * while allowing full horizontal concurrency across distinct groups.
 */

interface GroupQueueState {
  isLocked: boolean;
  activeTaskId?: string;
  sequenceCounter: number;
  waitingCallers: Array<{
    taskId: string;
    resolve: (sequence: number) => void;
  }>;
}

export class SqsFifoGroupLockManager {
  private readonly groups: Map<string, GroupQueueState> = new Map();
  private totalSequenced = 0;

  /**
   * Acquire execution lock for a specific groupId.
   * If group is currently busy with another task, waits until that task releases the lock.
   */
  public async acquireGroupLock(groupId: string, taskId: string): Promise<number> {
    let state = this.groups.get(groupId);
    if (!state) {
      state = {
        isLocked: false,
        sequenceCounter: 0,
        waitingCallers: []
      };
      this.groups.set(groupId, state);
    }

    if (!state.isLocked) {
      state.isLocked = true;
      state.activeTaskId = taskId;
      state.sequenceCounter++;
      this.totalSequenced++;
      return state.sequenceCounter;
    }

    // Group is currently locked: await turn in strict FIFO order
    return new Promise<number>((resolve) => {
      state!.waitingCallers.push({
        taskId,
        resolve: (seq) => {
          this.totalSequenced++;
          resolve(seq);
        }
      });
    });
  }

  /**
   * Release execution lock for a groupId, allowing the next queued task in that group to proceed.
   */
  public releaseGroupLock(groupId: string, taskId: string): void {
    const state = this.groups.get(groupId);
    if (!state) return;

    if (state.waitingCallers.length > 0) {
      const next = state.waitingCallers.shift()!;
      state.activeTaskId = next.taskId;
      state.sequenceCounter++;
      next.resolve(state.sequenceCounter);
    } else {
      state.isLocked = false;
      state.activeTaskId = undefined;
    }
  }

  public getStats() {
    return {
      totalGroups: this.groups.size,
      activeLockedGroups: Array.from(this.groups.values()).filter((g) => g.isLocked).length,
      totalSequencedTasks: this.totalSequenced
    };
  }
}
