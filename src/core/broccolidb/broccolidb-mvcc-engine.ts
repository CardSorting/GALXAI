/**
 * GALXAI: BroccoliMvccEngine (Zenith Tier)
 *
 * Multi-Version Concurrency Control (MVCC) Engine with Snapshot Isolation for BroccoliDB.
 * Allows readers and writers to operate concurrently without blocking, maintaining immutable version chains and vacuuming dead tuples.
 */

import type {
  BroccoliMvccTransaction,
  BroccoliRecordVersion,
  IBroccoliMvccEngine,
} from "./broccolidb.contracts";

interface InternalTransaction extends BroccoliMvccTransaction {
  status: "ACTIVE" | "COMMITTED" | "ROLLED_BACK";
  writtenRecords: { table: string; recordId: string }[];
  readonly snapshotCommitSeq: number;
  commitSeq?: number;
}

interface InternalVersion extends BroccoliRecordVersion<Record<string, unknown>> {
  commitSeq?: number;
}

export class BroccoliMvccEngine implements IBroccoliMvccEngine {
  private currentTxSeq = 0;
  private currentCommitSeq = 0;
  private readonly transactions = new Map<number, InternalTransaction>();
  // table -> recordId -> version chain (newest to oldest)
  private readonly versionChains = new Map<string, Map<string, InternalVersion[]>>();

  public beginTransaction(
    isolationLevel: "SNAPSHOT_ISOLATION" | "READ_COMMITTED" = "SNAPSHOT_ISOLATION"
  ): BroccoliMvccTransaction {
    const txId = ++this.currentTxSeq;
    const tx: InternalTransaction = {
      txId,
      startedAt: Date.now(),
      isolationLevel,
      status: "ACTIVE",
      writtenRecords: [],
      snapshotCommitSeq: this.currentCommitSeq,
    };
    this.transactions.set(txId, tx);
    return tx;
  }

  public commitTransaction(txId: number): boolean {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== "ACTIVE") return false;

    if (tx.isolationLevel === "SNAPSHOT_ISOLATION") {
      for (const item of tx.writtenRecords) {
        const chain = this.versionChains.get(item.table)?.get(item.recordId) ?? [];
        const hasWriteConflict = chain.some(
          (version) =>
            version.txId !== txId &&
            version.commitSeq !== undefined &&
            version.commitSeq > tx.snapshotCommitSeq
        );
        if (hasWriteConflict) {
          this.rollbackTransaction(txId);
          return false;
        }
      }
    }

