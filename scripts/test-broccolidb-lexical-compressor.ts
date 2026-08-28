import assert from 'node:assert/strict';
import { BroccoliLexicalCompressor } from '../src/core/broccolidb/BroccoliLexicalCompressor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LEXICAL ENTROPY PROMPT COMPRESSOR');
  console.log('======================================================================\n');

  BroccoliLexicalCompressor.clear();

  const verbosePrompt =
    'Could you please be so kind as to explain how Postgres indexes work? In order to be able to optimize my database, I would like you to please provide a detailed and comprehensive explanation of B-tree indexing.';

  console.log('[1/2] Compacting Verbose Natural Language Prompt...');
  const result = BroccoliLexicalCompressor.compressText(verbosePrompt);

  console.log(`      - Original Text: "${verbosePrompt}"`);
  console.log(`      - Compressed Text: "${result.compressedText}"`);
  console.log(`      - Original Tokens: ${result.originalTokens}`);
  console.log(`      - Compressed Tokens: ${result.compressedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasCompressed, true);
  assert.ok(result.savingsPercentage >= 25);
  assert.ok(result.compressedText.includes('Explain how Postgres indexes work'));

  console.log('\n[✓] Lexical Entropy Compression & Fluff Stripping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LEXICAL COMPRESSOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
