import assert from 'node:assert/strict';
import { BroccoliEdgarCompactor } from '../src/core/broccolidb/BroccoliEdgarCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SEC EDGAR 10-K/10-Q FILING COMPACTOR');
  console.log('======================================================================\n');

  BroccoliEdgarCompactor.clear();

  // Full mock SEC 10-K with Item 1, Item 1A, Item 7, and Item 15 Exhibits
  const raw10KFiling = `
UNITED STATES SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549
FORM 10-K

ITEM 1. BUSINESS
Acme Enterprise Corp is a leading provider of autonomous AI FinOps control planes founded in 2024. We operate globally across North America and Europe.

ITEM 1A. RISK FACTORS
Our business faces material risks including:
1. Rapid shifts in foundational LLM token pricing models could impact our gross margins.
2. Failure to prevent catastrophic runaway spend loops could expose our customers to unexpected compute charges.
3. Cybersecurity threats and data privacy regulations (GDPR, HIPAA, CCPA) could impose compliance liabilities.

ITEM 2. PROPERTIES
We lease data center facilities in Ashburn, VA and Dublin, Ireland.

ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION
For the fiscal year ended December 31, 2025, our AI token optimization platform reduced enterprise customer spend by $42,500,000, representing a 240% year-over-year expansion in ARR.

ITEM 15. EXHIBITS AND FINANCIAL STATEMENT SCHEDULES
Exhibit 3.1 Certificate of Incorporation
Exhibit 4.1 Description of Securities
Exhibit 10.1 Master Cloud Hosting Agreement with Amazon Web Services
Exhibit 10.2 Master Cloud Hosting Agreement with Microsoft Azure
[150 more exhibits omitted...]

SIGNATURES
Pursuant to the requirements of Section 13 or 15(d) of the Securities Exchange Act of 1934.
`.trim();

  console.log('[1/2] Slicing SEC 10-K Filing in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliEdgarCompactor.sliceFiling(raw10KFiling, ['1A', '7']);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Target Items Found: ${res.targetItemsFound.join(', ')}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Filing Preview:\n"""\n${res.compactedFilingPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.targetItemsFound.length, 2);
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(res.compactedFilingPrompt.includes('ITEM 1A:'));
  assert.ok(res.compactedFilingPrompt.includes('Rapid shifts in foundational LLM token pricing'));
  assert.ok(res.compactedFilingPrompt.includes('ITEM 7:'));
  assert.ok(res.compactedFilingPrompt.includes('reduced enterprise customer spend by $42,500,000'));
  assert.ok(!res.compactedFilingPrompt.includes('ITEM 15. EXHIBITS')); // Exhibits pruned
  assert.ok(!res.compactedFilingPrompt.includes('ITEM 2. PROPERTIES')); // Non-target item pruned

  console.log('\n[✓] SEC EDGAR Item Slicing & Exhibit Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SEC EDGAR COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
