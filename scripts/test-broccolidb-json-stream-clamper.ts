import assert from 'node:assert/strict';
import { BroccoliJSONStreamClamper } from '../src/core/broccolidb/BroccoliJSONStreamClamper';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB JSON STREAMING CLOSURE CLAMPER');
  console.log('======================================================================\n');

  BroccoliJSONStreamClamper.clear();

  // 1. Partial chunk during streaming (depth > 0)
  const partialStreamChunk = '{"status": "success", "userId": "usr_99", "subscription": {"tier": "enterprise"';
  console.log('[1/2] Evaluating In-Flight Streaming Chunk (Mid-JSON)...');
  const res1 = BroccoliJSONStreamClamper.evaluateChunk(partialStreamChunk);

  console.log(`      - Has Completed Root JSON: ${res1.hasCompletedRootJson}`);
  console.log(`      - Current Depth: ${res1.currentDepth}`);
  assert.equal(res1.hasCompletedRootJson, false);
  assert.ok(res1.currentDepth > 0);

  // 2. Stream chunk completes closing brace '}' and then emits 45 trailing conversational fluff tokens
  const fullStreamWithFluff = `{"status": "success", "userId": "usr_99", "subscription": {"tier": "enterprise"}}

\`\`\`
I have extracted your enterprise subscription information successfully! 
Please let me know if you would like to proceed with modifying billing seats or payment methods. Have a great day!
`;

  console.log('\n[2/2] Evaluating Stream with Completed JSON + Trailing Fluff...');
  const res2 = BroccoliJSONStreamClamper.evaluateChunk(fullStreamWithFluff, 15.00);

  console.log(`      - Has Completed Root JSON: ${res2.hasCompletedRootJson}`);
  console.log(`      - Extracted Clean Payload: "${res2.extractedJsonPayload}"`);
  console.log(`      - Valid Tokens: ${res2.tokensStreamedSoFar} tokens`);
  console.log(`      - Trailing Output Tokens Discarded: ${res2.trailingTokensDiscarded} tokens`);
  console.log(`      - Dollars Saved: $${res2.dollarsSavedUsd.toFixed(6)}`);

  assert.equal(res2.hasCompletedRootJson, true);
  assert.equal(JSON.parse(res2.extractedJsonPayload || '{}').status, 'success');
  assert.ok(res2.trailingTokensDiscarded >= 40);
  assert.ok(res2.dollarsSavedUsd > 0);

  console.log('\n[✓] In-Flight Streaming JSON Closure Interception & Early Abort Verified.');

  console.log('\n======================================================================');
  console.log('   ALL JSON STREAM CLAMPER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
