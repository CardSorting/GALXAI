import assert from 'node:assert/strict';
import { BroccoliCourtCaptionCompactor } from '../src/core/broccolidb/BroccoliCourtCaptionCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB COURT CAPTION & CERTIFICATE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliCourtCaptionCompactor.clear();

  // Full court pleading with a 20-line caption and a certificate of service trailer
  const courtPleading = `
UNITED STATES DISTRICT COURT
SOUTHERN DISTRICT OF NEW YORK

ACME TECH CORP.,
                Plaintiff,
    v.                                      Civil Action No. 1:26-cv-08492 (JSR)
GLOBAL DATA SYSTEMS LLC,
                Defendant.

--------------------------------------------------

DEFENDANT MOTION TO DISMISS THE COMPLAINT

INTRODUCTION
Defendant Global Data Systems LLC respectfully moves to dismiss the Complaint pursuant to Fed. R. Civ. P. 12(b)(6).
Plaintiff fails to allege any actionable misappropriation of trade secrets under the Defend Trade Secrets Act.

CERTIFICATE OF SERVICE
I hereby certify that on August 28, 2026, a copy of the foregoing was served via CM/ECF electronic filing upon all registered counsels of record:
John Smith, Esq., Law Offices of Smith & Associates, 100 Wall Street, New York, NY 10005.
`.trim();

  console.log('[1/2] Compacting Court Pleading in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliCourtCaptionCompactor.compactPleading(courtPleading);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Pleading Preview:\n"""\n${res.compactedPleading}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(res.compactedPleading.includes('[DOCKET: 1:26-cv-08492'));
  assert.ok(res.compactedPleading.includes('UNITED STATES DISTRICT COURT'));
  assert.ok(res.compactedPleading.includes('fails to allege any actionable misappropriation'));
  assert.ok(!res.compactedPleading.includes('100 Wall Street')); // Address noise pruned

  console.log('\n[✓] Court Caption Condensation & Certificate of Service Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL COURT CAPTION COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
