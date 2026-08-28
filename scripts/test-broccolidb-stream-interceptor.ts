import assert from 'node:assert/strict';
import { BroccoliStreamInterceptor } from '../src/core/broccolidb/BroccoliStreamInterceptor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC STREAM INTERCEPTOR & EARLY-HALT CLAMP');
  console.log('======================================================================\n');

  BroccoliStreamInterceptor.clear();

  // 1. Test JSON Balanced Brace Cloture
  console.log('[1/2] Simulating Streaming JSON Generation with Trailing Fluff...');
  const jsonSession = 'stream_sess_json_101';

  // Chunk 1: Partial JSON
  const chunk1 = BroccoliStreamInterceptor.evaluateChunk(jsonSession, '{"status": "ok", "customerId": 4812', {
    isJsonExpected: true,
    maxAllowedTokens: 1000,
    outputPricePer1M: 20.0,
  });
  console.log(`      - Chunk 1 (Partial JSON): Should Halt = ${chunk1.shouldHalt}`);
  assert.equal(chunk1.shouldHalt, false);

  // Chunk 2: Closing Brace Reached
  const chunk2 = BroccoliStreamInterceptor.evaluateChunk(jsonSession, '{"status": "ok", "customerId": 4812}', {
    isJsonExpected: true,
    maxAllowedTokens: 1000,
    outputPricePer1M: 20.0,
  });
  console.log(`      - Chunk 2 (Closing Brace Reached): Should Halt = ${chunk2.shouldHalt} (Reason: ${chunk2.reason})`);
  console.log(`      - Tokens Emitted: ${chunk2.tokensEmitted} | Tokens Saved: ${chunk2.tokensSavedEstimate} | Dollars Saved: $${chunk2.costSavedUsd.toFixed(4)}`);

  assert.equal(chunk2.shouldHalt, true);
  assert.equal(chunk2.reason, 'JSON_BRACE_BALANCED');
  assert.ok(chunk2.tokensSavedEstimate >= 900);

  // 2. Test Runaway Cyclic Loop Detection
  console.log('\n[2/2] Simulating Runaway Model Repetition Loop...');
  const loopSession = 'stream_sess_loop_202';
  const repeatingPhrase = 'Repeating identical phrase in runaway subagent tool error. ';
  const loopingText = repeatingPhrase.repeat(5);

  const loopEval = BroccoliStreamInterceptor.evaluateChunk(loopSession, loopingText, {
    maxAllowedTokens: 2000,
    outputPricePer1M: 20.0,
  });

  console.log(`      - Cyclic Loop Evaluation: Should Halt = ${loopEval.shouldHalt} (Reason: ${loopEval.reason})`);
  console.log(`      - Tokens Saved: ${loopEval.tokensSavedEstimate} tokens`);

  assert.equal(loopEval.shouldHalt, true);
  assert.equal(loopEval.reason, 'CYCLIC_LOOP_DETECTED');

  // 3. Check Aggregation Stats
  const stats = BroccoliStreamInterceptor.getStats();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  BROCCOLIDB STREAM INTERCEPTOR SAVINGS STATS`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`• Total Halted Runaway Streams: ${stats.totalHaltedStreams}`);
  console.log(`• Total Output Tokens Avoided:  ${stats.totalSavedTokens.toLocaleString()}`);
  console.log(`• Total Dollars Saved on Output: $${stats.totalSavedCostUsd.toFixed(4)}`);
  console.log(`======================================================================\n`);

  assert.equal(stats.totalHaltedStreams, 2);
  assert.ok(stats.totalSavedTokens >= 2000);

  console.log('   ALL STREAM INTERCEPTOR TESTS PASSED (100%)\n');
}

run();
