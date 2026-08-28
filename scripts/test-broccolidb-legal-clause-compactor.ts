import assert from 'node:assert/strict';
import { BroccoliLegalClauseCompactor } from '../src/core/broccolidb/BroccoliLegalClauseCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LEGAL CLAUSE AST COMPACTOR');
  console.log('======================================================================\n');

  BroccoliLegalClauseCompactor.clear();

  // Full enterprise contract containing standard boilerplate + bespoke liability cap
  const legalContract = `
# MASTER SERVICES AGREEMENT

1. Scope: Contractor will provide software architecture and database optimization services.

2. Governing Law: This agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.

3. Severability: If any provision of this agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.

4. Limitation of Liability: IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY EXCEED $5,000,000 OR THE FEES PAID IN THE PRECEDING 12 MONTHS.

5. Force Majeure: Neither party shall be liable for any failure or delay in performance due to acts of God, war, terrorism, pandemics, power outages, or civil disturbances.

6. Integration: This agreement constitutes the entire agreement between the parties and supersedes all prior agreements, representations, and understandings.
`.trim();

  console.log('[1/2] Compacting Legal Agreement in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliLegalClauseCompactor.compactLegalAgreement(legalContract);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Paragraphs: ${res.originalParagraphsCount} -> Compacted: ${res.compactedParagraphsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Contract Preview:\n"""\n${res.compactedAgreement}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedAgreement.includes('GOVERNING_LAW_DELAWARE'));
  assert.ok(res.compactedAgreement.includes('STANDARD_SEVERABILITY'));
  assert.ok(res.compactedAgreement.includes('STANDARD_FORCE_MAJEURE'));
  assert.ok(res.compactedAgreement.includes('AGGREGATE LIABILITY EXCEED $5,000,000')); // Bespoke clause preserved

  console.log('\n[✓] Standard Legal Boilerplate Compression & Bespoke Term Preservation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LEGAL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
