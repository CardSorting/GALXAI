import assert from 'node:assert/strict';
import { BroccoliCodeBlockTruncator } from '../src/core/broccolidb/BroccoliCodeBlockTruncator';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SSE CODE BLOCK EARLY CLAMPER');
  console.log('======================================================================\n');

  BroccoliCodeBlockTruncator.clear();

  // Simulate streaming output containing a 15-line function followed by 3 paragraphs of fluff
  const streamedChunk = `
\`\`\`typescript
export function calculateChecksum(payload: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(payload);
  return hash.digest('hex');
}
\`\`\`

Here is a detailed explanation of how this function works:
1. First, we import the crypto module from node standard library.
2. Next, we create a SHA-256 hash instance.
3. Then we update the hash buffer with the raw input.
4. Finally, we digest the hash in hexadecimal representation.
In production environments, make sure to benchmark your hashing performance if hashing large blobs.
`;

  console.log('[1/2] Evaluating In-Flight Streaming Text for Code Fence Closure...');
  const result = BroccoliCodeBlockTruncator.evaluateCodeStream(streamedChunk, true);

  console.log(`      - Should Halt Stream: ${result.shouldHaltStream}`);
  console.log(`      - Halt Reason: "${result.haltReason}"`);
  console.log(`      - Captured Code Block:\n${result.codeBlockCaptured}`);
  console.log(`      - Original Stream Tokens: ${result.originalGeneratedTokens} -> Clamped: ${result.clampedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.shouldHaltStream, true);
  assert.equal(result.haltReason, 'CODE_BLOCK_CLOSED_PROGRAMMATIC_HALT');
  assert.ok(result.codeBlockCaptured.includes('calculateChecksum'));
  assert.ok(result.savingsPercentage >= 50);

  console.log('\n[✓] SSE Code Block Closure Detection & Stream Early Clamping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CODE BLOCK TRUNCATOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
