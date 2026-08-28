import assert from 'node:assert/strict';
import { BroccoliLegalCitationCompactor } from '../src/core/broccolidb/BroccoliLegalCitationCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LEGAL CITATION AST COMPACTOR');
  console.log('======================================================================\n');

  BroccoliLegalCitationCompactor.clear();

  // Legal litigation memorandum with long-form Bluebook citations and statutory references
  const briefText = `
MEMORANDUM OF LAW IN SUPPORT OF DEFENDANT MOTION TO DISMISS

Under Title 18 of the United States Code, Section 1030(a)(2), the government must demonstrate unauthorized access to a protected computer.
Furthermore, the Supreme Court in Miranda v. Arizona, 384 U.S. 436, 86 S. Ct. 1602, 16 L. Ed. 2d 694 (1966) established fundamental procedural safeguards.
In addition, under the Delaware General Corporation Law, Section 102(b)(7), exculpatory charter provisions shield directors from monetary damages for breach of the fiduciary duty of care.
`.trim();

  console.log('[1/2] Compacting Legal Brief Citations in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliLegalCitationCompactor.compactCitations(briefText);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Brief Preview:\n"""\n${res.compactedBriefText}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 10);
  assert.ok(res.compactedBriefText.includes('[STATUTE: 18 U.S.C. § 1030(a)(2)]'));
  assert.ok(res.compactedBriefText.includes('[STATUTE: DGCL § 102(b)(7)]'));
  assert.ok(res.compactedBriefText.includes('Miranda v. Arizona, 384 U.S. 436 (1966)'));
  assert.ok(!res.compactedBriefText.includes('86 S. Ct. 1602')); // Redundant reporter volumes pruned

  console.log('\n[✓] Legal Case Law & Statutory Citation AST Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LEGAL CITATION COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
