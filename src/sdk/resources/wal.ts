/**
 * GALXAI Developer SDK: Write-Ahead Log (WAL) Audit Resource
 * Provides cryptographic tamper-evident verification of BroccoliDB's append-only,
 * SHA-256 chained transaction log for enterprise compliance (SOC-2, HIPAA, FedRAMP).
 */

import { BroccoliDatabaseKernel, broccolidb } from '../../core/broccolidb/broccolidb-kernel';
import type { WalFrame } from '../../core/broccolidb/broccolidb.contracts';
import { WalIntegrityError } from '../../core/broccolidb/broccolidb-wal';

export interface WalVerificationReport {
  valid: boolean;
  framesCount: number;
  lastFrameHash?: string;
  error?: string;
}

export class WalResource {
  private readonly kernel: BroccoliDatabaseKernel;

  constructor(kernel: BroccoliDatabaseKernel = broccolidb) {
    this.kernel = kernel;
  }

  /**
   * Replays and cryptographically verifies the SHA-256 frame hash chain.
   * Throws `WalIntegrityError` if any tampering, frame mutation, or chain discontinuity is detected.
   */
  public async replay(): Promise<readonly WalFrame[]> {
    return this.kernel.getWal().replay();
  }

  /**
   * Verifies the cryptographic integrity of the append-only transaction log.
   * Returns a clean structured verification report without throwing.
   *
   * @example
   * ```typescript
   * const report = await galx.wal.verifyIntegrity();
   * console.log(report.valid, report.framesCount);
   * ```
   */
  public async verifyIntegrity(): Promise<WalVerificationReport> {
    try {
      const frames = await this.replay();
      const lastHash = frames.length > 0 ? frames[frames.length - 1].checksum : undefined;
      return {
        valid: true,
        framesCount: frames.length,
        lastFrameHash: lastHash
      };
    } catch (err: any) {
      return {
        valid: false,
        framesCount: 0,
        error: err.message || String(err)
      };
    }
  }

  /**
   * Retrieves operational metrics on the write-ahead log buffer and synchronization state.
   */
  public getMetrics() {
    return this.kernel.getWal().getMetrics();
  }

  /**
   * Exports the entire cryptographic audit trail in newline-delimited JSON (JSONL) format
   * for streaming into enterprise SIEM (Splunk, Datadog) or cold compliance vaults.
   */
  public async exportJsonl(): Promise<string> {
    const frames = await this.replay();
    return frames.map(f => JSON.stringify(f)).join('\n');
  }
}