    const commitSeq = ++this.currentCommitSeq;
    tx.commitSeq = commitSeq;
    tx.status = "COMMITTED";
    for (const item of tx.writtenRecords) {
      const chain = this.versionChains.get(item.table)?.get(item.recordId) ?? [];
      const version = chain.find((candidate) => candidate.txId === txId);
      if (version) version.commitSeq = commitSeq;
    }
    return true;
  }

  public rollbackTransaction(txId: number): boolean {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== "ACTIVE") return false;

    tx.status = "ROLLED_BACK";

    // Remove uncommitted versions created by this tx
    for (const item of tx.writtenRecords) {
      const tableMap = this.versionChains.get(item.table);
      if (!tableMap) continue;
      const chain = tableMap.get(item.recordId);
      if (!chain) continue;

      const filtered = chain.filter((v) => v.txId !== txId);
      if (filtered.length === 0) {
        tableMap.delete(item.recordId);
      } else {
        tableMap.set(item.recordId, filtered);
      }
    }

    return true;
  }

  public readRecord<T extends Record<string, unknown>>(
    table: string,
    recordId: string,
    txId: number
  ): T | undefined {
    const tableMap = this.versionChains.get(table);
    if (!tableMap) return undefined;

    const chain = tableMap.get(recordId);
    if (!chain || chain.length === 0) return undefined;

    const reader = this.transactions.get(txId);
    if (!reader || reader.status !== "ACTIVE") {
      throw new Error(`Cannot read from inactive or unknown transaction ${txId}`);
    }

    for (const version of chain) {
      // 1. If created by current transaction
      if (version.txId === txId) {
        if (version.isDeleted) return undefined;
        return version.data ? ({ ...version.data } as T) : undefined;
      }

      const isVisible =
        version.commitSeq !== undefined &&
        (reader.isolationLevel === "READ_COMMITTED" || version.commitSeq <= reader.snapshotCommitSeq);
      if (isVisible) {
        if (version.isDeleted) return undefined;
        return version.data ? ({ ...version.data } as T) : undefined;
      }
    }

    return undefined;
  }

  public writeRecord<T extends Record<string, unknown>>(
    table: string,
    recordId: string,
    data: T,
    txId: number
  ): void {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== "ACTIVE") {
      throw new Error(`Cannot write to inactive transaction ${txId}`);
    }

    if (!this.versionChains.has(table)) {
      this.versionChains.set(table, new Map());
    }

    const tableMap = this.versionChains.get(table)!;
    if (!tableMap.has(recordId)) {
      tableMap.set(recordId, []);
    }

    const chain = tableMap.get(recordId)!;
    const priorOwnVersion = chain.findIndex((version) => version.txId === txId);
    if (priorOwnVersion !== -1) chain.splice(priorOwnVersion, 1);

    const newVersion: InternalVersion = {
      recordId,
      txId,
      createdAt: Date.now(),
      isDeleted: false,
      data: { ...data },
    };

    chain.unshift(newVersion);
    if (!tx.writtenRecords.some((item) => item.table === table && item.recordId === recordId)) {
      tx.writtenRecords.push({ table, recordId });
    }
  }

  public deleteRecord(table: string, recordId: string, txId: number): void {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== "ACTIVE") {
      throw new Error(`Cannot delete in inactive transaction ${txId}`);
    }

    if (this.readRecord(table, recordId, txId) === undefined) return;
    const tableMap = this.versionChains.get(table)!;
    const chain = tableMap.get(recordId)!;
    const priorOwnVersion = chain.findIndex((version) => version.txId === txId);
    if (priorOwnVersion !== -1) chain.splice(priorOwnVersion, 1);

    const deleteVersion: InternalVersion = {
      recordId,
      txId,
      createdAt: Date.now(),
      isDeleted: true,
    };

    chain.unshift(deleteVersion);
    if (!tx.writtenRecords.some((item) => item.table === table && item.recordId === recordId)) {
      tx.writtenRecords.push({ table, recordId });
    }
  }

  public vacuum(minActiveTxId?: number): number {
    const threshold = minActiveTxId ?? this.currentTxSeq + 1;
    const activeSnapshots = Array.from(this.transactions.values()).filter(
      (tx) => tx.status === "ACTIVE" && tx.isolationLevel === "SNAPSHOT_ISOLATION"
    );
    let purgedCount = 0;

    for (const tableMap of this.versionChains.values()) {
      for (const [recordId, chain] of Array.from(tableMap.entries())) {
        const required = new Set<InternalVersion>();
        for (const version of chain) {
          if (version.commitSeq === undefined) required.add(version);
        }
        const newestCommitted = chain.find((version) => version.commitSeq !== undefined);
        if (newestCommitted) required.add(newestCommitted);
        for (const snapshot of activeSnapshots) {
          const visible = chain.find(
            (version) => version.commitSeq !== undefined && version.commitSeq <= snapshot.snapshotCommitSeq
          );
          if (visible) required.add(visible);
        }

        const retained = chain.filter((version) => {
          const keep = required.has(version) || version.txId >= threshold;
          if (!keep) purgedCount++;
          return keep;
        });

        if (
          retained.length === 0 ||
          (activeSnapshots.length === 0 && retained.length === 1 && retained[0].isDeleted)
        ) {
          tableMap.delete(recordId);
        } else {
          tableMap.set(recordId, retained);
        }
      }
    }

    return purgedCount;
  }

  public getActiveTransactions(): readonly BroccoliMvccTransaction[] {
    return Array.from(this.transactions.values()).filter((t) => t.status === "ACTIVE");
  }
}
