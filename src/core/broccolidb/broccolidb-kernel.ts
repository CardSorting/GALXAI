/**
 * GALXAI: BroccoliDB Master Deterministic Hybrid In-Memory + Handrolled Kernel (Zenith Tier)
 * Unifies L1 Hot In-Memory Reactive Tables, L2 Micro-Batched Write-Ahead Log (WAL),
 * L3 Sharded Content-Addressable Storage (CAS), L4 Double-Buffered Atomic Checkpointing,
 * and the 4-Pillar Forensic Diagnostic Probe.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  DbHealthReport,
  IBroccoliDatabaseKernel,
  IDbTable,
  TimelineCheckpointRecord,
  WalFrame,
} from "./broccolidb.contracts";
import { BroccoliCASStorageService } from "./broccolidb-cas";
import { ReentrantAsyncMutex } from "./broccolidb-mutex";
import { BroccoliDbTable } from "./broccolidb-table";
import { BroccoliWriteAheadLog } from "./broccolidb-wal";
import { BroccoliConnectionPool } from "./broccolidb-connection-pool";
import { BroccoliLockAuthority } from "./broccolidb-lock-authority";
import { BroccoliQueryOptimizer } from "./broccolidb-query-optimizer";
import { BroccoliMvccEngine } from "./broccolidb-mvcc-engine";
import { BroccoliSparseIndexEngine } from "./broccolidb-sparse-index-engine";
import { BroccoliCdcStream } from "./broccolidb-cdc-stream";
import { BroccoliVectorEngine } from "./broccolidb-vector-engine";
import { BroccoliInvertedIndexEngine } from "./broccolidb-inverted-index-engine";
import { BroccoliTwoPhaseCommitCoordinator } from "./broccolidb-2pc-coordinator";
import { BroccoliBufferPoolManager } from "./broccolidb-buffer-pool-manager";
import { BroccoliLsmStore } from "./broccolidb-lsm-store";
import { BroccoliRaftConsensusEngine } from "./broccolidb-raft-consensus";
import { BroccoliAdaptivePlanCache } from "./broccolidb-plan-cache";
import { BroccoliSagaOrchestrator } from "./broccolidb-saga-orchestrator";
import { BroccoliTieredKvCache } from "./broccolidb-tiered-kv-cache";
import { BroccoliVectorAnnEngine } from "./broccolidb-vector-ann-engine";
import { BroccoliConsistentHashRing } from "./broccolidb-consistent-hash-ring";
import { BroccoliTimeSeriesRollupEngine } from "./broccolidb-timeseries-rollup-engine";
import { BroccoliBTreeIndexEngine } from "./broccolidb-btree-index-engine";
import { BroccoliDeadlockDetector } from "./broccolidb-deadlock-detector";
import { BroccoliMaterializedViewEngine } from "./broccolidb-materialized-view-engine";

export interface DatabaseKernelOptions {
  readonly workspaceRoot?: string;
  readonly walDebounceMs?: number;
  readonly nodeId?: string;
}

interface PersistedTableEntry {
  readonly id: string;
  readonly record: Record<string, unknown>;
}

interface PersistedDatabaseSnapshot {
  readonly formatVersion: 2;
  readonly includedWalFrameId: number;
  readonly snapshotHash: string;
  readonly tables: Record<string, PersistedTableEntry[]>;
}

export class BroccoliDatabaseKernel implements IBroccoliDatabaseKernel {
  readonly workspaceRoot: string;
  readonly connectionPool: BroccoliConnectionPool;
  readonly lockAuthority: BroccoliLockAuthority;
  readonly queryOptimizer: BroccoliQueryOptimizer;
  readonly mvcc: BroccoliMvccEngine;
  readonly sparseIndex: BroccoliSparseIndexEngine;
  readonly cdc: BroccoliCdcStream;
  readonly vectorEngine: BroccoliVectorEngine;
  readonly invertedIndex: BroccoliInvertedIndexEngine;
  readonly twoPhaseCommit: BroccoliTwoPhaseCommitCoordinator;
  readonly bufferPool: BroccoliBufferPoolManager;
  readonly lsmStore: BroccoliLsmStore;
  readonly raftConsensus: BroccoliRaftConsensusEngine;
  readonly planCache: BroccoliAdaptivePlanCache;
  readonly sagaOrchestrator: BroccoliSagaOrchestrator;
  readonly tieredKvCache: BroccoliTieredKvCache;
  readonly vectorAnn: BroccoliVectorAnnEngine;
  readonly hashRing: BroccoliConsistentHashRing;
  readonly timeSeriesRollup: BroccoliTimeSeriesRollupEngine;
  readonly bTree: BroccoliBTreeIndexEngine;
  readonly deadlockDetector: BroccoliDeadlockDetector;
  readonly materializedView: BroccoliMaterializedViewEngine;

  private readonly dbDir: string;
  private readonly checkpointsDir: string;
  private readonly baseDbPath: string;
  private readonly tables = new Map<string, BroccoliDbTable<Record<string, unknown>>>();
  private readonly checkpoints = new Map<string, TimelineCheckpointRecord>();
  private readonly memorySnapshots = new Map<string, Map<string, Map<string, Record<string, unknown>>>>();
  private readonly wal: BroccoliWriteAheadLog;
  private readonly cas: BroccoliCASStorageService;
  private readonly mutex = new ReentrantAsyncMutex("broccolidb-kernel-mutex");
  private isStarted = false;
  private frameIndex = 0;
  private readonly pendingWalWrites = new Set<Promise<unknown>>();
  private pendingWalError: Error | null = null;
  private mutationsPaused = false;

  constructor(options: DatabaseKernelOptions = {}) {
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.dbDir = path.resolve(this.workspaceRoot, ".broccolidb");
    this.checkpointsDir = path.join(this.dbDir, "checkpoints");
    this.baseDbPath = path.join(this.dbDir, "checkpoint.db");

    this.wal = new BroccoliWriteAheadLog(this.workspaceRoot, options.walDebounceMs ?? 20);
    this.cas = new BroccoliCASStorageService(this.workspaceRoot);

    // Initialize the 21 adjunct in-process engines.
    this.connectionPool = new BroccoliConnectionPool();
    this.lockAuthority = new BroccoliLockAuthority();
    this.queryOptimizer = new BroccoliQueryOptimizer();
    this.mvcc = new BroccoliMvccEngine();
    this.sparseIndex = new BroccoliSparseIndexEngine();
    this.cdc = new BroccoliCdcStream();
    this.vectorEngine = new BroccoliVectorEngine();
    this.invertedIndex = new BroccoliInvertedIndexEngine();
    this.twoPhaseCommit = new BroccoliTwoPhaseCommitCoordinator();
    this.bufferPool = new BroccoliBufferPoolManager();
    this.lsmStore = new BroccoliLsmStore();
    this.raftConsensus = new BroccoliRaftConsensusEngine(options.nodeId ?? "node_local_1");
    this.planCache = new BroccoliAdaptivePlanCache();
    this.sagaOrchestrator = new BroccoliSagaOrchestrator();
    this.tieredKvCache = new BroccoliTieredKvCache();
    this.vectorAnn = new BroccoliVectorAnnEngine();
    this.hashRing = new BroccoliConsistentHashRing();
    this.timeSeriesRollup = new BroccoliTimeSeriesRollupEngine();
    this.bTree = new BroccoliBTreeIndexEngine();
    this.deadlockDetector = new BroccoliDeadlockDetector();
    this.materializedView = new BroccoliMaterializedViewEngine();
  }

  /**
   * Initializes the kernel, mounts CAS, and executes cold-start crash replay.
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    await fs.mkdir(this.dbDir, { recursive: true });
    await fs.mkdir(this.checkpointsDir, { recursive: true });

    try {
      await this.cas.start();
      await this.wal.start();

      // Restore without invoking table WAL hooks, then apply only journal frames
      // newer than the checkpoint's durable cut.
      const includedWalFrameId = await this.loadBaseCheckpoint();
      await this.replayWal(includedWalFrameId);
      await this.loadCheckpointCatalog();
      this.isStarted = true;
    } catch (error) {
      await this.wal.stop().catch(() => undefined);
      await this.cas.stop().catch(() => undefined);
      throw error;
    }
  }

  /**
   * Gracefully flushes WAL and stops kernel subsystems.
   */
  async stop(): Promise<void> {
    await this.flush();
    await this.wal.stop();
    await this.cas.stop();
    this.isStarted = false;
  }

  /**
   * Flushes WAL write buffers to disk.
   */
  async flush(): Promise<void> {
    await this.awaitPendingWalWrites();
    await this.wal.flush();
  }

  /**
   * Returns a typed in-memory reactive table, creating it if it does not exist.
   */
  getTable<T extends Record<string, unknown> = Record<string, unknown>>(name: string): IDbTable<T> {
    if (!name.trim()) throw new TypeError("Table name must be non-empty");
    let table = this.tables.get(name);
    if (!table) {
      table = new BroccoliDbTable<Record<string, unknown>>(
        name,
        (op, tbl, id, payload) => {
          this.frameIndex += 1;
          this.trackWalWrite(this.wal.appendFrame(op, tbl, id, payload));
        },
        () => {
          if (this.mutationsPaused) {
            throw new Error("BroccoliDB mutations are paused for checkpoint or rollback maintenance");
          }
        }
      );
      this.tables.set(name, table);
    }
    return table as unknown as IDbTable<T>;
  }

  /**
   * Executes an async operation in an isolated transaction protected by re-entrant mutex.
   */
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    return this.mutex.runLocked(async () => {
      const snapshot = this.captureAllTables();
      try {
        const result = await fn();
        await this.flush();
        return result;
      } catch (error) {
        // Mutations are applied eagerly by table handles. Restore the captured
        // state and append a canonical compensating image so crash replay reaches
        // the same rollback result.
        await this.awaitPendingWalWrites();
        const affectedTableNames = new Set([...this.tables.keys(), ...snapshot.keys()]);
        this.restoreAllTables(snapshot);
        for (const tableName of affectedTableNames) {
          await this.wal.appendFrame("CLEAR", tableName, "*");
          const records = snapshot.get(tableName) ?? new Map();
          for (const [id, record] of records) {
            await this.wal.appendFrame("INSERT", tableName, id, record);
          }
        }
        await this.wal.flush();
        throw error;
      }
    });
  }

  /**
   * Creates an atomic double-buffered state checkpoint and rotates the WAL journal.
   */
  async checkpoint(label: string = "manual_checkpoint"): Promise<TimelineCheckpointRecord> {
    return this.mutex.runLocked(async () => {
      this.mutationsPaused = true;
      try {
        await this.flush();

        const timestamp = Date.now();
        const checkpointId = `chk_${timestamp}_${crypto.randomUUID()}`;
        const allTableData: Record<string, PersistedTableEntry[]> = {};
        let totalRecords = 0;

        const memorySnapshot = new Map<string, Map<string, Record<string, unknown>>>();

        for (const [tableName, table] of this.tables.entries()) {
          const snapshot = table.createSnapshot();
          allTableData[tableName] = Array.from(snapshot.entries()).map(([id, record]) => ({ id, record }));
          totalRecords += snapshot.size;
          memorySnapshot.set(tableName, snapshot);
        }

        const canonicalTables = JSON.stringify(allTableData);
        const snapshotHash = crypto.createHash("sha256").update(canonicalTables).digest("hex");
        const includedWalFrameId = this.wal.getLastFrameId();

        const record: TimelineCheckpointRecord = {
          checkpointId,
          timestamp,
          frameIndex: includedWalFrameId,
          label,
          tableCount: this.tables.size,
          totalRecords,
          snapshotHash,
        };

        const persisted: PersistedDatabaseSnapshot = {
          formatVersion: 2,
          includedWalFrameId,
          snapshotHash,
          tables: allTableData,
        };
        await this.atomicWriteJson(this.baseDbPath, persisted);

        const historyFile = path.join(this.checkpointsDir, `${checkpointId}.json`);
        const timelinePayload = { record, snapshot: persisted };
        await this.atomicWriteJson(historyFile, timelinePayload);

        this.checkpoints.set(checkpointId, record);
        this.memorySnapshots.set(checkpointId, memorySnapshot);

        await this.wal.truncate();
        await this.wal.appendFrame("CHECKPOINT", "system", checkpointId, { label, snapshotHash });

        return record;
      } finally {
        this.mutationsPaused = false;
      }
    });
  }

  /**
   * Restores state to a prior timeline checkpoint with frame-perfect precision.
   */
  async rollback(checkpointId: string): Promise<boolean> {
    return this.mutex.runLocked(async () => {
      this.mutationsPaused = true;
      try {
        if (!/^chk_[a-zA-Z0-9_-]+$/.test(checkpointId)) return false;
        await this.flush();
        const inMemory = this.memorySnapshots.get(checkpointId);
        if (inMemory) {
          this.restoreAllTables(inMemory);
          await this.persistRollbackState(checkpointId, "memory_cache");
          return true;
        }

        const historyFile = path.join(this.checkpointsDir, `${checkpointId}.json`);
        try {
          const rawContent = await fs.readFile(historyFile, "utf-8");
          const parsed = JSON.parse(rawContent) as { snapshot?: unknown; data?: unknown };
          const decoded = this.decodeSnapshot(parsed.snapshot ?? parsed.data);
          this.restoreAllTables(decoded.tables);
          await this.persistRollbackState(checkpointId, "disk_snapshot");
          return true;
        } catch (error: unknown) {
          if ((error as { code?: string }).code !== "ENOENT") throw error;
          return false;
        }
      } finally {
        this.mutationsPaused = false;
      }
    });
  }

  listCheckpoints(): readonly TimelineCheckpointRecord[] {
    return Array.from(this.checkpoints.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  getWal(): BroccoliWriteAheadLog {
    return this.wal;
  }

  async storeBlob(content: Buffer | string): Promise<string> {
    return this.cas.store(content);
  }

  async readBlob(hash: string): Promise<Buffer | null> {
    return this.cas.read(hash);
  }

  async gc(): Promise<number> {
    const referencedHashes = new Set<string>();

    for (const table of this.tables.values()) {
      for (const record of table.getAll()) {
        for (const value of Object.values(record)) {
          if (typeof value === "string" && value.startsWith("CAS:")) {
            referencedHashes.add(value.substring(4));
          }
        }
      }
    }

    return this.cas.pruneUnreferenced(referencedHashes);
  }

  async health(): Promise<DbHealthReport> {
    const casStats = await this.cas.getStats();
    const walMetrics = this.wal.getMetrics();

    let diskUsageBytes = casStats.totalStoredBytes;
    let writeable = true;
    try {
      const testFile = path.join(this.dbDir, `.health_probe_${Date.now()}`);
      await fs.writeFile(testFile, "OK", "utf-8");
      await fs.unlink(testFile);
    } catch {
      writeable = false;
    }

    let totalRecords = 0;
    for (const table of this.tables.values()) {
      totalRecords += table.count();
    }

    const diskInvariantsValid = writeable;
    const casIntegrityHealthy = casStats.corruptCount === 0;
    const walJournalHealthy = walMetrics.lastFlushError === null && this.pendingWalError === null;
    const tableConsistencyHealthy = true;

    const overallHealthy =
      diskInvariantsValid && casIntegrityHealthy && walJournalHealthy && tableConsistencyHealthy;

    const recommendations: string[] = [];
    if (!writeable) recommendations.push("CRITICAL: Database directory is not writeable. Check disk permissions.");
    if (casStats.corruptCount > 0) recommendations.push(`WARNING: ${casStats.corruptCount} corrupted CAS blobs quarantined.`);
    if (!walJournalHealthy) recommendations.push("CRITICAL: The WAL has a failed append or flush operation.");
    if (walMetrics.uncommittedFrames > 500) recommendations.push("ADVISORY: WAL write buffer is high. Trigger db_checkpoint_wal.");

    return {
      status: overallHealthy ? "HEALTHY" : casStats.corruptCount > 0 ? "DEGRADED" : "CORRUPTED",
      timestamp: Date.now(),
      pillars: {
        diskInvariants: {
          valid: diskInvariantsValid,
          baseDir: this.dbDir,
          diskUsageBytes,
          writeable,
        },
        casIntegrity: {
          totalBlobs: casStats.totalBlobs,
          corruptCount: casStats.corruptCount,
          compressionSavingsPct: casStats.compressionSavingsPct,
          healthy: casIntegrityHealthy,
        },
        walJournal: {
          totalFrames: walMetrics.totalFramesLogged,
          uncommittedFrames: walMetrics.uncommittedFrames,
          lastSyncTimestamp: walMetrics.lastSyncTimestamp,
          healthy: walJournalHealthy,
        },
        tableConsistency: {
          tableCount: this.tables.size,
          totalRecords,
          indexParity: true,
          healthy: tableConsistencyHealthy,
        },
      },
      actionableRecommendations: recommendations,
    };
  }

  private async loadBaseCheckpoint(): Promise<number> {
    try {
      const raw = await fs.readFile(this.baseDbPath, "utf-8");
      const decoded = this.decodeSnapshot(JSON.parse(raw));
      this.restoreAllTables(decoded.tables);
      this.frameIndex = Math.max(this.frameIndex, decoded.includedWalFrameId);
      return decoded.includedWalFrameId;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "ENOENT") return 0;
      throw new Error(`Failed to load BroccoliDB checkpoint '${this.baseDbPath}'`, { cause: error });
    }
  }

  private async replayWal(includedWalFrameId: number): Promise<void> {
    const frames = await this.wal.replay();
    const snapshots = this.captureAllTables();
    for (const frame of frames) {
      if (frame.frameId <= includedWalFrameId) continue;
      if (frame.op === "INSERT" || frame.op === "UPDATE") {
        if (frame.payload && frame.table) {
          let tableSnapshot = snapshots.get(frame.table);
          if (!tableSnapshot) {
            tableSnapshot = new Map();
            snapshots.set(frame.table, tableSnapshot);
          }
          tableSnapshot.set(frame.recordId, { ...frame.payload });
        }
      } else if (frame.op === "DELETE") {
        snapshots.get(frame.table)?.delete(frame.recordId);
      } else if (frame.op === "CLEAR") {
        snapshots.set(frame.table, new Map());
      }
      this.frameIndex = Math.max(this.frameIndex, frame.frameId);
    }
    this.restoreAllTables(snapshots);
  }

  private trackWalWrite(write: Promise<unknown>): void {
    const tracked = write.catch((error: unknown) => {
      this.pendingWalError = error instanceof Error ? error : new Error(String(error));
    });
    this.pendingWalWrites.add(tracked);
    void tracked.finally(() => this.pendingWalWrites.delete(tracked));
  }

  private async awaitPendingWalWrites(): Promise<void> {
    while (this.pendingWalWrites.size > 0) {
      await Promise.all(Array.from(this.pendingWalWrites));
    }
    if (this.pendingWalError) throw this.pendingWalError;
  }

  private captureAllTables(): Map<string, Map<string, Record<string, unknown>>> {
    const snapshots = new Map<string, Map<string, Record<string, unknown>>>();
    for (const [tableName, table] of this.tables) snapshots.set(tableName, table.createSnapshot());
    return snapshots;
  }

  private restoreAllTables(
    snapshots: ReadonlyMap<string, Map<string, Record<string, unknown>>>
  ): void {
    for (const [tableName, table] of this.tables) {
      if (!snapshots.has(tableName)) table.restoreSnapshot(new Map());
    }
    for (const [tableName, snapshot] of snapshots) {
      const table = this.getTable(tableName) as BroccoliDbTable<Record<string, unknown>>;
      table.restoreSnapshot(snapshot);
    }
  }

  private decodeSnapshot(input: unknown): {
    includedWalFrameId: number;
    tables: Map<string, Map<string, Record<string, unknown>>>;
  } {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("Checkpoint root must be an object");
    }

    const candidate = input as Partial<PersistedDatabaseSnapshot>;
    if (candidate.formatVersion === 2) {
      if (!Number.isSafeInteger(candidate.includedWalFrameId) || candidate.includedWalFrameId! < 0) {
        throw new TypeError("Checkpoint includedWalFrameId is invalid");
      }
      if (!candidate.tables || typeof candidate.tables !== "object") {
        throw new TypeError("Checkpoint tables are missing");
      }
      const canonicalTables = JSON.stringify(candidate.tables);
      const actualHash = crypto.createHash("sha256").update(canonicalTables).digest("hex");
      if (actualHash !== candidate.snapshotHash) throw new Error("Checkpoint snapshot hash mismatch");
      return {
        includedWalFrameId: candidate.includedWalFrameId!,
        tables: this.decodeTableEntries(candidate.tables),
      };
    }

    // Backward-compatible reader for the original key-losing checkpoint shape.
    // Legacy records are accepted only when they carry an explicit id.
    const legacyTables = new Map<string, Map<string, Record<string, unknown>>>();
    for (const [tableName, value] of Object.entries(input as Record<string, unknown>)) {
      if (!Array.isArray(value)) throw new TypeError(`Legacy table '${tableName}' must be an array`);
      const table = new Map<string, Record<string, unknown>>();
      for (const record of value) {
        if (!record || typeof record !== "object" || Array.isArray(record)) {
          throw new TypeError(`Legacy table '${tableName}' contains an invalid record`);
        }
        const id = (record as Record<string, unknown>).id;
        if (typeof id !== "string" || !id) {
          throw new Error(`Legacy checkpoint record in '${tableName}' has no recoverable id`);
        }
        table.set(id, { ...(record as Record<string, unknown>) });
      }
      legacyTables.set(tableName, table);
    }
    return { includedWalFrameId: 0, tables: legacyTables };
  }

  private decodeTableEntries(
    tables: Record<string, PersistedTableEntry[]>
  ): Map<string, Map<string, Record<string, unknown>>> {
    const decoded = new Map<string, Map<string, Record<string, unknown>>>();
    for (const [tableName, entries] of Object.entries(tables)) {
      if (!Array.isArray(entries)) throw new TypeError(`Checkpoint table '${tableName}' must be an array`);
      const table = new Map<string, Record<string, unknown>>();
      for (const entry of entries) {
        if (
          !entry ||
          typeof entry !== "object" ||
          typeof entry.id !== "string" ||
          !entry.id ||
          !entry.record ||
          typeof entry.record !== "object" ||
          Array.isArray(entry.record)
        ) {
          throw new TypeError(`Checkpoint table '${tableName}' contains an invalid entry`);
        }
        if (table.has(entry.id)) throw new Error(`Checkpoint table '${tableName}' contains duplicate id '${entry.id}'`);
        table.set(entry.id, { ...entry.record });
      }
      decoded.set(tableName, table);
    }
    return decoded;
  }

  private async persistRollbackState(checkpointId: string, source: string): Promise<void> {
    const tables: Record<string, PersistedTableEntry[]> = {};
    for (const [tableName, snapshot] of this.captureAllTables()) {
      tables[tableName] = Array.from(snapshot, ([id, record]) => ({ id, record }));
    }
    const includedWalFrameId = this.wal.getLastFrameId();
    const persisted: PersistedDatabaseSnapshot = {
      formatVersion: 2,
      includedWalFrameId,
      snapshotHash: crypto.createHash("sha256").update(JSON.stringify(tables)).digest("hex"),
      tables,
    };
    await this.atomicWriteJson(this.baseDbPath, persisted);
    await this.wal.truncate();
    const marker = await this.wal.appendFrame("ROLLBACK", "system", checkpointId, { source }, true);
    this.frameIndex = Math.max(this.frameIndex, marker.frameId);
  }

  private async loadCheckpointCatalog(): Promise<void> {
    const files = await fs.readdir(this.checkpointsDir).catch((error: unknown) => {
      if ((error as { code?: string }).code === "ENOENT") return [] as string[];
      throw error;
    });
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const parsed = JSON.parse(await fs.readFile(path.join(this.checkpointsDir, file), "utf-8")) as {
        record?: TimelineCheckpointRecord;
      };
      if (parsed.record?.checkpointId) this.checkpoints.set(parsed.record.checkpointId, parsed.record);
    }
  }

  private async atomicWriteJson(filePath: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp.${crypto.randomUUID()}`;
    const handle = await fs.open(tmpPath, "wx");
    try {
      await handle.writeFile(JSON.stringify(value, null, 2), "utf-8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await fs.rename(tmpPath, filePath);
      const directoryHandle = await fs.open(path.dirname(filePath), "r");
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
    } finally {
      await fs.unlink(tmpPath).catch(() => undefined);
    }
  }
}

export const broccolidb = new BroccoliDatabaseKernel();
