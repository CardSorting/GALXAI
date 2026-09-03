/**
 * GALXAI Developer SDK: Checkpoints Resource
 * Manages frame-perfect double-buffered state checkpoints in BroccoliDB.
 * Enables zero-downtime atomic rollbacks, structural checkpoint diffing, semantic tagging,
 * and autonomous agent timeline isolation.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BroccoliDatabaseKernel, broccolidb } from '../../core/broccolidb/broccolidb-kernel';
import type { TimelineCheckpointRecord } from '../../core/broccolidb/broccolidb.contracts';

export interface CheckpointDiffResult {
  checkpointIdA: string;
  checkpointIdB: string;
  identical: boolean;
  tableCountA: number;
  tableCountB: number;
  totalRecordsA: number;
  totalRecordsB: number;
  tablesDelta: {
    added: string[];
    removed: string[];
    common: string[];
  };
}

export class CheckpointsResource {
  private readonly kernel: BroccoliDatabaseKernel;
  private readonly tags = new Map<string, string>(); // tag -> checkpointId

  constructor(kernel: BroccoliDatabaseKernel = broccolidb) {
    this.kernel = kernel;
  }

  /**
   * Captures an atomic double-buffered state checkpoint across all in-memory BroccoliDB tables.
   *
   * @example
   * ```typescript
   * const cp = await galx.checkpoints.create('pre_agent_execution');
   * console.log(cp.checkpointId, cp.snapshotHash);
   * ```
   */
  public async create(label?: string): Promise<TimelineCheckpointRecord> {
    return this.kernel.checkpoint(label);
  }

  /**
   * Restores state to a prior timeline checkpoint with frame-perfect precision.
   *
   * @example
   * ```typescript
   * const restored = await galx.checkpoints.restore(cp.checkpointId);
   * if (restored) console.log('State rolled back successfully');
   * ```
   */
  public async restore(checkpointId: string): Promise<boolean> {
    return this.kernel.rollback(checkpointId);
  }

  /**
   * Lists all timeline checkpoint records sorted in reverse chronological order (newest first).
   */
  public list(): readonly TimelineCheckpointRecord[] {
    return this.kernel.listCheckpoints();
  }

  /**
   * Retrieves metadata for a specific checkpoint by ID. Returns undefined if not found.
   */
  public get(checkpointId: string): TimelineCheckpointRecord | undefined {
    return this.list().find(c => c.checkpointId === checkpointId);
  }

  /**
   * Associates a custom semantic tag (e.g. 'v1.0-release', 'golden-eval', 'safe-baseline')
   * with a specific checkpoint for easy future reference.
   */
  public tag(checkpointId: string, tagName: string): void {
    const cp = this.get(checkpointId);
    if (!cp) {
      throw new Error(`Cannot tag non-existent checkpoint: ${checkpointId}`);
    }
    this.tags.set(tagName, checkpointId);
  }

  /**
   * Retrieves a checkpoint by its semantic tag.
   */
  public getByTag(tagName: string): TimelineCheckpointRecord | undefined {
    const cpId = this.tags.get(tagName);
    return cpId ? this.get(cpId) : undefined;
  }

  /**
   * Computes structural table-level diffs between two timeline checkpoints.
   *
   * @example
   * ```typescript
   * const diff = await galx.checkpoints.diff(cpA.checkpointId, cpB.checkpointId);
   * console.log(diff.tablesDelta.added, diff.identical);
   * ```
   */
  public async diff(checkpointIdA: string, checkpointIdB: string): Promise<CheckpointDiffResult> {
    const cpA = this.get(checkpointIdA);
    const cpB = this.get(checkpointIdB);

    if (!cpA) throw new Error(`Checkpoint not found: ${checkpointIdA}`);
    if (!cpB) throw new Error(`Checkpoint not found: ${checkpointIdB}`);

    const identical = cpA.snapshotHash === cpB.snapshotHash;

    // Attempt to inspect on-disk snapshots if present
    let tablesA: string[] = [];
    let tablesB: string[] = [];

    try {
      const dir = path.resolve(process.cwd(), '.broccolidb', 'checkpoints');
      const fileA = path.join(dir, `${checkpointIdA}.json`);
      const fileB = path.join(dir, `${checkpointIdB}.json`);

      const [contentA, contentB] = await Promise.all([
        fs.readFile(fileA, 'utf-8').catch(() => null),
        fs.readFile(fileB, 'utf-8').catch(() => null)
      ]);

      if (contentA) {
        const parsedA = JSON.parse(contentA);
        const snapshotA = parsedA.snapshot || parsedA.data;
        tablesA = Object.keys(snapshotA?.tables || {});
      }
      if (contentB) {
        const parsedB = JSON.parse(contentB);
        const snapshotB = parsedB.snapshot || parsedB.data;
        tablesB = Object.keys(snapshotB?.tables || {});
      }
    } catch {}

    const setA = new Set(tablesA);
    const setB = new Set(tablesB);

    const added = tablesB.filter(t => !setA.has(t));
    const removed = tablesA.filter(t => !setB.has(t));
    const common = tablesB.filter(t => setA.has(t));

    return {
      checkpointIdA,
      checkpointIdB,
      identical,
      tableCountA: cpA.tableCount,
      tableCountB: cpB.tableCount,
      totalRecordsA: cpA.totalRecords,
      totalRecordsB: cpB.totalRecords,
      tablesDelta: { added, removed, common }
    };
  }

  /**
   * Returns the total count of checkpoints recorded in the catalog.
   */
  public count(): number {
    return this.list().length;
  }
}
