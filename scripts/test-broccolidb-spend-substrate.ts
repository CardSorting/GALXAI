import assert from 'node:assert/strict';
import { BroccoliSpendSubstrate } from '../src/core/broccolidb/BroccoliSpendSubstrate';
import { BroccoliSpendLease } from '../src/core/broccolidb/BroccoliSpendLease';
import { BroccoliSpendAnalytics } from '../src/core/broccolidb/BroccoliSpendAnalytics';
import { SemanticEdgeCache } from '../src/core/optimization/SemanticEdgeCache';

function run() {
  console.log('======================================================================');
  console.log('  TESTING UNIFIED BROCCOLIDB AI SPEND SUBSTRATE COORDINATOR');
  console.log('======================================================================\n');

  BroccoliSpendSubstrate.clearAll();

  // 1. Setup Budget Bucket
  console.log('[1/4] Configuring $50.00 budget for customer_ops...');
  BroccoliSpendLease.setBudget('customer_ops', 50.00);

  // 2. Process Request 1 (Initial Request with Large System Prompt)
  console.log('\n[2/4] Executing Request 1 through Unified BroccoliSpendSubstrate...');
  const prompt1 = 'You are the enterprise customer support assistant. '.repeat(50);

  const res1 = BroccoliSpendSubstrate.processLifecycle({
    traceId: 'trace_req_001',
    department: 'customer_ops',
    costCenter: 'cx_support',
    serviceId: 'ticket_auto_responder',
    model: 'gpt-5.6-luna',
    promptText: prompt1,
    estimatedCostUsd: 0.05,
    actualCostUsd: 0.04,
    avoidedWasteUsd: 0.16,
    promptTokens: 1200,
    completionTokens: 80,
    durationMs: 24.5,
  });

  console.log(`      - CAS Prompt Hash: ${res1.promptCasHash}`);
  console.log(`      - WAL Sequence: ${res1.walSequence}`);
  console.log(`      - Budget Lease ID: ${res1.leaseId} (Settled: ${res1.settled})`);
  console.log(`      - Cache Hit: ${res1.cacheLookup.hit}`);

  assert.ok(res1.promptCasHash);
  assert.equal(res1.walSequence, 1);
  assert.equal(res1.settled, true);
  assert.equal(res1.cacheLookup.hit, false);

  // Store completion in Semantic Edge Cache for next request
  SemanticEdgeCache.store(prompt1, 'gpt-5.6-luna', 'Hello! How can I assist you today?');

  // 3. Process Request 2 (Duplicate Query -> Semantic Cache Hit)
  console.log('\n[3/4] Executing Request 2 (Identical Prompt -> Testing Semantic Cache Hit)...');
  const res2 = BroccoliSpendSubstrate.processLifecycle({
    traceId: 'trace_req_002',
    department: 'customer_ops',
    costCenter: 'cx_support',
    serviceId: 'ticket_auto_responder',
    model: 'gpt-5.6-luna',
    promptText: prompt1,
    estimatedCostUsd: 0.05,
    actualCostUsd: 0.00,
    avoidedWasteUsd: 0.20,
    promptTokens: 1200,
    completionTokens: 0,
    durationMs: 1.2,
  });

  console.log(`      - Cache Hit: ${res2.cacheLookup.hit} (Sub-2ms $0.00 Inference)`);
  console.log(`      - CAS Deduplicated: ${res2.promptCasHash === res1.promptCasHash}`);
  assert.equal(res2.cacheLookup.hit, true);
  assert.equal(res2.promptCasHash, res1.promptCasHash);

  // 4. Capture Cryptographic State Checkpoint & Check Analytics
  console.log('\n[4/4] Capturing Cryptographic State Checkpoint & Aggregating Analytics...');
  const checkpoint = BroccoliSpendSubstrate.createCheckpoint('post_sub_test');
  console.log(`      - Checkpoint ID: ${checkpoint.id}`);
  console.log(`      - Merkle State Root: ${checkpoint.stateRootHash}`);

  const breakdown = BroccoliSpendAnalytics.getDepartmentalBreakdown();
  console.log(`      - Total Requests Aggregated: ${breakdown.totalRecordsEvaluated}`);
  console.log(`      - Grand Total Avoided Waste: $${breakdown.grandTotals.totalAvoidedWasteUsd.toFixed(4)}`);

  assert.equal(breakdown.totalRecordsEvaluated, 2);
  assert.equal(Number(breakdown.grandTotals.totalAvoidedWasteUsd.toFixed(2)), 0.36);

  console.log('\n[✓] Unified BroccoliDB AI Spend Substrate Validated End-to-End.');

  console.log('\n======================================================================');
  console.log('   ALL UNIFIED SUBSTRATE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
