import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/audit/ingest/route';

async function run() {
  console.log('======================================================================');
  console.log('  TESTING LIVE REVERSE-AUDIT BATCH INGESTION ENDPOINT');
  console.log('======================================================================\n');

  const sampleTraces = [
    {
      id: 'trace_101',
      department: 'customer_support',
      costCenter: 'cx_ops',
      workload: 'classification',
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Classify this ticket: Where is my invoice?' }],
      maxTokens: 50,
    },
    {
      id: 'trace_102',
      department: 'core_product',
      costCenter: 'engineering',
      workload: 'rag_search',
      model: 'gpt-5.6-sol',
      messages: [
        {
          role: 'system',
          content: 'Timestamp: 2026-08-27T22:40:00Z\nTrace: trace_891723\nYou are a helpful assistant with 2000 tokens of static prompt context.\n' + 'Context token '.repeat(200),
        },
        { role: 'user', content: 'Explain prompt caching' },
      ],
      maxTokens: 200,
    },
    {
      id: 'trace_103',
      department: 'agent_labs',
      costCenter: 'autonomous_ai',
      workload: 'agent_loop',
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Retry on failure iteration' }],
      maxTokens: 100,
    },
  ];

  const req = new NextRequest('http://localhost:3000/api/audit/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ traces: sampleTraces }),
  });

  const res = await POST(req);
  const json = await res.json();

  console.log(`[✓] Status Code: ${res.status}`);
  console.log(`[✓] Traces Ingested: ${json.tracesIngested}`);
  console.log(`[✓] Gross Retail Cost: $${json.financials.grossRetailOpenAiUsd}`);
  console.log(`[✓] Net Intercepted Cost: $${json.financials.netGalxInterceptedUsd}`);
  console.log(`[✓] Avoided Waste: $${json.financials.totalAvoidedWasteUsd} (-${json.financials.savingsPercentage}%)`);
  console.log(`[✓] Frontier Misallocations Detected: ${json.failureModesSummary.frontierMisallocations}`);
  console.log(`[✓] Cache-Busting Headers Detected: ${json.failureModesSummary.cacheBustingHeaders}`);

  assert.equal(res.status, 200);
  assert.equal(json.tracesIngested, 3);
  assert.ok(json.financials.totalAvoidedWasteUsd > 0);
  assert.ok(json.recentIncidents.length > 0);

  console.log('\n======================================================================');
  console.log('   ALL AUDIT INGESTION PIPELINE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
