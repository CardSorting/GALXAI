import assert from 'node:assert/strict';
import { BroccoliSemanticDictCompressor } from '../src/core/broccolidb/BroccoliSemanticDictCompressor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SEMANTIC DICTIONARY PHRASE COMPRESSOR');
  console.log('======================================================================\n');

  BroccoliSemanticDictCompressor.clear();

  // Multi-turn system prompt with heavy repeated enterprise terminology
  const verboseEnterprisePrompt = `
Rule 1: Always verify that ORGANIZATION_SUBSCRIPTION_ACTIVE_TIER is valid before invoking tools.
Rule 2: If ORGANIZATION_SUBSCRIPTION_ACTIVE_TIER is expired, return an authorization error.
Rule 3: Check database connection using POSTGRESQL_TRANSACTION_ISOLATION_LEVEL set to serializable.
Rule 4: On ledger updates, ensure POSTGRESQL_TRANSACTION_ISOLATION_LEVEL is strictly maintained.
Rule 5: If JSON schema validation fails, raise JSON_SCHEMA_STRICT_VALIDATION_ERROR immediately.
Rule 6: Never bypass JSON_SCHEMA_STRICT_VALIDATION_ERROR under any operational circumstances.
Rule 7: Final check verifies that ORGANIZATION_SUBSCRIPTION_ACTIVE_TIER matches enterprise billing records.
Rule 8: Concurrency check: Ensure POSTGRESQL_TRANSACTION_ISOLATION_LEVEL is snapshot.
Rule 9: Tool validation error: Log JSON_SCHEMA_STRICT_VALIDATION_ERROR to CloudWatch.
`;

  console.log('[1/2] Compacting Repetitive Multi-Token Jargon Phrases in BroccoliDB...');
  const res = BroccoliSemanticDictCompressor.compressPrompt(verboseEnterprisePrompt);

  console.log(`      - Was Compressed: ${res.wasCompressed}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compressed Tokens: ${res.compressedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Phrase Replacements:`, res.phraseReplacements);
  console.log(`      - Compressed Prompt Preview:\n"""\n${res.compressedPrompt.slice(0, 250)}...\n"""`);

  assert.equal(res.wasCompressed, true);
  assert.ok(res.tokensSaved > 0);
  assert.ok(res.compressedPrompt.includes('§A'));
  assert.ok(res.compressedPrompt.includes('[LEGEND:'));

  console.log('\n[✓] Semantic Dictionary Phrase Compression & Alias Mapping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SEMANTIC DICT COMPRESSOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
