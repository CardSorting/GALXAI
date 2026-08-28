import assert from 'node:assert/strict';
import { BroccoliEarningsCallCompactor } from '../src/core/broccolidb/BroccoliEarningsCallCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CORPORATE EARNINGS CALL COMPACTOR');
  console.log('======================================================================\n');

  BroccoliEarningsCallCompactor.clear();

  // Full mock corporate earnings call transcript with operator instructions, safe harbor disclosures, and Q&A
  const rawEarningsTranscript = `
NVIDIA Corp (NVDA) Q2 2026 Financial Results Conference Call
August 28, 2026 | 5:00 PM ET

OPERATOR:
Good afternoon, ladies and gentlemen, and welcome to the NVIDIA Second Quarter 2026 Financial Results Conference Call. At this time, all participants are in a listen-only mode. Later, we will conduct a question-and-answer session. I would now like to turn the call over to Simona Jankowski, Vice President of Investor Relations.

SIMONA JANKOWSKI:
Thank you, and good afternoon everyone. Welcome to our conference call. Be advised that during this call, we may make forward-looking statements based on current expectations. These statements are subject to risks and uncertainties described in our Form 10-K...

COLETTE KRESS (CFO):
Revenue for the second quarter was a record $30.0 Billion, up 122% year-over-year. Diluted EPS was $0.68, up 152% year-over-year. Gross Margin was 75.1%.

FORWARD GUIDANCE:
For the third quarter of fiscal 2026, we expect Revenue: $32.5 Billion, plus or minus 2%. GAAP and non-GAAP gross margins are expected to be 74.4% and 75.0%, respectively.

QUESTION-AND-ANSWER SESSION:
Toshiya Hari - Goldman Sachs:
Good afternoon, and congrats on another fantastic quarter. Jensen, how should we think about Blackwell architecture ramp timing and gross margins over the next two quarters?

Jensen Huang - CEO:
Blackwell production ramp is scheduled to begin in Q4 and continue into fiscal 2027. Demand for Blackwell is well above supply, and we expect several billion dollars of Blackwell revenue in Q4. Hopper demand remains exceptional.
`.trim();

  console.log('[1/2] Compacting Earnings Call in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliEarningsCallCompactor.compactEarningsCall(rawEarningsTranscript);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Event: ${res.companyAndQuarter}`);
  console.log(`      - Financials: ${res.financialResults}`);
  console.log(`      - Guidance: ${res.guidanceUpdate}`);
  console.log(`      - Key Q&A: ${res.keyQnaExchanges.length}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Earnings Preview:\n"""\n${res.compactedEarningsPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 15);
  assert.ok(res.compactedEarningsPrompt.includes('NVIDIA Corp'));

  assert.ok(res.compactedEarningsPrompt.includes('Revenue: $30.0 Billion'));
  assert.ok(res.compactedEarningsPrompt.includes('$32.5 Billion'));
  assert.ok(!res.compactedEarningsPrompt.includes('all participants are in a listen-only mode')); // Operator intro pruned
  assert.ok(!res.compactedEarningsPrompt.includes('Be advised that during this call, we may make forward-looking statements')); // Safe harbor pruned

  console.log('\n[✓] Corporate Earnings Call Transcript Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL EARNINGS CALL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
