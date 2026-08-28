import assert from 'node:assert/strict';
import { BroccoliSpendAnalytics } from '../src/core/broccolidb/BroccoliSpendAnalytics';
import { BroccoliSpendTimeline } from '../src/core/broccolidb/BroccoliSpendTimeline';
import { SemanticEdgeCache } from '../src/core/optimization/SemanticEdgeCache';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SPEND TIMELINE & HISTORICAL STATE RESTORATION');
  console.log('======================================================================\n');

  BroccoliSpendAnalytics.clear();
  BroccoliSpendTimeline.clear();
  SemanticEdgeCache.clear();

  // 1. Ingest initial baseline state (2 records)
  console.log('[1/4] Ingesting baseline spend records & storing cached completions...');
  BroccoliSpendAnalytics.recordSpend({
    id: 'spend_initial_1',
    department: 'growth',
    costCenter: 'marketing',
    serviceId: 'lead_enrichment',
    model: 'gpt-5.6-luna',
    grossRetailUsd: 0.10,
    netGalxUsd: 0.02,
    avoidedWasteUsd: 0.08,
    promptTokens: 1000,
    completionTokens: 100,
    durationMs: 25.0,
    timestampMs: Date.now(),
  });

  SemanticEdgeCache.store('How do I contact sales?', 'gpt-5.6-sol', 'Email sales@galx.ai');

  // 2. Create Checkpoint A
  console.log('[2/4] Creating Cryptographic Checkpoint A ("pre_deployment_state")...');
  const checkpointA = BroccoliSpendTimeline.createCheckpoint('pre_deployment_state');

  console.log(`      - Checkpoint ID: ${checkpointA.id}`);
  console.log(`      - State Root Hash: ${checkpointA.stateRootHash}`);
  console.log(`      - Ledger Records: ${checkpointA.ledgerRecordsCount} | Cache Records: ${checkpointA.cachedRecordsCount}`);
  console.log(`      - Total Avoided Waste: $${checkpointA.totalAvoidedWasteUsd.toFixed(2)}`);

  assert.equal(checkpointA.ledgerRecordsCount, 1);
  assert.equal(checkpointA.cachedRecordsCount, 1);

  // 3. Mutate state with new high-spend events
  console.log('\n[3/4] Mutating table state with new spend transactions...');
  BroccoliSpendAnalytics.recordSpend({
    id: 'spend_mutated_2',
    department: 'growth',
    costCenter: 'marketing',
    serviceId: 'lead_enrichment',
    model: 'gpt-5.6-sol',
    grossRetailUsd: 0.50,
    netGalxUsd: 0.35,
    avoidedWasteUsd: 0.15,
    promptTokens: 5000,
    completionTokens: 500,
    durationMs: 120.0,
    timestampMs: Date.now(),
  });

  const mutatedCount = BroccoliSpendAnalytics.getInstance().ledgerTable.count();
  console.log(`      - Current Ledger Count After Mutation: ${mutatedCount}`);
  assert.equal(mutatedCount, 2);

  // 4. Restore Checkpoint A (Time-Travel)
  console.log('\n[4/4] Restoring historical state back to Checkpoint A...');
  const restored = BroccoliSpendTimeline.restoreCheckpoint(checkpointA.id);
  assert.equal(restored, true);

  const restoredCount = BroccoliSpendAnalytics.getInstance().ledgerTable.count();
  const restoredCacheHit = SemanticEdgeCache.lookup('How do I contact sales?', 'gpt-5.6-sol');

  console.log(`      - Restored Ledger Count: ${restoredCount}`);
  console.log(`      - Restored Cache Entry Hit: ${restoredCacheHit.hit}`);

  assert.equal(restoredCount, 1);
  assert.equal(restoredCacheHit.hit, true);

  console.log('\n[✓] Deterministic Point-in-Time Checkpoint Restoration Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB TIMELINE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
