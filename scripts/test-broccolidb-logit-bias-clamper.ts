import assert from 'node:assert/strict';
import { BroccoliLogitBiasClamper } from '../src/core/broccolidb/BroccoliLogitBiasClamper';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLASSIFICATION 1-TOKEN OUTPUT CLAMPER');
  console.log('======================================================================\n');

  BroccoliLogitBiasClamper.clear();

  // 1. Test Boolean Guardrail Gatekeeper Query
  const guardrailPrompt = 'Analyze the incoming user payload and classify as ALLOW or BLOCK: "Hello world"';
  console.log('[1/3] Clamping Security Guardrail Gatekeeper Prompt...');
  const res1 = BroccoliLogitBiasClamper.clampClassificationPayload(guardrailPrompt, 150);

  console.log(`      - Was Clamped: ${res1.wasClamped}`);
  console.log(`      - Detected Type: ${res1.detectedClassificationType}`);
  console.log(`      - Allowed Category Tokens:`, res1.allowedTokens);
  console.log(`      - Original Max Tokens: ${res1.originalMaxTokens} -> Clamped: ${res1.clampedMaxTokens}`);
  console.log(`      - Output Tokens Saved Per Call: ${res1.tokensSavedPerCall} (-${res1.savingsPercentage}%)`);

  assert.equal(res1.wasClamped, true);
  assert.equal(res1.clampedMaxTokens, 1);
  assert.equal(res1.detectedClassificationType, 'BOOLEAN_GATE');

  // 2. Test Customer Support Intent Router Query
  const routerPrompt = 'Classify intent and route to: billing, support, sales, or security. Query: "I need to update my credit card"';
  console.log('\n[2/3] Clamping Customer Support Intent Router Prompt...');
  const res2 = BroccoliLogitBiasClamper.clampClassificationPayload(routerPrompt, 200);

  console.log(`      - Was Clamped: ${res2.wasClamped}`);
  console.log(`      - Detected Type: ${res2.detectedClassificationType}`);
  console.log(`      - Allowed Category Tokens:`, res2.allowedTokens);
  console.log(`      - Clamped Max Tokens: ${res2.clampedMaxTokens}`);

  assert.equal(res2.wasClamped, true);
  assert.equal(res2.clampedMaxTokens, 1);
  assert.equal(res2.detectedClassificationType, 'INTENT_ROUTING');

  console.log('\n[✓] Deterministic 1-Token Classification Clamping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LOGIT BIAS CLAMPER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
