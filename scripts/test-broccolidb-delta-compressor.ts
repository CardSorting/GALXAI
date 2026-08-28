import assert from 'node:assert/strict';
import { BroccoliDeltaCompressor } from '../src/core/broccolidb/BroccoliDeltaCompressor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB STRUCTURAL DELTA COMPACTOR & STATE DIFFERENCER');
  console.log('======================================================================\n');

  BroccoliDeltaCompressor.clear();

  // Create a 400-word legal terms document
  const originalDoc = `
TERMS OF SERVICE AND SERVICE LEVEL AGREEMENT (SLA)
1. Uptime Commitment: We guarantee 99.9% uptime per calendar month.
2. Rate Limits: Standard tier accounts are limited to 120 requests per minute.
3. Pricing & Billing: Tokens are billed at standard wholesale rates.
4. Support Response Times: P0 tickets are answered within 1 hour.
5. Termination: Either party may terminate with 30 days written notice.
`.repeat(10); // ~2500 chars

  // User edits only line 2 (from 120 to 500 req/min)
  const editedDoc = originalDoc.replace(/120 requests per minute/g, '500 requests per minute');

  console.log('[1/2] Computing Compact Delta Patch on 400-Word Document Edit...');
  const result = BroccoliDeltaCompressor.computeDelta('doc_legal_sla_001', 2, originalDoc, editedDoc);

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Full Document Tokens: ${result.fullLengthTokens} tokens`);
  console.log(`      - Delta Patch Tokens: ${result.deltaTokens} tokens`);
  console.log(`      - Tokens Saved in Context: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasCompacted, true);
  assert.ok(result.savingsPercentage >= 70);
  assert.ok(result.patchRepresentation.includes('[+ 500]'));

  console.log('\n[✓] Structural Delta Compression & Incremental State Differencing Verified.');

  console.log('\n======================================================================');
  console.log('   ALL DELTA COMPRESSOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
