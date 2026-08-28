import assert from 'node:assert/strict';
import { BroccoliNdaCompactor } from '../src/core/broccolidb/BroccoliNdaCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MUTUAL NDA CONTRACT COMPACTOR');
  console.log('======================================================================\n');

  BroccoliNdaCompactor.clear();

  // Full mock Mutual NDA with term duration, non-solicit restriction, governing law, and boilerplate definitions
  const rawNdaText = `
MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of August 28, 2026, by and between Acme Corp and Beta Enterprise LLC.

1. Definition of Confidential Information:
"Confidential Information" means all non-public, proprietary, or confidential information disclosed by either party to the other...
[4 pages of standard exclusions: publicly known, already in possession, independently developed...]

2. Term and Termination:
The obligations of confidentiality under this Agreement shall survive and continue for a period of 3 years following the date of disclosure.

3. Non-Solicitation:
During the term of this Agreement and for a period of 12 months thereafter, neither party shall directly or indirectly solicit, hire, or recruit any key employee or software engineer of the other party without prior written consent.

4. Governing Law and Jurisdiction:
This Agreement shall be governed by and construed in accordance with the internal laws of the State of Delaware, without regard to conflicts of law principles.

5. Injunctive Relief:
The parties acknowledge that unauthorized disclosure of Confidential Information may cause irreparable harm for which monetary damages alone would be inadequate...
`.trim();

  console.log('[1/2] Compacting Mutual NDA Contract in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliNdaCompactor.compactNda(rawNdaText);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Directionality: ${res.directionality}`);
  console.log(`      - Term Duration: ${res.termDuration}`);
  console.log(`      - Has Non-Solicit: ${res.hasNonSolicit}`);
  console.log(`      - Governing Law: ${res.governingLaw}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted NDA Preview:\n"""\n${res.compactedNdaPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.directionality, 'Mutual Non-Disclosure');
  assert.equal(res.termDuration, '3 years');
  assert.equal(res.hasNonSolicit, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedNdaPrompt.includes('Mutual Non-Disclosure'));
  assert.ok(res.compactedNdaPrompt.includes('3 years'));
  assert.ok(res.compactedNdaPrompt.includes('RESTRICTED'));
  assert.ok(res.compactedNdaPrompt.includes('Delaware'));
  assert.ok(!res.compactedNdaPrompt.includes('irreparable harm for which monetary damages')); // Injunctive relief boilerplate pruned

  console.log('\n[✓] Mutual NDA Negotiated Term Matrix Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL NDA COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
