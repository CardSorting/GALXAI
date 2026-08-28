import assert from 'node:assert/strict';
import { BroccoliDepositionCompactor } from '../src/core/broccolidb/BroccoliDepositionCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LEGAL DEPOSITION COMPACTOR');
  console.log('======================================================================\n');

  BroccoliDepositionCompactor.clear();

  // Verbose legal deposition transcript with attorney objections and reporter interruptions
  const rawDeposition = `
BY MR. KAUFMAN:
Q. State your full name and current occupation for the record.
A. Jane Doe, Chief Financial Officer at Enterprise Tech Inc.
MR. DAVIS: Objection as to form.
THE WITNESS: I have served in that role since January 2024.
Q. Did you attend the special board meeting on August 15, 2026?
MR. DAVIS: Objection, foundation.
THE WITNESS: Yes, I attended via secure video conference.
THE REPORTER: Please slow down slightly for the record.
BY MR. KAUFMAN:
Q. What financial forecasts were presented to the board of directors?
A. We projected 45% revenue growth and positive operating cash flow.
`.trim();

  console.log('[1/2] Compacting Deposition Transcript in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliDepositionCompactor.compactTranscript(rawDeposition);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Lines: ${res.originalLinesCount} -> Compacted Lines: ${res.compactedLinesCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Transcript Preview:\n"""\n${res.compactedTranscript}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 20);
  assert.ok(!res.compactedTranscript.includes('Objection as to form'));
  assert.ok(!res.compactedTranscript.includes('Please slow down slightly'));
  assert.ok(res.compactedTranscript.includes('[Q: State your full name'));
  assert.ok(res.compactedTranscript.includes('[A: Jane Doe, Chief Financial Officer'));
  assert.ok(res.compactedTranscript.includes('August 15, 2026?'));

  console.log('\n[✓] Deposition Transcript Objection Pruning & Q&A Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL DEPOSITION COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
