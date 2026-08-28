import assert from 'node:assert/strict';
import { BroccoliPromptCanonicalizer } from '../src/core/broccolidb/BroccoliPromptCanonicalizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PROMPT INVARIANT CANONICALIZER');
  console.log('======================================================================\n');

  BroccoliPromptCanonicalizer.clear();

  // Developer A prompt: Windows CRLF, trailing spaces, multiple blank lines
  const promptDevA = '\r\n\r\n# SYSTEM GUIDELINES \r\n\r\nYou are the primary GALXAI billing analytics AI assistant.   \r\n\r\n\r\nAdhere strictly to ISO-4217 financial currency standards.\r\n\r\n';

  // Developer B prompt: Unix LF, clean formatting
  const promptDevB = '# SYSTEM GUIDELINES\n\nYou are the primary GALXAI billing analytics AI assistant.\n\nAdhere strictly to ISO-4217 financial currency standards.';

  console.log('[1/2] Canonicalizing Disparate Prompt Implementations (Dev A vs Dev B)...');
  const resA = BroccoliPromptCanonicalizer.canonicalizePrompt(promptDevA);
  const resB = BroccoliPromptCanonicalizer.canonicalizePrompt(promptDevB);

  console.log(`      - Dev A Was Canonicalized: ${resA.wasCanonicalized}`);
  console.log(`      - Dev A Canonical Hash: ${resA.canonicalHash}`);
  console.log(`      - Dev B Canonical Hash: ${resB.canonicalHash}`);
  console.log(`      - Hashes Exactly Identical: ${resA.canonicalHash === resB.canonicalHash}`);
  console.log(`      - Tokens Saved on Dev A: ${resA.tokensSaved} tokens`);

  assert.equal(resA.wasCanonicalized, true);
  assert.equal(resA.canonicalHash, resB.canonicalHash); // Unlocks 100% Shared KV Cache!
  assert.equal(resA.canonicalPrompt, resB.canonicalPrompt);

  console.log('\n[✓] Prompt Invariant Canonicalization & KV Hash Alignment Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CANONICALIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
