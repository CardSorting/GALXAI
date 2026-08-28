import assert from 'node:assert/strict';
import { BroccoliParaphraseNormalizer } from '../src/core/broccolidb/BroccoliParaphraseNormalizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SEMANTIC PARAPHRASE NORMALIZER');
  console.log('======================================================================\n');

  BroccoliParaphraseNormalizer.clear();

  // 4 semantic variations of the exact same user intent
  const variation1 = 'How do I reset my API key?';
  const variation2 = 'Where can I regenerate my API secret?';
  const variation3 = 'Steps to roll my OpenAI API token please';
  const variation4 = 'Can you tell me how to rotate secret key';

  console.log('[1/2] Canonicalizing 4 Semantic Paraphrase Variations in BroccoliDB...');
  const res1 = BroccoliParaphraseNormalizer.canonicalizeQuery(variation1, 450);
  const res2 = BroccoliParaphraseNormalizer.canonicalizeQuery(variation2, 450);
  const res3 = BroccoliParaphraseNormalizer.canonicalizeQuery(variation3, 450);
  const res4 = BroccoliParaphraseNormalizer.canonicalizeQuery(variation4, 450);

  console.log(`      - Query 1: "${variation1}" -> Key: "${res1.canonicalIntentKey}"`);
  console.log(`      - Query 2: "${variation2}" -> Key: "${res2.canonicalIntentKey}"`);
  console.log(`      - Query 3: "${variation3}" -> Key: "${res3.canonicalIntentKey}"`);
  console.log(`      - Query 4: "${variation4}" -> Key: "${res4.canonicalIntentKey}"`);

  // All variations must converge to the exact same canonical cache key
  assert.equal(res1.canonicalIntentKey, res2.canonicalIntentKey);
  assert.equal(res2.canonicalIntentKey, res3.canonicalIntentKey);
  assert.equal(res3.canonicalIntentKey, res4.canonicalIntentKey);
  assert.ok(res1.canonicalIntentKey.includes('API_KEY'));
  assert.ok(res1.canonicalIntentKey.includes('RESET'));

  console.log('\n[✓] 100% Intent Key Convergence Across All 4 Paraphrase Variations Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PARAPHRASE NORMALIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
