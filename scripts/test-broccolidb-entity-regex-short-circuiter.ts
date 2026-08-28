import assert from 'node:assert/strict';
import { BroccoliEntityRegexShortCircuiter } from '../src/core/broccolidb/BroccoliEntityRegexShortCircuiter';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DETERMINISTIC ENTITY REGEX SHORT-CIRCUITER');
  console.log('======================================================================\n');

  BroccoliEntityRegexShortCircuiter.clear();

  // Test 1: User prompt containing invoice identifier
  const prompt1 = 'Hello support, can you check the payment status for invoice INV-2026-88491 please?';
  console.log('[1/3] Extracting Invoice ID from Customer Support Prompt in BroccoliDB...');
  const res1 = BroccoliEntityRegexShortCircuiter.extractAndShortCircuit(prompt1, 850);

  console.log(`      - Was Short-Circuited: ${res1.wasShortCircuited}`);
  console.log(`      - Extracted Entities:`, res1.extractedEntities);
  console.log(`      - Tokens Slashed: ${res1.tokensSaved} tokens`);
  console.log(`      - Dollars Saved: $${res1.dollarsSavedUsd.toFixed(6)} (100% LLM Compute Avoided)`);

  assert.equal(res1.wasShortCircuited, true);
  assert.equal(res1.extractedEntities[0].entityType, 'INVOICE_ID');
  assert.equal(res1.extractedEntities[0].entityValue, 'INV-2026-88491');
  assert.equal(res1.tokensSaved, 850);

  // Test 2: Stripe Transaction ID and Customer ID extraction
  const prompt2 = 'Process refund for tx_3M981aBC0921820192830192 under customer cus_N8291048291048';
  console.log('\n[2/3] Extracting Multi-Entity Stripe Identifiers...');
  const res2 = BroccoliEntityRegexShortCircuiter.extractAndShortCircuit(prompt2, 850);

  console.log(`      - Was Short-Circuited: ${res2.wasShortCircuited}`);
  console.log(`      - Extracted Entity Count: ${res2.extractedEntities.length}`);
  for (const e of res2.extractedEntities) {
    console.log(`        [${e.entityType}]: "${e.entityValue}"`);
  }

  assert.equal(res2.wasShortCircuited, true);
  assert.equal(res2.extractedEntities.length, 2);
  assert.ok(res2.extractedEntities.some((e) => e.entityType === 'STRIPE_TX_ID'));
  assert.ok(res2.extractedEntities.some((e) => e.entityType === 'STRIPE_CUST_ID'));

  // Test 3: Standard conversational text without deterministic ID
  const prompt3 = 'What are your support operating hours on weekends?';
  console.log('\n[3/3] Handling Generic Non-Entity Query...');
  const res3 = BroccoliEntityRegexShortCircuiter.extractAndShortCircuit(prompt3, 850);
  console.log(`      - Was Short-Circuited: ${res3.wasShortCircuited} (Correctly Passed to Model)`);
  assert.equal(res3.wasShortCircuited, false);

  console.log('\n[✓] Deterministic Regex Entity Extraction & $0.000 Short-Circuiting Verified.');

  console.log('\n======================================================================');
  console.log('   ALL ENTITY REGEX SHORT-CIRCUITER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
