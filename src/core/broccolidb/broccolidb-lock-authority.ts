/**
 * GALXAI: BroccoliLockAuthority (Zenith Tier)
 *
 * In-process lock authority for BroccoliDB.
 * Supports shared & exclusive locks, TTL auto-expiration, and atomic multi-key acquisition
 * with deterministic alphabetical ordering for mathematical deadlock immunity.
 */

import type {
  BroccoliLockHandle,
  BroccoliLockMode,
  IBroccoliLockAuthority,
} from "./broccolidb.contracts";
import { randomUUID } from "node:crypto";

export class BroccoliLockAuthority implements IBroccoliLockAuthority {
  private readonly locks = new Map<string, BroccoliLockHandle[]>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 10000) {
    if (!Number.isSafeInteger(defaultTtlMs) || defaultTtlMs <= 0) {
      throw new RangeError("defaultTtlMs must be a positive integer");
    }
    this.defaultTtlMs = defaultTtlMs;
  }

  public async acquireLock(
    resourceKey: string,
    ownerId: string,
    mode: BroccoliLockMode = "EXCLUSIVE",
    ttlMs?: number
  ): Promise<BroccoliLockHandle> {
    this.cleanExpiredLocks();
    if (!resourceKey.trim()) throw new TypeError("resourceKey must be a non-empty string");
    if (!ownerId.trim()) throw new TypeError("ownerId must be a non-empty string");
    const effectiveTtlMs = ttlMs ?? this.defaultTtlMs;
    if (!Number.isSafeInteger(effectiveTtlMs) || effectiveTtlMs <= 0) {
      throw new RangeError("ttlMs must be a positive integer");
    }

    const existing = this.locks.get(resourceKey) ?? [];
    const owned = existing.find((handle) => handle.ownerId === ownerId && handle.mode === mode);
    if (owned) return owned;

    const conflict = existing.find(
      (handle) => handle.ownerId !== ownerId && (mode === "EXCLUSIVE" || handle.mode === "EXCLUSIVE")
    );
    if (conflict) {
      throw new Error(
        `Resource '${resourceKey}' conflicts with lock owned by '${conflict.ownerId}' in ${conflict.mode} mode`
      );
    }

    // A lock upgrade must be explicit: silently adding an exclusive handle next
    // to the caller's shared handle would violate mutual exclusion.
    if (existing.some((handle) => handle.ownerId === ownerId && handle.mode !== mode)) {
      throw new Error(`Owner '${ownerId}' must release its existing lock before changing mode`);
    }

    const acquiredAt = Date.now();
    const expiresAt = acquiredAt + effectiveTtlMs;
    const lockId = `lock_${randomUUID()}`;

    const handle: BroccoliLockHandle = {
      lockId,
      resourceKey,
      ownerId,
      mode,
      acquiredAt,
      expiresAt,
    };

    existing.push(handle);
    this.locks.set(resourceKey, existing);
    return handle;
  }

  public async acquireAll(
    resourceKeys: readonly string[],
    ownerId: string,
    mode: BroccoliLockMode = "EXCLUSIVE",
    ttlMs?: number
  ): Promise<readonly BroccoliLockHandle[]> {
    // Sort keys alphabetically to guarantee deadlock-free ordering across threads
    const sortedKeys = Array.from(new Set(resourceKeys)).sort();
    const acquired: BroccoliLockHandle[] = [];
    const newlyAcquiredIds = new Set<string>();

    try {
      for (const key of sortedKeys) {
        const existingIds = new Set((this.locks.get(key) ?? []).map((handle) => handle.lockId));
        const handle = await this.acquireLock(key, ownerId, mode, ttlMs);
        acquired.push(handle);
        if (!existingIds.has(handle.lockId)) newlyAcquiredIds.add(handle.lockId);
      }
      return acquired;
    } catch (err) {
      // Rollback already acquired locks
      for (const handle of acquired.reverse()) {
        if (newlyAcquiredIds.has(handle.lockId)) this.releaseLock(handle.lockId);
      }
      throw err;
    }
  }

  public releaseLock(lockId: string): boolean {
    for (const [key, handles] of this.locks.entries()) {
      const index = handles.findIndex((handle) => handle.lockId === lockId);
      if (index !== -1) {
        handles.splice(index, 1);
        if (handles.length === 0) this.locks.delete(key);
        return true;
      }
    }
    return false;
  }

  public releaseAllForOwner(ownerId: string): number {
    let released = 0;
    for (const [key, handles] of Array.from(this.locks.entries())) {
      const retained = handles.filter((handle) => handle.ownerId !== ownerId);
      released += handles.length - retained.length;
      if (retained.length === 0) this.locks.delete(key);
      else this.locks.set(key, retained);
    }
    return released;
  }

  public isLocked(resourceKey: string): boolean {
    this.cleanExpiredLocks();
    return this.locks.has(resourceKey);
  }

  public getActiveLocks(): readonly BroccoliLockHandle[] {
    this.cleanExpiredLocks();
    return Array.from(this.locks.values()).flat();
  }

  private cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, handles] of this.locks.entries()) {
      const active = handles.filter((handle) => now < handle.expiresAt);
      if (active.length === 0) this.locks.delete(key);
      else if (active.length !== handles.length) this.locks.set(key, active);
    }
  }
}
