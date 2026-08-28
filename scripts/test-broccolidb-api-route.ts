import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/audit/broccolidb/route';
import { BroccoliSpendSubstrate } from '../src/core/broccolidb/BroccoliSpendSubstrate';

async function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LIVE TELEMETRY & CHECKPOINT REST API');
  console.log('======================================================================\n');

  BroccoliSpendSubstrate.clearAll();

  // Ingest sample data
  BroccoliSpendSubstrate.processLifecycle({
    traceId: 'trace_test_api_01',
    department: 'ai_safety',
    costCenter: 'governance',
    serviceId: 'red_team_harness',
    model: 'gpt-5.6-luna',
    promptText: 'Evaluate model prompt for safety constraints',
    estimatedCostUsd: 0.05,
    actualCostUsd: 0.02,
    avoidedWasteUsd: 0.08,
    promptTokens: 400,
    completionTokens: 50,
    durationMs: 12.0,
  });

  // 1. Test GET /api/audit/broccolidb
  console.log('[1/2] Testing GET /api/audit/broccolidb (Live In-Memory Stats)...');
  const getRes = await GET();
  const getJson = await getRes.json();

  console.log(`      - Status Code: ${getRes.status}`);
  console.log(`      - Engine: ${getJson.engine}`);
  console.log(`      - CAS Unique Blobs: ${getJson.metrics.casVault.uniqueBlobsCount}`);
  console.log(`      - Semantic Cache Average Latency: ${getJson.metrics.semanticCache.averageLookupLatencyMicros}µs`);
  console.log(`      - WAL Total Frames: ${getJson.metrics.writeAheadLog.totalFrames}`);
  console.log(`      - Avoided Waste Aggregated: $${getJson.metrics.financialLedger.grandTotalAvoidedWasteUsd}`);

  assert.equal(getRes.status, 200);
  assert.equal(getJson.status, 'operational');
  assert.equal(getJson.metrics.casVault.uniqueBlobsCount, 1);
  assert.equal(getJson.metrics.writeAheadLog.totalFrames, 1);

  // 2. Test POST /api/audit/broccolidb (Create Merkle Checkpoint)
  console.log('\n[2/2] Testing POST /api/audit/broccolidb (Create Merkle Checkpoint)...');
  const postReq = new NextRequest('http://localhost:3000/api/audit/broccolidb', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label: 'ci_pipeline_checkpoint' }),
  });

  const postRes = await POST(postReq);
  const postJson = await postRes.json();

  console.log(`      - Status Code: ${postRes.status}`);
  console.log(`      - Checkpoint ID: ${postJson.checkpoint.id}`);
  console.log(`      - Checkpoint Label: "${postJson.checkpoint.label}"`);
  console.log(`      - State Root Merkle Hash: ${postJson.checkpoint.stateRootHash}`);

  assert.equal(postRes.status, 200);
  assert.equal(postJson.status, 'checkpoint_created');
  assert.equal(postJson.checkpoint.label, 'ci_pipeline_checkpoint');
  assert.ok(postJson.checkpoint.stateRootHash.length === 64);

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB REST API TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
