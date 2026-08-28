import assert from 'node:assert/strict';
import { BroccoliRepetitionBreaker } from '../src/core/broccolidb/BroccoliRepetitionBreaker';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB STREAMING N-GRAM REPETITION BREAKER');
  console.log('======================================================================\n');

  BroccoliRepetitionBreaker.clear();

  // Simulate degenerating repetitive LLM stream
  const baseAnswer = 'The requested database record was successfully updated in the primary shard.';
  const repeatingFluff = ' and so on and so on and so on and so on and so on';
  const degenerateStream = baseAnswer + repeatingFluff;

  console.log('[1/2] Scanning In-Flight Streaming Buffer for Cyclic Degeneration Loops...');
  const result = BroccoliRepetitionBreaker.scanForRepetitionLoops(degenerateStream, 3, 4096);

  console.log(`      - Loop Detected: ${result.isLoopDetected}`);
  console.log(`      - Repeated Phrase: "${result.repeatedPhrase}"`);
  console.log(`      - Repeat Count: ${result.repeatCount}`);
  console.log(`      - Original Stream Tokens: ${result.originalGeneratedTokens} -> Clamped: ${result.clampedTokens}`);
  console.log(`      - Tokens Saved vs Runaway (4,096 tokens): ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Cleaned Text:\n"""\n${result.cleanedText}\n"""`);

  assert.equal(result.isLoopDetected, true);
  assert.ok(result.repeatCount >= 3);
  assert.ok(result.tokensSaved > 3500);
  assert.ok(result.cleanedText.includes('[Stream Clamped: Cyclic Loop Halted]'));

  console.log('\n[✓] Streaming Cyclic Loop Detection & Early Clamp Verified.');

  console.log('\n======================================================================');
  console.log('   ALL REPETITION BREAKER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
