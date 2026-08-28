import assert from 'node:assert/strict';
import { BroccoliSpeculativeRouter } from '../src/core/broccolidb/BroccoliSpeculativeRouter';

async function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SPECULATIVE ROUTER & EARLY-EXIT VERIFICATION');
  console.log('======================================================================\n');

  BroccoliSpeculativeRouter.clear();

  // 1. Test High-Confidence Query (Expected: EARLY-EXIT on Luna with ~80% savings)
  console.log('[1/2] Testing High-Confidence Query (Draft Confidence 0.98 >= 0.95)...');
  let solInvocations = 0;
  let lunaInvocations = 0;

  const resHigh = await BroccoliSpeculativeRouter.executeSpeculativeRoute({
    traceId: 'trace_spec_001',
    promptText: 'Classify this ticket as billing or technical issue',
    promptTokens: 200,
    maxTokens: 50,
    draftRunner: async () => {
      lunaInvocations++;
      return { content: 'billing', confidence: 0.98 };
    },
    fallbackRunner: async () => {
      solInvocations++;
      return { content: 'billing' };
    },
  });

  console.log(`      - Early Exit Achieved: ${resHigh.earlyExitAchieved}`);
  console.log(`      - Effective Model: ${resHigh.effectiveModel}`);
  console.log(`      - Avoided Cost on Sol: $${resHigh.avoidedCostUsd.toFixed(6)} (-${resHigh.savingsPercentage}%)`);
  console.log(`      - Flagship Sol Calls Avoided: 1 (Sol Invocations: ${solInvocations})`);

  assert.equal(resHigh.earlyExitAchieved, true);
  assert.equal(resHigh.effectiveModel, 'gpt-5.6-luna');
  assert.equal(solInvocations, 0);
  assert.equal(lunaInvocations, 1);
  assert.ok(resHigh.savingsPercentage >= 70);

  // 2. Test Low-Confidence Edge Case Query (Expected: Fallback to Sol)
  console.log('\n[2/2] Testing Ambiguous Edge-Case Query (Draft Confidence 0.82 < 0.95)...');
  const resLow = await BroccoliSpeculativeRouter.executeSpeculativeRoute({
    traceId: 'trace_spec_002',
    promptText: 'Synthesize cross-border multi-tier corporate tax code nuances',
    promptTokens: 2500,
    maxTokens: 1000,
    draftRunner: async () => {
      lunaInvocations++;
      return { content: 'Draft partial answer', confidence: 0.82 };
    },
    fallbackRunner: async () => {
      solInvocations++;
      return { content: 'Full comprehensive legal synthesis from Sol' };
    },
  });

  console.log(`      - Early Exit Achieved: ${resLow.earlyExitAchieved}`);
  console.log(`      - Effective Model: ${resLow.effectiveModel}`);
  console.log(`      - Fallback to Sol Triggered: true (Sol Invocations: ${solInvocations})`);

  assert.equal(resLow.earlyExitAchieved, false);
  assert.equal(resLow.effectiveModel, 'gpt-5.6-sol');
  assert.equal(solInvocations, 1);

  // 3. Verify Stats Aggregation
  const stats = BroccoliSpeculativeRouter.getStats();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  BROCCOLIDB SPECULATIVE ROUTING METRICS`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`• Total Queries Evaluated:   ${stats.totalEvaluated}`);
  console.log(`• Early Exits Slashed:       ${stats.earlyExitCount} (${stats.earlyExitRatePct}%)`);
  console.log(`• Total Dollars Saved on Sol: $${stats.totalAvoidedDollarsUsd.toFixed(4)}`);
  console.log(`======================================================================\n`);

  assert.equal(stats.totalEvaluated, 2);
  assert.equal(stats.earlyExitCount, 1);
  assert.equal(stats.earlyExitRatePct, 50.0);

  console.log('   ALL SPECULATIVE ROUTER TESTS PASSED (100%)\n');
}

run();
