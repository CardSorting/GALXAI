import assert from 'node:assert/strict';
import { BroccoliRetryBreaker } from '../src/core/broccolidb/BroccoliRetryBreaker';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB INTELLIGENT RETRY BREAKER & TRANSIENT ERROR GUARD');
  console.log('======================================================================\n');

  BroccoliRetryBreaker.clear();

  // 1. Test Deterministic Failure (e.g. Context Length Exceeded -> Should abort immediately)
  console.log('[1/2] Testing Deterministic Failure (Schema Validation Failed / Context Exceeded)...');
  const res1 = BroccoliRetryBreaker.evaluateFailure(
    'Generate schema output with broken missing parameters',
    {
      status: 400,
      code: 'invalid_request_error',
      message: 'Schema validation failed: Missing required property customerId',
    },
    1,
    'gpt-5.6-sol',
    0.05
  );

  console.log(`      - Should Retry: ${res1.shouldRetry}`);
  console.log(`      - Decision Reason: ${res1.reason}`);
  console.log(`      - Avoided Waste on Useless Retries: $${res1.avoidedRetryCostUsd.toFixed(4)}`);

  assert.equal(res1.shouldRetry, false);
  assert.equal(res1.reason, 'DETERMINISTIC_PROMPT_BUG');
  assert.ok(res1.avoidedRetryCostUsd > 0);

  // 2. Test Transient Failure (e.g. Upstream 503 / Rate Limit -> Down-shift to Terra)
  console.log('\n[2/2] Testing Transient Recoverable Failure (Upstream 503 Overload)...');
  const res2 = BroccoliRetryBreaker.evaluateFailure(
    'Summarize customer document',
    {
      status: 503,
      code: 'service_unavailable',
      message: 'Upstream OpenAI endpoint overloaded, please retry',
    },
    1,
    'gpt-5.6-sol',
    0.05
  );

  console.log(`      - Should Retry: ${res2.shouldRetry}`);
  console.log(`      - Decision Reason: ${res2.reason}`);
  console.log(`      - Recommended Retry Model: ${res2.recommendedRetryModelId}`);
  console.log(`      - Dollars Saved on Down-Shifted Retry: $${res2.avoidedRetryCostUsd.toFixed(4)}`);

  assert.equal(res2.shouldRetry, true);
  assert.equal(res2.reason, 'TRANSIENT_RECOVERABLE');
  assert.equal(res2.recommendedRetryModelId, 'gpt-5.6-terra');
  assert.ok(res2.avoidedRetryCostUsd > 0);

  console.log('\n[✓] Intelligent Retry Breaker & Transient Error Guard Verified.');

  console.log('\n======================================================================');
  console.log('   ALL RETRY BREAKER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
