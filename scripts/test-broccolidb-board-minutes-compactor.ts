import assert from 'node:assert/strict';
import { BroccoliBoardMinutesCompactor } from '../src/core/broccolidb/BroccoliBoardMinutesCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB BOARD MINUTES & SHAREHOLDER RESOLUTION COMPACTOR');
  console.log('======================================================================\n');

  BroccoliBoardMinutesCompactor.clear();

  // Full mock Board Minutes & DGCL Unanimous Written Consent with roll call, quorum, and resolutions
  const rawBoardMinutes = `
UNANIMOUS WRITTEN CONSENT OF THE BOARD OF DIRECTORS OF GALXAI TECHNOLOGIES INC.
dated as of August 28, 2026

WHEREAS, the Board of Directors deems it advisable and in the best interests of the Corporation to authorize a Series B Preferred Stock equity financing;

NOW, THEREFORE, BE IT RESOLVED, that the Corporation is authorized to issue up to 5,000,000 shares of Series B Preferred Stock at a purchase price of $10.00 per share;
RESOLVED FURTHER, that the 2026 Equity Incentive Plan is approved and amended to increase the aggregate share reserve by 1,000,000 Common Shares;
RESOLVED FURTHER, that the Chief Executive Officer and Chief Financial Officer are hereby authorized to execute and deliver all transaction documents.

ROLL CALL & RECORD:
Present by videoconference were Directors: John Smith, Elena Rostova, Marcus Vance, Sarah Connor. A quorum was declared present.
The foregoing resolutions were UNANIMOUSLY APPROVED.
[15 pages of boilerplate DGCL procedural findings, notice waivers, and signature counterpart pages...]
`.trim();

  console.log('[1/2] Compacting Board Minutes in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliBoardMinutesCompactor.compactMinutes(rawBoardMinutes);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Entity & Matter: ${res.entityAndMatter}`);
  console.log(`      - Action: ${res.authorizedAction}`);
  console.log(`      - Approval: ${res.votingOutcome}`);
  console.log(`      - Signatories: ${res.authorizedSignatories}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Resolution Preview:\n"""\n${res.compactedResolutionPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.entityAndMatter.includes('GALXAI TECHNOLOGIES INC'));
  assert.ok(res.authorizedAction.includes('Series B Preferred Stock'));
  assert.equal(res.votingOutcome, 'UNANIMOUSLY APPROVED');
  assert.ok(res.savingsPercentage >= 15);
  assert.ok(!res.compactedResolutionPrompt.includes('John Smith, Elena Rostova')); // Roll call pruned

  assert.ok(!res.compactedResolutionPrompt.includes('Present by videoconference')); // Procedural text pruned

  console.log('\n[✓] Board Minutes & Shareholder Resolution Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BOARD MINUTES COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
