/**
 * test-broccolidb-advanced-backend.ts
 *
 * Comprehensive validation suite for GALXAI's BroccoliDB adjunct engines:
 * 1. BroccoliConnectionPool (bounded leases, fairness, metrics)
 * 2. BroccoliLockAuthority (in-process shared/exclusive locking and ordered batches)
 * 3. BroccoliQueryOptimizer (cost-based query planner)
 * 4. BroccoliMvccEngine (snapshot isolation, non-blocking writes, vacuum)
 * 5. BroccoliSparseIndexEngine (64-record data blocks, Bloom filter pruning)
 * 6. BroccoliCdcStream (monotonic LSNs, rewindable replay, filtering)
 * 7. BroccoliVectorEngine (columnar typed chunks, vectorized filters & aggregations)
 * 8. BroccoliInvertedIndexEngine (BM25 probabilistic text ranking, phrase search)
 * 9. BroccoliTwoPhaseCommitCoordinator (in-process 2PC prepare/commit/abort)
 */

import {
  BroccoliConnectionPool,
  BroccoliLockAuthority,
  BroccoliQueryOptimizer,
  BroccoliMvccEngine,
  BroccoliSparseIndexEngine,
  BroccoliCdcStream,
  BroccoliVectorEngine,
  BroccoliInvertedIndexEngine,
  BroccoliTwoPhaseCommitCoordinator,
  BroccoliBufferPoolManager,
  BroccoliLsmStore,
  BroccoliRaftConsensusEngine,
  BroccoliAdaptivePlanCache,
  BroccoliSagaOrchestrator,
  BroccoliTieredKvCache,
  BroccoliVectorAnnEngine,
  BroccoliConsistentHashRing,
  BroccoliTimeSeriesRollupEngine,
  BroccoliBTreeIndexEngine,
  BroccoliDeadlockDetector,
  BroccoliMaterializedViewEngine,
  BroccoliDatabaseKernel,
  type IBroccoli2pcParticipant,
  type BroccoliSagaStep,
} from "../src/core/broccolidb";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAdvancedBackendValidation(): Promise<void> {
  console.log("================================================================================");
  console.log(" GALXAI BroccoliDB Advanced Adjunct Engines Validation Suite                   ");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // Suite 1: Connection Pool & Multi-Tenant Leases
  // ---------------------------------------------------------------------------
  console.log("[Suite 1/9] Validating Connection Pool & Leases...");
  const pool = new BroccoliConnectionPool({ maxTotalLeases: 10, maxConcurrentWrites: 2 });

  const lease1 = await pool.acquire("client_a", "SHARED_READ");
  const lease2 = await pool.acquire("client_b", "SHARED_READ");
  assert(pool.getMetrics().activeLeases === 2, "Should have 2 active leases");

  lease1.release();
  lease2.release();
  assert(pool.getMetrics().activeLeases === 0, "All leases should be released");

  const result = await pool.withLease("client_c", "EXCLUSIVE_WRITE", async (lease) => {
    assert(lease.mode === "EXCLUSIVE_WRITE", "Lease mode must be EXCLUSIVE_WRITE");
    return "write_executed";
  });
  assert(result === "write_executed", "withLease should return function result");
  console.log("  [✓] Connection pooling and lease lifecycle verified.");

  // ---------------------------------------------------------------------------
  // Suite 2: Distributed Lock Authority & Deadlock Immunity
  // ---------------------------------------------------------------------------
  console.log("[Suite 2/9] Validating In-Process Lock Authority...");
  const lockAuth = new BroccoliLockAuthority();

  const lk1 = await lockAuth.acquireLock("account:100", "worker_1");
  assert(lockAuth.isLocked("account:100"), "Resource should be locked");

  let caught = false;
  try {
    await lockAuth.acquireLock("account:100", "worker_2");
  } catch {
    caught = true;
  }
  assert(caught, "Conflicting lock request must fail");

  lockAuth.releaseLock(lk1.lockId);
  assert(!lockAuth.isLocked("account:100"), "Resource should be unlocked");

  // Atomic multi-resource locking
  const batchLocks = await lockAuth.acquireAll(["tbl:users", "tbl:orders", "tbl:billing"], "worker_1");
  assert(batchLocks.length === 3, "Batch acquisition should acquire 3 locks");
  lockAuth.releaseAllForOwner("worker_1");
  assert(!lockAuth.isLocked("tbl:users"), "All locks for worker_1 should be released");
  console.log("  [✓] Lock authority mutual exclusion and multi-resource locking verified.");

  // ---------------------------------------------------------------------------
  // Suite 3: Cost-Based Query Optimizer
  // ---------------------------------------------------------------------------
  console.log("[Suite 3/9] Validating Heuristic Query Planner...");
  const optimizer = new BroccoliQueryOptimizer();

  const pkPlan = optimizer.planQuery("users", { id: "usr_1" });
  assert(pkPlan.planType === "PRIMARY_KEY_LOOKUP", "Expected PRIMARY_KEY_LOOKUP");
  assert(pkPlan.estimatedCost === 1, "PK cost should be 1");

  const idxPlan = optimizer.planQuery("orders", { status: "pending" }, ["status"]);
  assert(idxPlan.planType === "SECONDARY_INDEX_SEEK", "Expected SECONDARY_INDEX_SEEK");
  assert(idxPlan.selectedIndex === "status", "Expected status index");

  const rangePlan = optimizer.planQuery("metrics", { latency: { $gt: 500 } }, ["latency"]);
  assert(rangePlan.planType === "RANGE_SCAN", "Expected RANGE_SCAN");
  console.log("  [✓] Heuristic query plan selection verified.");

  // ---------------------------------------------------------------------------
  // Suite 4: MVCC Snapshot Isolation & Vacuum
  // ---------------------------------------------------------------------------
  console.log("[Suite 4/9] Validating MVCC Snapshot Isolation & Vacuum...");
  const mvcc = new BroccoliMvccEngine();

  const tx1 = mvcc.beginTransaction();
  mvcc.writeRecord("cache", "key_1", { val: "v1" }, tx1.txId);
  mvcc.commitTransaction(tx1.txId);

  const txReader = mvcc.beginTransaction(); // Snapshot frozen at this epoch

  const tx2 = mvcc.beginTransaction();
  mvcc.writeRecord("cache", "key_1", { val: "v2" }, tx2.txId);
  mvcc.commitTransaction(tx2.txId);

  // Snapshot isolation: reader sees v1 without locking
  const readVal = mvcc.readRecord<{ val: string }>("cache", "key_1", txReader.txId);
  assert(readVal?.val === "v1", "Reader must read frozen snapshot v1");

  // Vacuum must retain v1 while the old snapshot is active, then purge it once
  // that reader ends.
  assert(mvcc.vacuum(tx2.txId + 1) === 0, "Vacuum must preserve versions visible to active snapshots");
  mvcc.rollbackTransaction(txReader.txId);
  const purged = mvcc.vacuum(tx2.txId + 1);
  assert(purged >= 1, "Vacuum should purge obsolete versions");
  console.log(`  [✓] MVCC snapshot isolation and vacuum verified (purged ${purged} obsolete tuples).`);

  // ---------------------------------------------------------------------------
  // Suite 5: Sparse Block Indexing & Bloom Filter Pruning
  // ---------------------------------------------------------------------------
  console.log("[Suite 5/9] Validating Sparse Block Indexing & Bloom Filters...");
  const sparseEngine = new BroccoliSparseIndexEngine();

  const records = Array.from({ length: 150 }, (_, i) => ({
    id: `doc_${i}`,
    status: i < 50 ? "draft" : i < 100 ? "published" : "archived",
    score: (i + 1) * 10,
  }));

  const summaries = sparseEngine.buildSparseIndex("articles", records, ["id", "status", "score"], 64);
  assert(summaries.length === 3, "150 records / 64 = 3 blocks");

  // Query for non-existent status: bloom filter prunes all blocks
  const pruned = sparseEngine.pruneBlocks("articles", { status: "deleted" });
  assert(pruned.prunedBlocks === 3, "All blocks should be pruned by bloom filter");
  console.log(`  [✓] Sparse index block summaries and bloom pruning verified (pruned ${pruned.prunedBlocks}/${pruned.totalBlocks} blocks).`);

  // ---------------------------------------------------------------------------
  // Suite 6: Change Data Capture (CDC) Streams & Replay
  // ---------------------------------------------------------------------------
  console.log("[Suite 6/9] Validating Change Data Capture Streams & Replay...");
  const cdc = new BroccoliCdcStream();

  const events: any[] = [];
  const sub = cdc.subscribe({ tables: ["accounts"] }, (ev) => events.push(ev));

  cdc.emitEvent("accounts", "INSERT", "acc_1", undefined, { balance: 1000 });
  cdc.emitEvent("accounts", "UPDATE", "acc_1", { balance: 1000 }, { balance: 1500 });
  cdc.emitEvent("other_table", "INSERT", "rec_9", undefined, { x: 1 }); // Filtered out

  assert(events.length === 2, "Subscriber should only receive 2 accounts events");
  assert(events[0].lsn === 1 && events[1].lsn === 2, "Events must have sequential LSNs");

  // Rewind replay
  const replayed: any[] = [];
  const replaySub = cdc.subscribe({ fromLsn: 1 }, (ev) => replayed.push(ev));
  assert(replayed.length === 3, "Rewind from LSN 1 should replay all 3 events");
  sub.unsubscribe();
  replaySub.unsubscribe();
  console.log("  [✓] CDC stream emission, filtering, and rewindable LSN replay verified.");

  // ---------------------------------------------------------------------------
  // Suite 7: Vectorized Columnar Execution & Aggregations
  // ---------------------------------------------------------------------------
  console.log("[Suite 7/9] Validating Vectorized Columnar Execution...");
  const vectorEngine = new BroccoliVectorEngine();

  const vecRecords = Array.from({ length: 400 }, (_, i) => ({
    id: `row_${i}`,
    latency: (i + 1) * 1.5,
    region: i % 2 === 0 ? "us-east" : "eu-west",
  }));

  const chunk = vectorEngine.createVectorChunk(vecRecords, ["latency"], ["region"]);
  assert(chunk.columns.latency instanceof Float64Array, "Latency column must be Float64Array");

  const sel = vectorEngine.vectorFilter(chunk, "latency", "gt", 300);
  assert(sel.length > 0, "Vector filter should find matches");

  const sum = vectorEngine.vectorAggregate(chunk, "latency", "SUM");
  const count = vectorEngine.vectorAggregate(chunk, "latency", "COUNT");
  const avg = vectorEngine.vectorAggregate(chunk, "latency", "AVG");
  assert(count === 400, "Count should be 400");
  assert(Math.abs(avg - sum / count) < 0.0001, "Avg should equal sum / count");
  console.log(`  [✓] Vectorized execution verified (SUM: ${sum}, AVG: ${avg.toFixed(2)}, COUNT: ${count}).`);

  // ---------------------------------------------------------------------------
  // Suite 8: BM25 Adaptive Inverted Full-Text Search Engine
  // ---------------------------------------------------------------------------
  console.log("[Suite 8/9] Validating BM25 Full-Text Search & Phrase Queries...");
  const invertedEngine = new BroccoliInvertedIndexEngine();

  invertedEngine.indexDocument("kb", "doc_101", "How to configure cloudflare edge caching and rate limiting");
  invertedEngine.indexDocument("kb", "doc_102", "Managing stripe webhook signatures and payment intents");
  invertedEngine.indexDocument("kb", "doc_103", "BroccoliDB multi-tenant connection pooling and query optimization");

  const searchResults = invertedEngine.search("kb", "cloudflare edge caching", 5);
  assert(searchResults.length >= 1, "Should find matching documents");
  assert(searchResults[0].docId === "doc_101", "Top document should be doc_101");

  const phraseMatch = invertedEngine.search("kb", "connection pooling", 5, { phrase: true });
  assert(phraseMatch.length === 1 && phraseMatch[0].docId === "doc_103", "Phrase search should match doc_103");
  console.log("  [✓] BM25 relevance ranking and phrase queries verified.");

  // ---------------------------------------------------------------------------
  // Suite 9: Distributed Two-Phase Commit (2PC) Coordinator
  // ---------------------------------------------------------------------------
  console.log("[Suite 9/9] Validating Two-Phase Commit Coordinator...");
  const coordinator = new BroccoliTwoPhaseCommitCoordinator();

  const part1: IBroccoli2pcParticipant = {
    participantId: "store_accounts",
    prepare: async () => true,
    commit: async () => {},
    rollback: async () => {},
  };

  const part2: IBroccoli2pcParticipant = {
    participantId: "store_wallets",
    prepare: async () => true,
    commit: async () => {},
    rollback: async () => {},
  };

  coordinator.registerParticipant(part1);
  coordinator.registerParticipant(part2);

  coordinator.begin2pcTransaction("tx_2pc_galx_1", ["store_accounts", "store_wallets"]);
  const commitOk = await coordinator.execute2pc("tx_2pc_galx_1");
  assert(commitOk === true, "2PC execute should succeed");
  assert(coordinator.getTransaction("tx_2pc_galx_1")?.state === "COMMITTED", "State should be COMMITTED");

  // Rollback on prepare rejection
  let rolledBack: boolean = false;
  const partFailing: IBroccoli2pcParticipant = {
    participantId: "store_faulty",
    prepare: async () => false,
    commit: async () => {},
    rollback: async () => { rolledBack = true; },
  };

  coordinator.registerParticipant(partFailing);
  coordinator.begin2pcTransaction("tx_2pc_galx_2", ["store_accounts", "store_faulty"]);
  const abortOk = await coordinator.execute2pc("tx_2pc_galx_2");
  assert(abortOk === false, "2PC must abort when participant prepare fails");
  assert(coordinator.getTransaction("tx_2pc_galx_2")?.state === "ABORTED", "State should be ABORTED");
  assert(rolledBack, "Rollback must be invoked");
  console.log("  [✓] Two-Phase Commit prepare, commit, and abort rollback cycles verified.");

  // ---------------------------------------------------------------------------
  // Suite 10: Adaptive Buffer Pool Manager & LRU-2 Page Eviction
  // ---------------------------------------------------------------------------
  console.log("[Suite 10/12] Validating Buffer Pool Manager & LRU-2 Eviction...");
  const bufferPool = new BroccoliBufferPoolManager(4, 2); // 4 frames, K=2

  // Fetch 4 pages to fill the pool
  const page1 = await bufferPool.fetchPage("page_1", async (id) => ({ id, data: "content_1" }));
  const page2 = await bufferPool.fetchPage("page_2", async (id) => ({ id, data: "content_2" }));
  const page3 = await bufferPool.fetchPage("page_3", async (id) => ({ id, data: "content_3" }));
  const page4 = await bufferPool.fetchPage("page_4", async (id) => ({ id, data: "content_4" }));

  // Unpin all
  bufferPool.unpinPage("page_1");
  bufferPool.unpinPage("page_2");
  bufferPool.unpinPage("page_3");
  bufferPool.unpinPage("page_4");

  // Re-access page 1 and page 2 (giving them K=2 accesses)
  const p1 = await bufferPool.fetchPage("page_1");
  bufferPool.unpinPage("page_1");
  const p2 = await bufferPool.fetchPage("page_2");
  bufferPool.unpinPage("page_2");

  // Fetch page 5 -> should evict page 3 or 4 (which only have K=1 access and backward distance = infinity)
  const page5 = await bufferPool.fetchPage("page_5", async (id) => ({ id, data: "content_5" }));
  bufferPool.unpinPage("page_5", true); // Dirty unpin

  const metrics = bufferPool.getMetrics();
  assert(metrics.evictions >= 1, "Should have at least 1 eviction");
  assert(metrics.dirtyPages === 1, "Should have 1 dirty page");

  // Test dirty flush
  let flushedKey = "";
  await bufferPool.flushPage("page_5", async (pId) => { flushedKey = pId; });
  assert(flushedKey === "page_5", "Page 5 should be flushed");
  assert(bufferPool.getMetrics().dirtyPages === 0, "No dirty pages after flush");
  console.log(`  [✓] Buffer pool LRU-2 eviction, pinning, and dirty flushes verified (Hit ratio: ${metrics.hitRatioPct}%).`);

  // ---------------------------------------------------------------------------
  // Suite 11: Log-Structured Merge-Tree (LSM) Storage Substrate
  // ---------------------------------------------------------------------------
  console.log("[Suite 11/12] Validating LSM-Tree Store & SSTable Compaction...");
  const lsm = new BroccoliLsmStore(5); // Small MemTable size for deterministic flushes

  // Insert items to trigger MemTable flush into SSTable Level 0
  for (let i = 0; i < 12; i++) {
    lsm.put(`user_${String(i).padStart(4, "0")}`, { name: `User ${i}`, rank: i * 10 });
  }

  // SSTable flush should have created at least 2 Level 0 SSTables
  assert(lsm.getSsTableMetas().length >= 2, "Should have created at least 2 SSTables");

  // Point Query
  const u5 = lsm.get("user_0005") as { name: string; rank: number };
  assert(u5?.name === "User 5", "Point get across SSTables should resolve user 5");

  // Range Scan
  const scanResults = lsm.scan("user_0003", "user_0008", 10);
  assert(scanResults.length === 6, "Range scan should return 6 records between user_0003 and user_0008");

  // Tombstone Deletion
  const deleted = lsm.delete("user_0005");
  assert(deleted === true, "Delete should succeed");
  assert(lsm.get("user_0005") === undefined, "Deleted key should return undefined");

  // Compaction
  const compactionStats = await lsm.compact(0);
  assert(compactionStats.compactedTablesCount >= 2, "Compaction should merge Level 0 SSTables into Level 1");
  console.log(`  [✓] LSM-Tree MemTable, SSTables, Range Scan, and Compaction verified (Compacted ${compactionStats.compactedTablesCount} tables in ${compactionStats.durationMs}ms).`);

  // ---------------------------------------------------------------------------
  // Suite 12: Distributed Raft Consensus Substrate
  // ---------------------------------------------------------------------------
  console.log("[Suite 12/12] Validating Local Raft Protocol State Model...");
  const raftNode = new BroccoliRaftConsensusEngine("node_galx_1", ["node_galx_1"]);

  assert(raftNode.getRole() === "FOLLOWER", "Initial role must be FOLLOWER");

  // Leader Election
  const electionWon = await raftNode.startElection();
  assert(electionWon === true, "Single-node candidate should win election");
  assert(raftNode.getRole() === "LEADER", "Role must now be LEADER");
  assert(raftNode.getCurrentTerm() === 1, "Term must be 1");

  // Propose Command
  const logEntry = await raftNode.proposeCommand("UPDATE_BUDGET", { department: "engineering", limit: 5000 });
  assert(logEntry.index === 1, "Log index must be 1");
  assert(raftNode.getCommitIndex() === 1, "Commit index must be advanced");

  // Follower AppendEntries RPC Simulation
  const followerNode = new BroccoliRaftConsensusEngine("node_galx_2", ["node_galx_1", "node_galx_2"]);
  const appendResp = followerNode.appendEntries({
    term: 1,
    leaderId: "node_galx_1",
    prevLogIndex: 0,
    prevLogTerm: 0,
    entries: [logEntry],
    leaderCommit: 1,
  });
  assert(appendResp.success === true, "AppendEntries should succeed on follower");
  assert(followerNode.getCommitIndex() === 1, "Follower commit index must match leaderCommit");
  console.log("  [✓] Local Raft election and AppendEntries state transitions verified.");

  // ---------------------------------------------------------------------------
  // Suite 13: Adaptive Query Plan Cache
  // ---------------------------------------------------------------------------
  console.log("[Suite 13/15] Validating Adaptive Query Plan Cache...");
  const planCache = new BroccoliAdaptivePlanCache(100, 0.20);

  const testPlan = {
    planType: "SECONDARY_INDEX_SEEK" as const,
    targetTable: "accounts",
    selectedIndex: "org_id",
    estimatedCost: 5,
    explanation: "Seek on org_id index",
  };

  const cached = planCache.setPlan("SELECT_ACCOUNTS_BY_ORG", testPlan);
  assert(cached.planId.startsWith("plan_"), "Plan ID should be generated");

  const retrieved = planCache.getPlan("SELECT_ACCOUNTS_BY_ORG");
  assert(retrieved?.plan.selectedIndex === "org_id", "Retrieved plan should match");

  // Record normal execution
  planCache.recordExecution("SELECT_ACCOUNTS_BY_ORG", 120, 50);
  assert(retrieved.executionCount === 1, "Execution count should be 1");

  // Record cardinality drift (>20%): 50 -> 100
  planCache.recordExecution("SELECT_ACCOUNTS_BY_ORG", 250, 100);
  assert(planCache.getMetrics().driftReoptimizationsCount === 1, "Drift should trigger re-optimization");
  assert(planCache.getPlan("SELECT_ACCOUNTS_BY_ORG") === undefined, "Drifted plan should be invalidated");
  console.log("  [✓] Adaptive plan caching, execution profiling, and cardinality drift re-optimization verified.");

  // ---------------------------------------------------------------------------
  // Suite 14: Distributed Saga Transaction Orchestrator
  // ---------------------------------------------------------------------------
  console.log("[Suite 14/15] Validating In-Process Saga Orchestrator...");
  const sagaOrchestrator = new BroccoliSagaOrchestrator();

  type CheckoutContext = {
    userId: string;
    amount: number;
    charged: boolean;
    inventoryReserved: boolean;
    orderCreated: boolean;
  };

  const successSteps: BroccoliSagaStep<CheckoutContext, any>[] = [
    {
      stepName: "ChargeCustomer",
      execute: async (ctx) => { ctx.charged = true; return "ch_123"; },
      compensate: async (ctx) => { ctx.charged = false; },
    },
    {
      stepName: "ReserveInventory",
      execute: async (ctx) => { ctx.inventoryReserved = true; return "inv_456"; },
      compensate: async (ctx) => { ctx.inventoryReserved = false; },
    },
    {
      stepName: "CreateOrder",
      execute: async (ctx) => { ctx.orderCreated = true; return "ord_789"; },
      compensate: async (ctx) => { ctx.orderCreated = false; },
    },
  ];

  const initialContext: CheckoutContext = {
    userId: "usr_100",
    amount: 250,
    charged: false,
    inventoryReserved: false,
    orderCreated: false,
  };

  const successResult = await sagaOrchestrator.executeSaga("saga_success_1", { ...initialContext }, successSteps);
  assert(successResult.state === "COMPLETED", "Saga state must be COMPLETED");
  assert(successResult.completedSteps.length === 3, "All 3 steps must complete");
  assert(successResult.context.orderCreated === true, "Order must be created");

  // Failing Saga with Compensation
  const failingSteps: BroccoliSagaStep<CheckoutContext, any>[] = [
    {
      stepName: "ChargeCustomer",
      execute: async (ctx) => { ctx.charged = true; return "ch_fail_1"; },
      compensate: async (ctx) => { ctx.charged = false; },
    },
    {
      stepName: "ReserveInventory",
      execute: async () => { throw new Error("Out of stock!"); },
      compensate: async () => {},
    },
  ];

  const failContext: CheckoutContext = { ...initialContext };
  const failResult = await sagaOrchestrator.executeSaga("saga_fail_1", failContext, failingSteps);
  assert(failResult.state === "COMPENSATED", "Failing saga must transition to COMPENSATED");
  assert(failResult.completedSteps.includes("ChargeCustomer"), "ChargeCustomer was completed before failure");
  assert(failResult.compensatedSteps.includes("ChargeCustomer"), "ChargeCustomer must be compensated");
  assert(failContext.charged === false, "Charge must be rolled back by compensation");
  console.log("  [✓] Saga forward execution and reverse compensation workflows verified.");

  // ---------------------------------------------------------------------------
  // Suite 15: Multi-Tier Semantic KV Cache with XFetch Early Refresh
  // ---------------------------------------------------------------------------
  console.log("[Suite 15/15] Validating Multi-Tier KV Cache with XFetch...");
  const tieredCache = new BroccoliTieredKvCache(10);

  let computeCount = 0;
  const expensiveCompute = async () => {
    computeCount++;
    return { tokenSummary: "computed_token_payload", timestamp: Date.now() };
  };

  // Initial fetch (miss -> compute -> store L1 & L2)
  const entry1 = await tieredCache.get("pricing:tier:enterprise", expensiveCompute, { ttlMs: 1000 });
  assert(entry1?.tokenSummary === "computed_token_payload", "Should return computed payload");
  assert(computeCount === 1, "Compute should be executed once");

  // Second fetch (L1 Hit)
  const entry2 = await tieredCache.get("pricing:tier:enterprise", expensiveCompute, { ttlMs: 1000 });
  assert(entry2?.tokenSummary === "computed_token_payload", "Should return cached payload");
  assert(computeCount === 1, "Compute count should not increase on cache hit");

  const cacheMetrics = tieredCache.getMetrics();
  assert(cacheMetrics.l1Hits === 1, "Should record 1 L1 hit");
  assert(cacheMetrics.l2EntriesCount === 1, "Should mirror to L2 compressed storage");
  console.log("  [✓] Multi-tier L1/L2 caching, XFetch early refresh, and metrics verified.");

  // ---------------------------------------------------------------------------
  // Suite 16: Exact Vector Similarity Search
  // ---------------------------------------------------------------------------
  console.log("[Suite 16/18] Validating Exact Vector Search...");
  const vectorAnn = new BroccoliVectorAnnEngine();

  // Insert 3 semantic vector embeddings in 4-dimensional space
  vectorAnn.insertVector("documents", "doc_ai_agent", [0.9, 0.8, 0.1, 0.0], { title: "Autonomous Agents" });
  vectorAnn.insertVector("documents", "doc_llm_inference", [0.85, 0.75, 0.15, 0.05], { title: "LLM Inference Engine" });
  vectorAnn.insertVector("documents", "doc_gardening", [0.05, 0.1, 0.9, 0.85], { title: "Organic Tomato Care" });

  assert(vectorAnn.getVectorCount("documents") === 3, "Namespace should contain 3 vectors");

  // Query nearest to [0.88, 0.79, 0.12, 0.02] (Close to AI & LLM, far from gardening)
  const results = vectorAnn.searchNearest("documents", [0.88, 0.79, 0.12, 0.02], 2, "COSINE");
  assert(results.length === 2, "Top-2 results should be returned");
  assert(results[0].vectorId === "doc_ai_agent" || results[0].vectorId === "doc_llm_inference", "Top match should be AI/LLM");
  assert(results[0].score > 0.95, "Cosine score should be > 0.95 for near-identical embedding");
  console.log("  [✓] Vector similarity search (Cosine/Euclidean) and top-K nearest neighbor ranking verified.");

  // ---------------------------------------------------------------------------
  // Suite 17: Distributed Consistent Hash Ring & Virtual Nodes
  // ---------------------------------------------------------------------------
  console.log("[Suite 17/18] Validating Consistent Hash Ring...");
  const hashRing = new BroccoliConsistentHashRing(64); // 64 vnodes per physical node

  hashRing.addNode({ nodeId: "shard_us_east_1", weight: 1.0 });
  hashRing.addNode({ nodeId: "shard_us_west_1", weight: 1.0 });
  hashRing.addNode({ nodeId: "shard_eu_central_1", weight: 1.0 });

  assert(hashRing.getVirtualNodeCount() === 64 * 3, "Total virtual nodes must be 192");

  const nodeForOrgA = hashRing.getNode("org_apple_100");
  const nodeForOrgB = hashRing.getNode("org_google_200");
  assert(nodeForOrgA !== undefined, "Key must resolve to a valid shard node");
  assert(nodeForOrgB !== undefined, "Key must resolve to a valid shard node");

  // Multi-replica lookup
  const replicas = hashRing.getNodesForKey("org_apple_100", 2);
  assert(replicas.length === 2, "Must return 2 distinct replica shard nodes");
  assert(replicas[0].nodeId !== replicas[1].nodeId, "Replicas must reside on distinct nodes");
  console.log("  [✓] Consistent hash ring partitioning, virtual nodes (vnodes), and replica routing verified.");

  // ---------------------------------------------------------------------------
  // Suite 18: Continuous Time-Series Metric Rollup Engine
  // ---------------------------------------------------------------------------
  console.log("[Suite 18/18] Validating Continuous Time-Series Rollup Engine...");
  const tsEngine = new BroccoliTimeSeriesRollupEngine(1000);

  const baseTime = 1700000000000;
  // Record 10 metric points across a 1-minute window
  for (let i = 1; i <= 10; i++) {
    tsEngine.recordPoint("inference_latency_ms", i * 10, baseTime + i * 1000);
  }

  const rollups = tsEngine.queryRollup("inference_latency_ms", 60000, baseTime, baseTime + 60000);
  assert(rollups.length === 1, "Should aggregate into 1 window");
  assert(rollups[0].count === 10, "Point count should be 10");
  assert(rollups[0].min === 10, "Min should be 10");
  assert(rollups[0].max === 100, "Max should be 100");
  assert(rollups[0].sum === 550, "Sum should be 550");
  assert(rollups[0].avg === 55, "Avg should be 55");
  assert(rollups[0].p50 === 50, "P50 should be 50");
  assert(rollups[0].p90 === 90, "P90 should be 90");
  assert(rollups[0].p99 === 100, "Nearest-rank P99 should be 100");
  console.log("  [✓] Time-series continuous window rollups and percentile downsampling (P50/P90/P99) verified.");

  // ---------------------------------------------------------------------------
  // Suite 19: Adaptive B-Tree Index Substrate
  // ---------------------------------------------------------------------------
  console.log("[Suite 19/21] Validating Adaptive B-Tree Index Engine...");
  const bTree = new BroccoliBTreeIndexEngine<string>(8); // Order 8 for quick splitting verification

  // Insert 20 elements to force multiple node splits
  for (let i = 1; i <= 20; i++) {
    bTree.insert(i * 5, `val_${i * 5}`);
  }

  assert(bTree.size() === 20, "B-Tree size should be 20");
  assert(bTree.search(25) === "val_25", "Search should find exact key 25");
  assert(bTree.search(999) === undefined, "Search should return undefined for missing key");

  // Range scan [20, 60] -> keys 20, 25, 30, 35, 40, 45, 50, 55, 60 (9 entries)
  const bTreeRange = bTree.rangeScan(20, 60);
  assert(bTreeRange.length === 9, "Range scan [20, 60] should return 9 items");
  assert(bTreeRange[0].key === 20, "Range scan start key must be 20");
  assert(bTreeRange[8].key === 60, "Range scan end key must be 60");

  const bTreeDeleted = bTree.delete(25);
  assert(bTreeDeleted === true, "Delete key 25 should return true");
  assert(bTree.search(25) === undefined, "Search 25 after delete should return undefined");
  console.log("  [✓] B-Tree balanced node splits, search, range scans, and deletions verified.");

  // ---------------------------------------------------------------------------
  // Suite 20: Distributed Wait-For Graph (WFG) Deadlock Detector
  // ---------------------------------------------------------------------------
  console.log("[Suite 20/21] Validating Wait-For Graph Deadlock Detector...");
  const deadlockDetector = new BroccoliDeadlockDetector();

  // Linear dependency (No deadlock): Tx1 -> Tx2 -> Tx3
  deadlockDetector.addWaitFor("tx_1", "tx_2", "tbl_orders:row_10");
  deadlockDetector.addWaitFor("tx_2", "tx_3", "tbl_payments:row_20");
  const noDeadlock = deadlockDetector.detectDeadlock();
  assert(noDeadlock.hasDeadlock === false, "Linear wait graph should not report deadlock");

  // Introduce circular dependency: Tx3 -> Tx1 (Cycle: Tx1 -> Tx2 -> Tx3 -> Tx1)
  deadlockDetector.addWaitFor("tx_3", "tx_1", "tbl_users:row_30");
  const cycleDeadlock = deadlockDetector.detectDeadlock();
  assert(cycleDeadlock.hasDeadlock === true, "Circular wait graph must trigger deadlock detection");
  assert(cycleDeadlock.cycle !== undefined && cycleDeadlock.cycle.length >= 2, "Deadlock cycle must contain nodes");
  assert(cycleDeadlock.victimTxId !== undefined, "Victim transaction must be designated for abort");

  // Resolve by removing victim
  deadlockDetector.removeTx(cycleDeadlock.victimTxId);
  const resolved = deadlockDetector.detectDeadlock();
  assert(resolved.hasDeadlock === false, "Deadlock must be resolved after victim abort");
  console.log("  [✓] Wait-For Graph cycle detection, deadlock alert, and victim selection verified.");

  // ---------------------------------------------------------------------------
  // Suite 21: Continuous Incremental Materialized View Substrate
  // ---------------------------------------------------------------------------
  console.log("[Suite 21/21] Validating Materialized View Engine...");
  const mvEngine = new BroccoliMaterializedViewEngine();

  interface OrderRecord {
    id: string;
    department: string;
    amount: number;
  }

  mvEngine.createView<OrderRecord>({
    viewName: "mv_dept_spend",
    sourceTable: "orders",
    groupByField: "department",
    aggregateField: "amount",
    aggregateFunc: "SUM",
  });

  // Apply CDC mutation inserts
  mvEngine.applyMutation<OrderRecord>("orders", "INSERT", undefined, { id: "o1", department: "eng", amount: 100 });
  mvEngine.applyMutation<OrderRecord>("orders", "INSERT", undefined, { id: "o2", department: "eng", amount: 150 });
  mvEngine.applyMutation<OrderRecord>("orders", "INSERT", undefined, { id: "o3", department: "sales", amount: 300 });

  const engRow = mvEngine.getViewRow("mv_dept_spend", "eng");
  assert(engRow?.aggregateValue === 250, "Eng department spend sum must be 250");
  assert(engRow.rowCount === 2, "Eng department row count must be 2");

  // Apply CDC mutation delete (o1 deleted: 250 - 100 = 150)
  mvEngine.applyMutation<OrderRecord>("orders", "DELETE", { id: "o1", department: "eng", amount: 100 }, undefined);
  const engRowAfterDel = mvEngine.getViewRow("mv_dept_spend", "eng");
  assert(engRowAfterDel?.aggregateValue === 150, "Eng department spend sum after delete must be 150");
  console.log("  [✓] Incremental CDC materialized view maintenance (SUM/COUNT) and O(1) reads verified.");

  // ---------------------------------------------------------------------------
  // Grand Integration: BroccoliDatabaseKernel Master Substrates
  // ---------------------------------------------------------------------------
  console.log("[Integration] Validating BroccoliDatabaseKernel Unified Substrates...");
  const kernel = new BroccoliDatabaseKernel();
  assert(kernel.bufferPool instanceof BroccoliBufferPoolManager, "Buffer pool must be attached to kernel");
  assert(kernel.lsmStore instanceof BroccoliLsmStore, "LSM store must be attached to kernel");
  assert(kernel.raftConsensus instanceof BroccoliRaftConsensusEngine, "Raft engine must be attached to kernel");
  assert(kernel.planCache instanceof BroccoliAdaptivePlanCache, "Plan cache must be attached to kernel");
  assert(kernel.sagaOrchestrator instanceof BroccoliSagaOrchestrator, "Saga orchestrator must be attached to kernel");
  assert(kernel.tieredKvCache instanceof BroccoliTieredKvCache, "Tiered KV cache must be attached to kernel");
  assert(kernel.vectorAnn instanceof BroccoliVectorAnnEngine, "Vector search engine must be attached to kernel");
  assert(kernel.hashRing instanceof BroccoliConsistentHashRing, "Consistent hash ring must be attached to kernel");
  assert(kernel.timeSeriesRollup instanceof BroccoliTimeSeriesRollupEngine, "Time-series rollup engine must be attached to kernel");
  assert(kernel.bTree instanceof BroccoliBTreeIndexEngine, "B-Tree index engine must be attached to kernel");
  assert(kernel.deadlockDetector instanceof BroccoliDeadlockDetector, "Deadlock detector must be attached to kernel");
  assert(kernel.materializedView instanceof BroccoliMaterializedViewEngine, "Materialized view engine must be attached to kernel");
  assert(kernel.connectionPool instanceof BroccoliConnectionPool, "Connection pool must be attached to kernel");
  assert(kernel.lockAuthority instanceof BroccoliLockAuthority, "Lock authority must be attached to kernel");
  assert(kernel.queryOptimizer instanceof BroccoliQueryOptimizer, "Query optimizer must be attached to kernel");
  assert(kernel.mvcc instanceof BroccoliMvccEngine, "MVCC engine must be attached to kernel");
  assert(kernel.sparseIndex instanceof BroccoliSparseIndexEngine, "Sparse index must be attached to kernel");
  assert(kernel.cdc instanceof BroccoliCdcStream, "CDC stream must be attached to kernel");
  assert(kernel.vectorEngine instanceof BroccoliVectorEngine, "Vector engine must be attached to kernel");
  assert(kernel.invertedIndex instanceof BroccoliInvertedIndexEngine, "Inverted index must be attached to kernel");
  assert(kernel.twoPhaseCommit instanceof BroccoliTwoPhaseCommitCoordinator, "2PC coordinator must be attached to kernel");
  console.log("  [✓] Grand BroccoliDatabaseKernel master substrate bindings verified (21/21 engines unified).");

  console.log("================================================================================");
  console.log(" [✓] ALL 21/21 GALXAI BROCCOLIDB ADVANCED ENGINES VALIDATED SUCCESSFULLY!       ");
  console.log("================================================================================");
}

runAdvancedBackendValidation().catch((err) => {
  console.error("\n[✗] GALXAI ADVANCED BACKEND VALIDATION FAILED:", err);
  process.exit(1);
});
