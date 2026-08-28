import assert from 'node:assert/strict';
import { BroccoliBatchCoalescer } from '../src/core/broccolidb/BroccoliBatchCoalescer';

async function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SINGLE-FLIGHT COALESCER & 50% BATCH MULTIPLEXER');
  console.log('======================================================================\n');

  BroccoliBatchCoalescer.clear();

  // 1. Test Single-Flight Request Coalescing (Stampede Shield)
  console.log('[1/2] Testing Single-Flight Request Coalescing (Simulating 5 Concurrent Calls)...');
  let upstreamInvocationCount = 0;

  const mockUpstreamFetcher = async () => {
    upstreamInvocationCount++;
    await new Promise((r) => setTimeout(r, 50)); // simulate 50ms LLM latency
    return 'Generated Summary Response from LLM';
  };

  const query = 'Summarize global quarterly financial earnings transcript';
  const model = 'gpt-5.6-sol';

  // Fire 5 identical requests concurrently
  const [call1, call2, call3, call4, call5] = await Promise.all([
    BroccoliBatchCoalescer.executeSingleFlight(query, model, mockUpstreamFetcher),
    BroccoliBatchCoalescer.executeSingleFlight(query, model, mockUpstreamFetcher),
    BroccoliBatchCoalescer.executeSingleFlight(query, model, mockUpstreamFetcher),
    BroccoliBatchCoalescer.executeSingleFlight(query, model, mockUpstreamFetcher),
    BroccoliBatchCoalescer.executeSingleFlight(query, model, mockUpstreamFetcher),
  ]);

  console.log(`      - Upstream OpenAI Invocations Fired: ${upstreamInvocationCount} (Expected: 1)`);
  console.log(`      - Call 1 Coalesced: ${call1.wasCoalesced} (Original Worker)`);
  console.log(`      - Call 2 Coalesced: ${call2.wasCoalesced} (Collapsed in memory)`);
  console.log(`      - Call 3 Coalesced: ${call3.wasCoalesced} (Collapsed in memory)`);
  console.log(`      - Avoided LLM Calls on Spike: 4/5 (80% Cost Slashed)`);

  assert.equal(upstreamInvocationCount, 1);
  assert.equal(call1.wasCoalesced, false);
  assert.equal(call2.wasCoalesced, true);
  assert.equal(call3.wasCoalesced, true);
  assert.equal(call4.wasCoalesced, true);
  assert.equal(call5.wasCoalesced, true);

  // 2. Test OpenAI Batch API Micro-Coalescer (Flat 50% Token Discount)
  console.log('\n[2/2] Testing BroccoliDB 50% Discount Batch Multiplexer...');

  // Enqueue 20 nightly background jobs totaling $10.00 retail spend
  for (let i = 1; i <= 20; i++) {
    BroccoliBatchCoalescer.enqueueBatch({
      id: `batch_job_${i}`,
      department: 'data_engineering',
      costCenter: 'nightly_pipelines',
      model: 'gpt-5.6-sol',
      promptText: `Nightly document enrichment task payload #${i}`,
      maxTokens: 500,
      retailCostUsd: 0.50,
    });
  }

  const flush = BroccoliBatchCoalescer.flushBatch();

  console.log(`      - Queued Background Jobs Flushed: ${flush.flushedCount}`);
  console.log(`      - Gross Retail Cost: $${flush.totalGrossRetailUsd.toFixed(2)}`);
  console.log(`      - Discounted Batch API Invoice: $${flush.totalDiscountedBatchUsd.toFixed(2)} (-50.0%)`);
  console.log(`      - Guaranteed Batch Dollar Savings: $${flush.totalSavingsUsd.toFixed(2)}`);

  assert.equal(flush.flushedCount, 20);
  assert.equal(flush.totalGrossRetailUsd, 10.00);
  assert.equal(flush.totalDiscountedBatchUsd, 5.00);
  assert.equal(flush.totalSavingsUsd, 5.00);

  console.log('\n[✓] Single-Flight Coalescing & 50% Batch API Multiplexer Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BATCH COALESCING TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
