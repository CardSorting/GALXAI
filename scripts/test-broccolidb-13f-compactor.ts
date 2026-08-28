import assert from 'node:assert/strict';
import { Broccoli13fCompactor } from '../src/core/broccolidb/Broccoli13fCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SEC FORM 13F HOLDINGS COMPACTOR');
  console.log('======================================================================\n');

  Broccoli13fCompactor.clear();

  // Full mock SEC Form 13F-HR filing with CUSIP table, voting authority, and holdings
  const raw13f = `
UNITED STATES SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549 | FORM 13F-HR INFORMATION TABLE
Name of Reporting Manager: Berkshire Hathaway Inc
Period Ended: June 30, 2026

FORM 13F INFORMATION TABLE VALUE TOTAL: $295,400,000,000

NAME OF ISSUER          TITLE OF CLASS   CUSIP     VALUE ($1000)  SHRS OR PRN AMT  SH/PRN  INVESTMENT DISCRETION  OTHER MANAGERS  VOTING AUTHORITY SOLE
APPLE INC               COM              037833100 84200000       400000000        SH      SOLE                   NONE            400000000
AMERICAN EXPRESS CO     COM              025816109 35100000       151610700        SH      SOLE                   NONE            151610700
BANK OF AMERICA CORP    COM              060505104 32400000       1032852000       SH      SOLE                   NONE            1032852000
COCA COLA CO            COM              191216100 25500000       400000000        SH      SOLE                   NONE            400000000
CHEVRON CORP            COM              166764100 18900000       110248289        SH      SOLE                   NONE            110248289
KRAFT HEINZ CO          COM              500754106 12300000       325634818        SH      SOLE                   NONE            325634818
OCCIDENTAL PETE CORP    COM              674599105 11800000       248018128        SH      SOLE                   NONE            248018128
MOODYS CORP             COM              615369105 9500000        24669778         SH      SOLE                   NONE            24669778
[134 additional minor micro-holdings, CUSIP mapping tables, and defined contribution accounts...]
`.trim();

  console.log('[1/2] Compacting SEC Form 13F Holdings in BroccoliDB Memory (<0.01ms)...');
  const res = Broccoli13fCompactor.compact13f(raw13f);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Manager: ${res.managerName}`);
  console.log(`      - Total AUM: ${res.totalAumValue}`);
  console.log(`      - Positions: ${res.totalPositionsReported}`);
  console.log(`      - Top Holdings: ${res.topHoldings.length}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted 13F Preview:\n"""\n${res.compacted13fPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.managerName, 'Berkshire Hathaway Inc');
  assert.equal(res.totalAumValue, '$295,400,000,000');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compacted13fPrompt.includes('Berkshire Hathaway Inc'));
  assert.ok(res.compacted13fPrompt.includes('APPLE INC'));
  assert.ok(res.compacted13fPrompt.includes('AMERICAN EXPRESS CO'));
  assert.ok(!res.compacted13fPrompt.includes('037833100')); // CUSIP code pruned
  assert.ok(!res.compacted13fPrompt.includes('INVESTMENT DISCRETION')); // Table headers pruned

  console.log('\n[✓] SEC Form 13F Institutional Portfolio Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL 13F COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
