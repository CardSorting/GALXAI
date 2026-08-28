import assert from 'node:assert/strict';
import { BroccoliMaxTokenClamper } from '../src/core/broccolidb/BroccoliMaxTokenClamper';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC MAXTOKENS AUTO-CLAMPER & CEILING GUARD');
  console.log('======================================================================\n');

  BroccoliMaxTokenClamper.clear();

  // 1. Test Entity Extraction (Extract UUID / ID -> Clamps from 4096 to 64)
  console.log('[1/3] Testing Entity Extraction Intent ("Extract the customer ID from text")...');
  const clamp1 = BroccoliMaxTokenClamper.clampMaxTokens('Extract the customer ID from the message', 4096);

  console.log(`      - Detected Intent: ${clamp1.detectedIntent}`);
  console.log(`      - Original MaxTokens: ${clamp1.originalMaxTokens} -> Clamped: ${clamp1.clampedMaxTokens}`);
  console.log(`      - Ceiling Reduction: -${clamp1.reductionPercentage}%`);

  assert.equal(clamp1.wasClamped, true);
  assert.equal(clamp1.detectedIntent, 'ENTITY_EXTRACTION');
  assert.equal(clamp1.clampedMaxTokens, 64);
  assert.ok(clamp1.reductionPercentage >= 95);

  // 2. Test Structured JSON Extraction (Clamps from 4096 to 800)
  console.log('\n[2/3] Testing Structured JSON Intent (hasJsonSchema = true)...');
  const clamp2 = BroccoliMaxTokenClamper.clampMaxTokens('Parse invoice text into structured data', 4096, true);

  console.log(`      - Detected Intent: ${clamp2.detectedIntent}`);
  console.log(`      - Original MaxTokens: ${clamp2.originalMaxTokens} -> Clamped: ${clamp2.clampedMaxTokens}`);
  console.log(`      - Ceiling Reduction: -${clamp2.reductionPercentage}%`);

  assert.equal(clamp2.wasClamped, true);
  assert.equal(clamp2.detectedIntent, 'STRUCTURED_JSON');
  assert.equal(clamp2.clampedMaxTokens, 800);

  // 3. Test Unbounded Long Form Synthesis (Keeps 4096)
  console.log('\n[3/3] Testing Deep Synthesis Intent ("Write a comprehensive 10-page architecture spec")...');
  const clamp3 = BroccoliMaxTokenClamper.clampMaxTokens('Write a comprehensive 10-page architecture spec for distributed systems', 4096);

  console.log(`      - Detected Intent: ${clamp3.detectedIntent}`);
  console.log(`      - Original MaxTokens: ${clamp3.originalMaxTokens} -> Clamped: ${clamp3.clampedMaxTokens}`);
  console.log(`      - Was Clamped: ${clamp3.wasClamped}`);

  assert.equal(clamp3.wasClamped, false);
  assert.equal(clamp3.clampedMaxTokens, 4096);

  console.log('\n[✓] Dynamic MaxTokens Ceiling Auto-Clamping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MAXTOKEN CLAMPER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
