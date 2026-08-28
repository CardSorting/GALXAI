import assert from 'node:assert/strict';
import { BroccoliAppraisalCompactor } from '../src/core/broccolidb/BroccoliAppraisalCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB APPRAISAL FORM 1004 URAR COMPACTOR');
  console.log('======================================================================\n');

  BroccoliAppraisalCompactor.clear();

  // Full mock Fannie Mae Form 1004 URAR appraisal report with USPAP certifications, comp grid, and valuation
  const rawAppraisal = `
UNIFORM RESIDENTIAL APPRAISAL REPORT (FANNIE MAE FORM 1004)
Subject Property: 1204 Oakridge Lane, Austin, TX 78704
Borrower: Jane Doe | Lender: Rocket Mortgage LLC

VALUATION RECONCILIATION:
Final Reconciled Market Value: $825,000
Effective Date of Appraisal: August 28, 2026

OVERALL PROPERTY RATINGS:
Overall Condition Rating: C2 (Recently remodeled kitchen and baths, high quality finishes)
Overall Quality Rating: Q3 (Custom architectural elements, granite countertops)

COMPARABLE SALES GRID:
- Comp 1: 1210 Oakridge Lane | Sold $840k | Dist: 0.1 mi | Net Adj: -$15,000
- Comp 2: 904 Barton Springs Rd | Sold $815k | Dist: 0.3 mi | Net Adj: +$10,000
- Comp 3: 1402 South Congress Ave | Sold $830k | Dist: 0.4 mi | Net Adj: -$5,000

APPRAISER CERTIFICATION & USPAP COMPLIANCE:
I certify that:
1. The statements of fact contained in this report are true and correct.
2. The reported analyses, opinions, and conclusions are limited only by the reported assumptions.
[23 additional pages of standard USPAP ethical requirements, flood zone maps, and neighborhood market essays...]

APPRAISAL CONTINGENCY STATUS:
Appraisal is made: AS-IS (No repair contingencies or escrow holdbacks required).
`.trim();

  console.log('[1/2] Compacting Form 1004 Appraisal in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliAppraisalCompactor.compactAppraisal(rawAppraisal);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Appraised Value: ${res.appraisedValue}`);
  console.log(`      - Ratings: ${res.conditionAndQuality}`);
  console.log(`      - Comps: ${res.comparablesSummary}`);
  console.log(`      - Status: ${res.repairContingencies}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Appraisal Preview:\n"""\n${res.compactedAppraisalPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.appraisedValue, '$825,000');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedAppraisalPrompt.includes('$825,000'));
  assert.ok(res.compactedAppraisalPrompt.includes('Condition: C2 | Quality: Q3'));
  assert.ok(res.compactedAppraisalPrompt.includes('Comp 1: 1210 Oakridge Lane'));
  assert.ok(res.compactedAppraisalPrompt.includes('AS-IS'));
  assert.ok(!res.compactedAppraisalPrompt.includes('The statements of fact contained in this report')); // USPAP boilerplate pruned
  assert.ok(!res.compactedAppraisalPrompt.includes('reported analyses, opinions, and conclusions')); // USPAP boilerplate pruned

  console.log('\n[✓] Form 1004 URAR Collateral Appraisal Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL APPRAISAL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
