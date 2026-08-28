import assert from 'node:assert/strict';
import { BroccoliUrlaCompactor } from '../src/core/broccolidb/BroccoliUrlaCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB URLA FORM 1003 MORTGAGE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliUrlaCompactor.clear();

  // Full mock Fannie Mae Form 1003 URLA with HMDA demographics, language preferences, and underwriting metrics
  const rawUrla = `
UNIFORM RESIDENTIAL LOAN APPLICATION (FANNIE MAE FORM 1003 / FREDDIE MAC FORM 65)
Lender: Rocket Mortgage LLC | NMLS ID: 3030

SECTION 1: BORROWER INFORMATION
Borrower Name: Jane Doe
Social Security Number: ***-**-8492 | Date of Birth: 04/12/1986
Citizenship: US Citizen | Marital Status: Married

SECTION 2: FINANCIAL INFORMATION - EMPLOYMENT AND INCOME
Employer: Google LLC (Software Engineering Director) | Years on Job: 6.5
Total Gross Monthly Income: $22,500.00 (Base: $18,000, RSUs/Bonus: $4,500)

SECTION 3: FINANCIAL INFORMATION - ASSETS AND LIABILITIES
Total Liquid Assets: $385,000.00 (Checking/Savings: $110,000, Brokerage: $275,000)
Total Monthly Liabilities: $2,450.00 (Auto Loan: $650, Student Loan: $400, Credit Cards: $1,400)
Calculated DTI Ratio: 26.2% / 34.8%

SECTION 4: LOAN AND PROPERTY INFORMATION
Subject Property: 742 Evergreen Terrace, Springfield, OR 97477
Loan Amount: $720,000.00
Purchase Price: $900,000.00
Loan-To-Value (LTV): 80.0%
Loan Program: Conventional 30-Year Fixed Conforming

SECTION 7: MILITARY SERVICE & GOVERNMENT MONITORING (HMDA)
Ethnicity: Hispanic or Latino | Race: White | Sex: Female
Language Preference: English
Demographic monitoring info collected via visual observation/surname under federal law.
`.trim();

  console.log('[1/2] Compacting URLA Form 1003 in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliUrlaCompactor.compactUrla(rawUrla);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Borrower: ${res.borrowerName}`);
  console.log(`      - Monthly Income: ${res.monthlyIncome}`);
  console.log(`      - Monthly Debts: ${res.totalMonthlyDebts}`);
  console.log(`      - DTI Ratio: ${res.dtiRatio}`);
  console.log(`      - Verified Assets: ${res.verifiedAssets}`);
  console.log(`      - Loan Details: ${res.ltvAndLoanDetails}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted URLA Preview:\n"""\n${res.compactedUrlaPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.borrowerName, 'Jane Doe');
  assert.equal(res.monthlyIncome, '$22,500.00');
  assert.equal(res.totalMonthlyDebts, '$2,450.00');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedUrlaPrompt.includes('Jane Doe'));
  assert.ok(res.compactedUrlaPrompt.includes('$22,500.00'));
  assert.ok(!res.compactedUrlaPrompt.includes('Ethnicity: Hispanic or Latino')); // HMDA disclosures pruned
  assert.ok(!res.compactedUrlaPrompt.includes('Demographic monitoring info')); // Demographic monitoring pruned


  console.log('\n[✓] URLA Form 1003 Mortgage Underwriting Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL URLA COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
