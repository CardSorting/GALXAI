/**
 * GALXAI: BroccoliDB Write-Ahead Log (WAL) Engine (Zenith Tier)
 * Append-Only Write-Ahead Log with Micro-Batched Coalescing,
 * Cryptographic Frame Chaining, and Crash-Safe Replay.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { WalFrame, WalOperationType } from "./broccolidb.contracts";
import { ReentrantAsyncMutex } from "./broccolidb-mutex";

const WAL_OPERATIONS = new Set<WalOperationType>([
  "INSERT",
  "UPDATE",
  "DELETE",
  "CLEAR",
  "CHECKPOINT",
  "ROLLBACK",
  "BRANCH_MERGE",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export class WalIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WalIntegrityError";
  }
}

export class BroccoliWriteAheadLog {
  private readonly walPath: string;
  private readonly walDir: string;
  private readonly mutex = new ReentrantAsyncMutex("broccolidb-wal-mutex");
  private writeBuffer: WalFrame[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private nextFrameId = 1;
  private lastFrameHash = "0000000000000000000000000000000000000000000000000000000000000000";
  private totalFramesLogged = 0;
  private lastSyncTimestamp = 0;
  private isStarted = false;
  private lastFlushError: Error | null = null;

  private readonly debounceMs: number;

  constructor(workspaceRoot: string = process.cwd(), debounceMs: number = 20) {
    if (!Number.isSafeInteger(debounceMs) || debounceMs < 0) {
      throw new RangeError("debounceMs must be a non-negative integer");
    }
    this.debounceMs = debounceMs;
    this.walDir = path.resolve(workspaceRoot, ".broccolidb");
    this.walPath = path.join(this.walDir, "wal.log");
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    await fs.mkdir(this.walDir, { recursive: true });
    this.isStarted = true;
    try {
      await this.replay();
    } catch (error) {
      this.isStarted = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.flush();
    this.isStarted = false;
  }

  /**
   * Appends an operation frame to the Write-Ahead Log.
   */
  async appendFrame(
    op: WalOperationType,
    table: string,
    recordId: string,
    payload?: Record<string, unknown>,
    synchronous: boolean = false
  ): Promise<WalFrame> {
    if (!table.trim() || !recordId.trim()) throw new TypeError("table and recordId must be non-empty");
    let serializedPayload: string;
    try {
      serializedPayload = JSON.stringify(payload ?? {});
    } catch (error) {
      throw new TypeError("WAL payload must be JSON serializable", { cause: error });
    }
    const frameId = this.nextFrameId++;
    const timestamp = Date.now();
    const previousFrameHash = this.lastFrameHash;

    const contentForHash = `${frameId}:${timestamp}:${op}:${table}:${recordId}:${serializedPayload}:${previousFrameHash}`;
    const checksum = crypto.createHash("sha256").update(contentForHash).digest("hex");
    this.lastFrameHash = checksum;

    const frame: WalFrame = {
      frameId,
      timestamp,
      op,
      table,
      recordId,
      payload,
      checksum,
      previousFrameHash,
    };

    this.writeBuffer.push(frame);
    this.totalFramesLogged += 1;

    if (synchronous) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }

    return frame;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush().catch((error: unknown) => {
        this.lastFlushError = error instanceof Error ? error : new Error(String(error));
      });
    }, this.debounceMs);
  }

  /**
   * Flushes all buffered frames to disk in a single sequential append.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.writeBuffer.length === 0) return;

    await this.mutex.runLocked(async () => {
      if (this.writeBuffer.length === 0) return;
      const batch = this.writeBuffer;
      this.writeBuffer = [];

      const serializedLines = batch.map((f) => JSON.stringify(f)).join("\n") + "\n";
      try {
        await fs.mkdir(path.dirname(this.walPath), { recursive: true });
        const handle = await fs.open(this.walPath, "a");
        try {
          await handle.writeFile(serializedLines, "utf-8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        this.lastSyncTimestamp = Date.now();
        this.lastFlushError = null;
      } catch (error) {
        this.writeBuffer = [...batch, ...this.writeBuffer];
        this.lastFlushError = error instanceof Error ? error : new Error(String(error));
        throw error;
      }
    });
  }

  /**
   * Replays all frames from the WAL file.
   */
  async replay(): Promise<readonly WalFrame[]> {
    await this.flush();

    let rawContent: string;
    try {
      rawContent = await fs.readFile(this.walPath, "utf-8");
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "ENOENT") return [];
      throw err;
    }

    const lines = rawContent.split("\n").filter((l) => l.trim().length > 0);
    const frames: WalFrame[] = [];
    let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
    let previousFrameId = 0;

    for (let i = 0; i < lines.length; i++) {
      let frame: WalFrame;
      try {
        frame = JSON.parse(lines[i]) as WalFrame;
      } catch (err) {
        throw new WalIntegrityError(`Corrupted WAL frame JSON at line ${i + 1}`, { cause: err });
      }

      if (
        !Number.isSafeInteger(frame.frameId) ||
        frame.frameId <= previousFrameId ||
        !Number.isSafeInteger(frame.timestamp) ||
        !WAL_OPERATIONS.has(frame.op) ||
        typeof frame.table !== "string" ||
        frame.table.length === 0 ||
        typeof frame.recordId !== "string" ||
        frame.recordId.length === 0 ||
        !SHA256_PATTERN.test(frame.checksum) ||
        !SHA256_PATTERN.test(frame.previousFrameHash ?? "") ||
        (frame.payload !== undefined &&
          (frame.payload === null || typeof frame.payload !== "object" || Array.isArray(frame.payload)))
      ) {
        throw new WalIntegrityError(`Invalid WAL frame schema or ordering at line ${i + 1}`);
      }
      if ((frame.previousFrameHash ?? expectedPrevHash) !== expectedPrevHash) {
        throw new WalIntegrityError(
          `WAL chain discontinuity at frame ${frame.frameId} (line ${i + 1})`
        );
      }

      const contentForHash = `${frame.frameId}:${frame.timestamp}:${frame.op}:${frame.table}:${frame.recordId}:${JSON.stringify(frame.payload ?? {})}:${frame.previousFrameHash ?? expectedPrevHash}`;
      const computedHash = crypto.createHash("sha256").update(contentForHash).digest("hex");

      if (computedHash !== frame.checksum) {
        throw new WalIntegrityError(
          `WAL checksum mismatch at frame ${frame.frameId} (line ${i + 1}). Expected ${frame.checksum}, computed ${computedHash}`
        );
      }

      expectedPrevHash = frame.checksum;
      previousFrameId = frame.frameId;
      frames.push(frame);
      if (frame.frameId >= this.nextFrameId) {
        this.nextFrameId = frame.frameId + 1;
      }
      this.lastFrameHash = frame.checksum;
    }

    return frames;
  }

  /**
   * Safely truncates/rotates the WAL log after an atomic checkpoint has been persisted.
   */
  async truncate(): Promise<void> {
    await this.flush();
    await this.mutex.runLocked(async () => {
      await fs.mkdir(this.walDir, { recursive: true });
      const tmpPath = `${this.walPath}.truncate.${crypto.randomUUID()}`;
      const handle = await fs.open(tmpPath, "wx");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(tmpPath, this.walPath);
      this.lastFrameHash = "0000000000000000000000000000000000000000000000000000000000000000";
    });
  }

  getMetrics(): {
    totalFramesLogged: number;
    uncommittedFrames: number;
    lastSyncTimestamp: number;
    walPath: string;
    lastFlushError: Error | null;
  } {
    return {
      totalFramesLogged: this.totalFramesLogged,
      uncommittedFrames: this.writeBuffer.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      walPath: this.walPath,
      lastFlushError: this.lastFlushError,
    };
  }

  getLastFrameId(): number {
    return this.nextFrameId - 1;
  }
}
