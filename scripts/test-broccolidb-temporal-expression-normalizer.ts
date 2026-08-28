import assert from 'node:assert/strict';
import { BroccoliTemporalExpressionNormalizer } from '../src/core/broccolidb/BroccoliTemporalExpressionNormalizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB TEMPORAL EXPRESSION NORMALIZER');
  console.log('======================================================================\n');

  BroccoliTemporalExpressionNormalizer.clear();

  // Fixed reference time: 2026-08-28T12:00:00.000Z
  const fixedNowMs = new Date('2026-08-28T12:00:00.000Z').getTime();

  // Test 1: "last 6 hours"
  const q1 = 'Fetch high-memory alerts from the last 6 hours';
  console.log('[1/3] Resolving Relative Interval "last 6 hours" in BroccoliDB...');
  const res1 = BroccoliTemporalExpressionNormalizer.resolveTimeRange(q1, fixedNowMs, 690);

  console.log(`      - Was Resolved: ${res1.wasResolved}`);
  console.log(`      - Matched Expression: "${res1.timeRange?.rawExpression}"`);
  console.log(`      - Start ISO: ${res1.timeRange?.startIso}`);
  console.log(`      - End ISO: ${res1.timeRange?.endIso}`);
  console.log(`      - Duration Hours: ${res1.timeRange?.durationHours}h`);
  console.log(`      - Tokens Slashed: ${res1.tokensSaved} tokens`);
  console.log(`      - Dollars Saved: $${res1.dollarsSavedUsd.toFixed(6)} (100% LLM Compute Avoided)`);

  assert.equal(res1.wasResolved, true);
  assert.equal(res1.timeRange?.startIso, '2026-08-28T06:00:00.000Z');
  assert.equal(res1.timeRange?.endIso, '2026-08-28T12:00:00.000Z');
  assert.equal(res1.timeRange?.durationHours, 6);

  // Test 2: "last 3 days"
  const q2 = 'Show database deadlocks over the past 3 days';
  console.log('\n[2/3] Resolving "past 3 days"...');
  const res2 = BroccoliTemporalExpressionNormalizer.resolveTimeRange(q2, fixedNowMs, 690);

  console.log(`      - Start ISO: ${res2.timeRange?.startIso}`);
  console.log(`      - End ISO: ${res2.timeRange?.endIso}`);
  console.log(`      - Duration Hours: ${res2.timeRange?.durationHours}h`);

  assert.equal(res2.wasResolved, true);
  assert.equal(res2.timeRange?.startIso, '2026-08-25T12:00:00.000Z');
  assert.equal(res2.timeRange?.durationHours, 72);

  // Test 3: "yesterday"
  const q3 = 'What was total spend for yesterday?';
  console.log('\n[3/3] Resolving "yesterday"...');
  const res3 = BroccoliTemporalExpressionNormalizer.resolveTimeRange(q3, fixedNowMs, 690);

  console.log(`      - Start ISO: ${res3.timeRange?.startIso}`);
  console.log(`      - End ISO: ${res3.timeRange?.endIso}`);

  assert.equal(res3.wasResolved, true);
  assert.equal(res3.timeRange?.startIso, '2026-08-27T00:00:00.000Z');
  assert.equal(res3.timeRange?.endIso, '2026-08-27T23:59:59.999Z');

  console.log('\n[✓] Deterministic Temporal Resolution & $0.000 Date Math Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TEMPORAL NORMALIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
