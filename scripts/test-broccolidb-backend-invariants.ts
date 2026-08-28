import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BroccoliBTreeIndexEngine,
  BroccoliCASStorageService,
  BroccoliCdcStream,
  BroccoliConnectionPool,
  BroccoliDatabaseKernel,
  BroccoliLockAuthority,
  BroccoliLsmStore,
  BroccoliMaterializedViewEngine,
  BroccoliMvccEngine,
  BroccoliRaftConsensusEngine,
  BroccoliSagaOrchestrator,
  BroccoliSparseIndexEngine,
  BroccoliTieredKvCache,
  BroccoliTwoPhaseCommitCoordinator,
  BroccoliVectorAnnEngine,
  BroccoliWriteAheadLog,
  CdcHistoryGapError,
  WalIntegrityError,
  type IBroccoli2pcParticipant,
} from "../src/core/broccolidb";

async function withTempDirectory<T>(fn: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "broccolidb-invariants-"));
  try {
    return await fn(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function testDurableCheckpointRecoveryAndRollback(): Promise<void> {
  await withTempDirectory(async (workspaceRoot) => {
    const first = new BroccoliDatabaseKernel({ workspaceRoot, walDebounceMs: 1 });
    await first.start();
    const table = first.getTable<{ value: string }>("keyless_records");
    table.put("external-key", { value: "before" });
    let checkpointCompleted = false;
    const checkpointPromise = first.checkpoint("known-good").finally(() => {
      checkpointCompleted = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (!checkpointCompleted) {
      assert.throws(
        () => table.put("racing-write", { value: "must-not-enter-rotation-window" }),
        /mutations are paused/
      );
    }
    const checkpoint = await checkpointPromise;
    table.put("external-key", { value: "after" });
    table.put("new-key", { value: "new" });
    await first.stop();

    const recovered = new BroccoliDatabaseKernel({ workspaceRoot, walDebounceMs: 1 });
    await recovered.start();
    const recoveredTable = recovered.getTable<{ value: string }>("keyless_records");
    assert.deepEqual(recoveredTable.get("external-key"), { value: "after" });
    assert.deepEqual(recoveredTable.get("new-key"), { value: "new" });
    assert.equal(recovered.listCheckpoints().some((item) => item.checkpointId === checkpoint.checkpointId), true);

    await assert.rejects(() =>
      recovered.transaction(async () => {
        recoveredTable.put("external-key", { value: "transaction-must-rollback" });
        recovered.getTable<{ value: string }>("created-in-failed-transaction").put("temp", { value: "temp" });
        throw new Error("abort transaction");
      })
    );
    assert.deepEqual(recoveredTable.get("external-key"), { value: "after" });
    assert.equal(recovered.getTable("created-in-failed-transaction").count(), 0);
    await recovered.stop();

    const afterFailedTransaction = new BroccoliDatabaseKernel({ workspaceRoot, walDebounceMs: 1 });
    await afterFailedTransaction.start();
    const afterFailedTable = afterFailedTransaction.getTable<{ value: string }>("keyless_records");
    assert.deepEqual(afterFailedTable.get("external-key"), { value: "after" });
    assert.equal(afterFailedTransaction.getTable("created-in-failed-transaction").count(), 0);
    assert.equal(await afterFailedTransaction.rollback(checkpoint.checkpointId), true);
    assert.deepEqual(afterFailedTable.get("external-key"), { value: "before" });
    assert.equal(afterFailedTable.get("new-key"), undefined);
    await afterFailedTransaction.stop();

    const rolledBack = new BroccoliDatabaseKernel({ workspaceRoot, walDebounceMs: 1 });
    await rolledBack.start();
    const rolledBackTable = rolledBack.getTable<{ value: string }>("keyless_records");
    assert.deepEqual(rolledBackTable.get("external-key"), { value: "before" });
    assert.equal(rolledBackTable.get("new-key"), undefined, "rollback must survive restart");
    await rolledBack.stop();
  });
}

async function testWalChainContinuity(): Promise<void> {
  await withTempDirectory(async (workspaceRoot) => {
    const wal = new BroccoliWriteAheadLog(workspaceRoot, 0);
    await wal.start();
    await wal.appendFrame("INSERT", "t", "1", { value: 1 }, true);
    await wal.appendFrame("INSERT", "t", "2", { value: 2 }, true);
    await wal.stop();

    const walPath = join(workspaceRoot, ".broccolidb", "wal.log");
    const frames = (await readFile(walPath, "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    frames[1].previousFrameHash = "0".repeat(64);
    const payload = JSON.stringify(frames[1].payload ?? {});
    frames[1].checksum = createHash("sha256")
      .update(
        `${frames[1].frameId}:${frames[1].timestamp}:${frames[1].op}:${frames[1].table}:${frames[1].recordId}:${payload}:${frames[1].previousFrameHash}`
      )
      .digest("hex");
    await writeFile(walPath, `${frames.map((frame) => JSON.stringify(frame)).join("\n")}\n`, "utf-8");

    const verifier = new BroccoliWriteAheadLog(workspaceRoot, 0);
    await assert.rejects(() => verifier.start(), WalIntegrityError);
  });
}

async function testCoordinationInvariants(): Promise<void> {
  const locks = new BroccoliLockAuthority();
  const firstShared = await locks.acquireLock("resource", "reader-a", "SHARED");
  const secondShared = await locks.acquireLock("resource", "reader-b", "SHARED");
  assert.equal(locks.getActiveLocks().length, 2);
  await assert.rejects(() => locks.acquireLock("resource", "writer", "EXCLUSIVE"));
  locks.releaseLock(firstShared.lockId);
  locks.releaseLock(secondShared.lockId);

  const preexisting = await locks.acquireLock("a", "owner", "EXCLUSIVE");
  await locks.acquireLock("b", "other", "EXCLUSIVE");
  await assert.rejects(() => locks.acquireAll(["a", "b"], "owner", "EXCLUSIVE"));
  assert.equal(locks.getActiveLocks().some((lock) => lock.lockId === preexisting.lockId), true);

  const pool = new BroccoliConnectionPool({ maxTotalLeases: 2, maxConcurrentWrites: 1, defaultTimeoutMs: 100 });
  const activeWriter = await pool.acquire("active", "EXCLUSIVE_WRITE", 100);
  const resolutionOrder: string[] = [];
  const queuedWriter = pool.acquire("queued-writer", "EXCLUSIVE_WRITE", 100).then((lease) => {
    resolutionOrder.push("writer");
    return lease;
  });
  const queuedReader = pool.acquire("queued-reader", "SHARED_READ", 100).then((lease) => {
    resolutionOrder.push("reader");
    return lease;
  });
  activeWriter.release();
  const [writerLease, readerLease] = await Promise.all([queuedWriter, queuedReader]);
  assert.deepEqual(resolutionOrder, ["writer", "reader"], "a new reader must not jump a queued writer");
  writerLease.release();
  readerLease.release();
}

function testMvccAndIndexInvariants(): void {
  const mvcc = new BroccoliMvccEngine();
  const seed = mvcc.beginTransaction();
  mvcc.writeRecord("t", "row", { value: "seed" }, seed.txId);
  assert.equal(mvcc.commitTransaction(seed.txId), true);
  const first = mvcc.beginTransaction();
  const second = mvcc.beginTransaction();
  mvcc.writeRecord("t", "row", { value: "first" }, first.txId);
  mvcc.writeRecord("t", "row", { value: "second" }, second.txId);
  assert.equal(mvcc.commitTransaction(first.txId), true);
  assert.equal(mvcc.commitTransaction(second.txId), false, "snapshot write conflict must abort the loser");

  const sparse = new BroccoliSparseIndexEngine();
  sparse.buildSparseIndex("docs", [{ id: "1", indexed: "x", unindexed: "needle" }], ["indexed"], 1);
  const sparseResult = sparse.pruneBlocks("docs", { unindexed: "needle" });
  assert.deepEqual(sparseResult.matchedRecordIds, ["1"], "unindexed predicates cannot drive Bloom pruning");

  const tree = new BroccoliBTreeIndexEngine<number>(4);
  for (let key = 1; key <= 50; key++) tree.insert(key, key * 10);
  for (let key = 1; key <= 50; key += 2) assert.equal(tree.delete(key), true);
  for (let key = 2; key <= 50; key += 2) assert.equal(tree.search(key), key * 10);
  assert.equal(tree.rangeScan(1, 50).length, 25);
}

async function testLsmTombstonesAndCacheSingleFlight(): Promise<void> {
  const lsm = new BroccoliLsmStore(1);
  lsm.put("target", "old");
  lsm.put("seed", "value");
  await lsm.compact(0);
  assert.equal(lsm.delete("target"), true);
  lsm.put("other", "value");
  await lsm.compact(0);
  assert.equal(lsm.get("target"), undefined, "compaction must not resurrect an older value");

  const cache = new BroccoliTieredKvCache(10);
  let fetchCount = 0;
  let releaseFetch!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseFetch = resolve;
  });
  const fetcher = async () => {
    fetchCount++;
    await gate;
    return { value: 42 };
  };
  const requests = Array.from({ length: 20 }, () => cache.get("same-key", fetcher));
  releaseFetch();
  const results = await Promise.all(requests);
  assert.equal(fetchCount, 1, "cache misses for one key must be single-flight coalesced");
  assert.equal(results.every((result) => result?.value === 42), true);
}

async function testWorkflowFailureStates(): Promise<void> {
  const participant: IBroccoli2pcParticipant = {
    participantId: "commits",
    prepare: async () => true,
    commit: async () => undefined,
    rollback: async () => undefined,
  };
  const failing: IBroccoli2pcParticipant = {
    participantId: "fails-commit",
    prepare: async () => true,
    commit: async () => {
      throw new Error("commit transport failed");
    },
    rollback: async () => undefined,
  };
  const coordinator = new BroccoliTwoPhaseCommitCoordinator();
  coordinator.registerParticipant(participant);
  coordinator.registerParticipant(failing);
  assert.throws(() => coordinator.begin2pcTransaction("missing", ["unknown"]));
  coordinator.begin2pcTransaction("heuristic", [participant.participantId, failing.participantId]);
  assert.equal(await coordinator.execute2pc("heuristic"), false);
  assert.equal(coordinator.getTransaction("heuristic")?.state, "HEURISTIC");

  const saga = new BroccoliSagaOrchestrator();
  const sagaResult = await saga.executeSaga("compensation-failure", { executed: false }, [
    {
      stepName: "one",
      execute: async (context) => {
        context.executed = true;
      },
      compensate: async () => {
        throw new Error("manual repair required");
      },
    },
    {
      stepName: "two",
      execute: async () => {
        throw new Error("forward failure");
      },
      compensate: async () => undefined,
    },
  ]);
  assert.equal(sagaResult.state, "FAILED");
  assert.equal(sagaResult.compensationErrors?.length, 1);
}

function testStreamingVectorAndViewInvariants(): void {
  const view = new BroccoliMaterializedViewEngine();
  view.createView({
    viewName: "minimum",
    sourceTable: "numbers",
    aggregateField: "value",
    aggregateFunc: "MIN",
  });
  view.applyMutation("numbers", "INSERT", undefined, { value: 1 });
  view.applyMutation("numbers", "INSERT", undefined, { value: 9 });
  view.applyMutation("numbers", "DELETE", { value: 1 }, undefined);
  assert.equal(view.getViewRow("minimum", "global")?.aggregateValue, 9);

  const vectors = new BroccoliVectorAnnEngine();
  const source = new Float64Array([1, 0]);
  vectors.insertVector("space", "one", source);
  source[0] = 0;
  source[1] = 1;
  assert.equal(vectors.searchNearest("space", [1, 0], 1)[0].score, 1, "inserted vectors must not alias caller memory");
  assert.throws(() => vectors.insertVector("space", "bad-dim", [1, 2, 3]), RangeError);

  const cdc = new BroccoliCdcStream(2);
  cdc.emitEvent("t", "INSERT", "1");
  cdc.emitEvent("t", "INSERT", "2");
  cdc.emitEvent("t", "INSERT", "3");
  assert.throws(() => cdc.getEvents(1), CdcHistoryGapError);

  const follower = new BroccoliRaftConsensusEngine("follower", ["leader", "follower"]);
  const rejected = follower.appendEntries({
    term: 1,
    leaderId: "leader",
    prevLogIndex: 0,
    prevLogTerm: 0,
    entries: [{ index: 2, term: 1, command: "gap", timestamp: 1 }],
    leaderCommit: 0,
  });
  assert.equal(rejected.success, false, "Raft must reject non-contiguous log entries");
}

async function testCasPathValidation(): Promise<void> {
  await withTempDirectory(async (workspaceRoot) => {
    const cas = new BroccoliCASStorageService(workspaceRoot);
    await cas.start();
    await assert.rejects(() => cas.read("../../outside"), TypeError);
    await assert.rejects(() => cas.exists("not-a-sha256"), TypeError);
    await cas.stop();
  });
}

async function run(): Promise<void> {
  await testDurableCheckpointRecoveryAndRollback();
  await testWalChainContinuity();
  await testCoordinationInvariants();
  testMvccAndIndexInvariants();
  await testLsmTombstonesAndCacheSingleFlight();
  await testWorkflowFailureStates();
  testStreamingVectorAndViewInvariants();
  await testCasPathValidation();
  console.log("BroccoliDB backend invariant regression suite passed.");
}

run().catch((error) => {
  console.error("BroccoliDB backend invariant regression suite failed:", error);
  process.exitCode = 1;
});
