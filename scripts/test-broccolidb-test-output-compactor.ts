import assert from 'node:assert/strict';
import { BroccoliTestOutputCompactor } from '../src/core/broccolidb/BroccoliTestOutputCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB TEST OUTPUT & COMPILER COMPACTOR');
  console.log('======================================================================\n');

  BroccoliTestOutputCompactor.clear();

  // Test suite output with 8 passing test files and 1 failing assertion
  const rawTestLog = `
PASS src/core/auth.test.ts (1.2s)
PASS src/core/crypto.test.ts (0.8s)
PASS src/core/session.test.ts (0.9s)
PASS src/core/database.test.ts (2.4s)
PASS src/core/queue.test.ts (1.1s)
PASS src/core/cache.test.ts (0.5s)
PASS src/core/ratelimit.test.ts (0.7s)
FAIL src/core/billing.test.ts (3.2s)
  ● BillingService > should enforce daily spend lease limit
    AssertionError [ERR_ASSERTION]: Expected 402 Payment Required, received 200 OK
      at BillingService.verifyBudget (src/core/billing.ts:142:15)
      at Object.<anonymous> (src/core/billing.test.ts:58:22)
PASS src/core/analytics.test.ts (1.4s)

Test Suites: 1 failed, 8 passed, 9 total
Tests:       1 failed, 48 passed, 49 total
Snapshots:   0 total
Time:        8.452 s
`.trim();

  console.log('[1/2] Compacting Test Output in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliTestOutputCompactor.compactTestLog(rawTestLog);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Suites: ${res.totalSuitesCount} (Passed: ${res.passedSuitesCount}, Failed: ${res.failedSuitesCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Diagnostic Prompt Preview:\n"""\n${res.compactedDiagnosticPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.passedSuitesCount, 8);
  assert.equal(res.failedSuitesCount, 1);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedDiagnosticPrompt.includes('[PASSING TEST SUITES (8 passed): Omitted for token compaction]'));
  assert.ok(res.compactedDiagnosticPrompt.includes('FAIL src/core/billing.test.ts'));
  assert.ok(res.compactedDiagnosticPrompt.includes('Expected 402 Payment Required, received 200 OK'));
  assert.ok(res.compactedDiagnosticPrompt.includes('src/core/billing.ts:142:15'));

  console.log('\n[✓] Test Output Failure Isolation & Pass Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TEST OUTPUT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
