import assert from 'node:assert/strict';
import { BroccoliMicroBatcher } from '../src/core/broccolidb/BroccoliMicroBatcher';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB BACKGROUND MICRO-BATCH COALESCER');
  console.log('======================================================================\n');

  BroccoliMicroBatcher.clear();

  // Enqueue 5 async background sentiment analysis requests
  console.log('[1/2] Enqueueing 5 Async Background Jobs into BroccoliDB Memory...');
  for (let i = 1; i <= 5; i++) {
    const res = BroccoliMicroBatcher.enqueueRequest(
      `job_ticket_${i}`,
      'gpt-5.6-sol',
      [
        { role: 'system', content: 'Classify sentiment as positive, neutral, or negative.' },
        { role: 'user', content: `Ticket #${i}: I really love the new BroccoliDB real-time analytics dashboard!` },
      ],
      50
    );
    console.log(`      - Enqueued Job #${i} (Queue Length: ${res.queueLength}, Ready: ${res.readyForFlush})`);
  }

  // Compile batch payload
  console.log('\n[2/2] Compiling Queued Requests into OpenAI Batch API JSONL Format...');
  const batchRes = BroccoliMicroBatcher.compileBatchPayload(2.50, 15.00);

  console.log(`      - Was Compiled: ${batchRes.wasCompiled}`);
  console.log(`      - Total Requests in Batch: ${batchRes.totalRequestsInBatch}`);
  console.log(`      - Total Batch Input Tokens: ${batchRes.totalBatchInputTokens}`);
  console.log(`      - Standard Real-time Cost: $${batchRes.estimatedStandardCostUsd.toFixed(6)}`);
  console.log(`      - 50% Discounted Batch Cost: $${batchRes.estimatedBatchCostUsd.toFixed(6)}`);
  console.log(`      - Dollars Saved: $${batchRes.dollarsSavedUsd.toFixed(6)} (-${batchRes.savingsPercentage}%)`);
  console.log(`      - Sample JSONL Line 1:\n${batchRes.jsonlPayload.split('\n')[0]}`);

  assert.equal(batchRes.wasCompiled, true);
  assert.equal(batchRes.totalRequestsInBatch, 5);
  assert.equal(batchRes.savingsPercentage, 50.0);
  assert.ok(batchRes.jsonlPayload.includes('job_ticket_1'));
  assert.ok(batchRes.jsonlPayload.includes('/v1/chat/completions'));

  console.log('\n[✓] Background Micro-Batch Coalescing & Batch API Compilation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MICRO-BATCHER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
