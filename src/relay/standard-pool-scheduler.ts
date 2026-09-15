import { performance } from 'node:perf_hooks';

export const STANDARD_RECOVERY_INTERVAL_MS = 5000;

/** Standard's local dispatch ordering. Central leases remain the capacity authority. */
export class StandardPoolScheduler {
  private readonly selected = new Map<string, true>();
  private readonly forwarding = new Map<string, symbol>();
  private nextRecoveryAt = -Infinity;

  constructor(private readonly now: () => number = () => performance.now()) {}

  reserve<T extends { id: string; lastUsedAtMs: number; recovering?: boolean }>(candidates: readonly T[]) {
    const now = this.now();
    const rank = new Map([...this.selected.keys()].map((id, index) => [id, index]));
    const historicalUse = (c: T) => Number.isSafeInteger(c.lastUsedAtMs) && c.lastUsedAtMs > 0 ? c.lastUsedAtMs : 0;
    const candidate = candidates.filter(c => !this.forwarding.has(c.id) && (!c.recovering || now >= this.nextRecoveryAt))
      .sort((a, b) => {
        const ar = rank.get(a.id), br = rank.get(b.id);
        // Checkpoint timestamps seed only first use. Live rotation has no wall-clock dependency.
        if (ar === undefined && br === undefined) return historicalUse(a) - historicalUse(b) || a.id.localeCompare(b.id);
        if (ar === undefined) return -1;
        if (br === undefined) return 1;
        return ar - br;
      })[0];
    if (!candidate) return undefined;
    // One ordering across models: changing a capability subset must not reset a cursor.
    this.selected.delete(candidate.id); this.selected.set(candidate.id, true);
    const token = Symbol(); this.forwarding.set(candidate.id, token);
    // Recovery is real user work, never a timer-driven probe or an uncertain-request retry.
    if (candidate.recovering) this.nextRecoveryAt = now + STANDARD_RECOVERY_INTERVAL_MS;
    return { candidate, release: () => {
      if (this.forwarding.get(candidate.id) === token) this.forwarding.delete(candidate.id);
    } };
  }

  reconcile(accountIds: ReadonlySet<string>) {
    for (const id of this.selected.keys()) if (!accountIds.has(id) && !this.forwarding.has(id)) this.selected.delete(id);
  }
}
