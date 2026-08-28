import assert from 'node:assert/strict';
import { BroccoliSpendWAL } from '../src/core/broccolidb/BroccoliSpendWAL';
import { BroccoliSpendAnalytics } from '../src/core/broccolidb/BroccoliSpendAnalytics';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB WRITE-AHEAD LOG (WAL) & CRASH RECOVERY');
  console.log('======================================================================\n');

  BroccoliSpendWAL.clear();
  BroccoliSpendAnalytics.clear();

  // 1. Ingest 50 rapid spend frames into WAL
  console.log('[1/3] Ingesting 50 atomic spend frames into BroccoliDB WAL...');
  for (let i = 1; i <= 50; i++) {
    BroccoliSpendWAL.append({
      id: `spend_frame_${i}`,
      department: i % 2 === 0 ? 'engineering_rag' : 'support_chat',
      costCenter: 'core_ops',
      serviceId: 'gateway_ingress',
      model: 'gpt-5.6-luna',
      grossRetailUsd: 0.05,
      netGalxUsd: 0.01,
      avoidedWasteUsd: 0.04,
      promptTokens: 800,
      completionTokens: 80,
      durationMs: 18.0,
      timestampMs: Date.now(),
    });
  }

  const initialStats = BroccoliSpendWAL.getStats();
  const initialLedgerCount = BroccoliSpendAnalytics.getInstance().ledgerTable.count();

  console.log(`      - WAL Total Frames Logged: ${initialStats.totalFrames}`);
  console.log(`      - Sequence Number: ${initialStats.currentSequence}`);
  console.log(`      - Active In-Memory Ledger Records: ${initialLedgerCount}`);

  assert.equal(initialStats.totalFrames, 50);
  assert.equal(initialLedgerCount, 50);

  // 2. Simulate Node Crash (Clearing In-Memory Tables)
  console.log('\n[2/3] Simulating worker node crash & RAM eviction...');
  BroccoliSpendAnalytics.clear();
  const crashedCount = BroccoliSpendAnalytics.getInstance().ledgerTable.count();
  console.log(`      - Ledger count after crash/eviction: ${crashedCount} (RAM cleared)`);
  assert.equal(crashedCount, 0);

  // 3. Execute WAL Replay (Crash Recovery)
  console.log('\n[3/3] Executing BroccoliDB WAL Replay & Checksum Verification...');
  const recovery = BroccoliSpendWAL.replay();

  console.log(`      - Frames Replayed: ${recovery.replayedFramesCount}/50`);
  console.log(`      - Restored Ledger Records: ${recovery.restoredLedgerCount}`);
  console.log(`      - Replay Execution Latency: ${recovery.executionTimeMs}ms`);

  assert.equal(recovery.replayedFramesCount, 50);
  assert.equal(recovery.restoredLedgerCount, 50);
  assert.ok(recovery.executionTimeMs < 15.0); // Sub-15ms recovery

  // Verify aggregate consistency after replay
  const breakdown = BroccoliSpendAnalytics.getDepartmentalBreakdown();
  assert.equal(breakdown.totalRecordsEvaluated, 50);
  assert.equal(Number(breakdown.grandTotals.totalAvoidedWasteUsd.toFixed(2)), 2.00);

  console.log('\n[✓] Zero-Data-Loss WAL Crash Recovery & Financial Parity Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB WAL TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
