import assert from 'node:assert/strict';
import { BroccoliSpendAnalytics } from '../src/core/broccolidb/BroccoliSpendAnalytics';
import { BroccoliSpendStreamer } from '../src/core/broccolidb/BroccoliSpendStreamer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB REAL-TIME SPEND ANALYTICS & CDC STREAMER');
  console.log('======================================================================\n');

  BroccoliSpendAnalytics.clear();

  // 1. Setup CDC subscription
  console.log('[1/3] Setting up reactive Change Data Capture (CDC) subscription...');
  const receivedCdcEvents: any[] = [];
  const unsubscribe = BroccoliSpendStreamer.subscribe((event) => {
    receivedCdcEvents.push(event);
  });

  // 2. Ingest spend records across multiple departments
  console.log('[2/3] Ingesting spend records across customer_support and core_rag squads...');
  BroccoliSpendAnalytics.recordSpend({
    id: 'spend_101',
    department: 'customer_support',
    costCenter: 'cx_ops',
    serviceId: 'ticket_routing',
    model: 'gpt-5.6-luna',
    grossRetailUsd: 0.05,
    netGalxUsd: 0.01,
    avoidedWasteUsd: 0.04,
    promptTokens: 500,
    completionTokens: 50,
    durationMs: 14.5,
    timestampMs: Date.now(),
  });

  BroccoliSpendAnalytics.recordSpend({
    id: 'spend_102',
    department: 'customer_support',
    costCenter: 'cx_ops',
    serviceId: 'ticket_routing',
    model: 'gpt-5.6-luna',
    grossRetailUsd: 0.05,
    netGalxUsd: 0.01,
    avoidedWasteUsd: 0.04,
    promptTokens: 500,
    completionTokens: 50,
    durationMs: 15.2,
    timestampMs: Date.now(),
  });

  BroccoliSpendAnalytics.recordSpend({
    id: 'spend_103',
    department: 'core_rag',
    costCenter: 'engineering',
    serviceId: 'doc_search',
    model: 'gpt-5.6-sol',
    grossRetailUsd: 0.20,
    netGalxUsd: 0.12,
    avoidedWasteUsd: 0.08,
    promptTokens: 2500,
    completionTokens: 200,
    durationMs: 82.0,
    timestampMs: Date.now(),
  });

  // 3. Verify Multi-Group Aggregations
  console.log('\n[3/3] Executing BroccoliDB multi-group aggregation pipeline...');
  const breakdown = BroccoliSpendAnalytics.getDepartmentalBreakdown();

  console.log(`      - Total Records Evaluated: ${breakdown.totalRecordsEvaluated}`);
  console.log(`      - Grand Total Avoided Waste: $${breakdown.grandTotals.totalAvoidedWasteUsd.toFixed(4)}`);
  console.log(`      - Groups Formed: ${breakdown.groups.length}`);

  for (const group of breakdown.groups) {
    console.log(`        • Department: ${group.keys.department} | Evaluated: ${group.recordCount} records | Net: $${group.metrics.totalNetGalxUsd.toFixed(4)} | Waste Avoided: $${group.metrics.totalAvoidedWasteUsd.toFixed(4)}`);
  }

  assert.equal(breakdown.totalRecordsEvaluated, 3);
  assert.equal(breakdown.groups.length, 2);
  assert.equal(Number(breakdown.grandTotals.totalAvoidedWasteUsd.toFixed(4)), 0.16);

  // 4. Verify CDC Event Delivery
  assert.equal(receivedCdcEvents.length, 3);
  assert.equal(receivedCdcEvents[0].type, 'SPEND_RECORDED');
  console.log('\n[✓] Reactive BroccoliDB CDC Event Broadcasting Verified.');

  unsubscribe();

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB ANALYTICS & CDC TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
