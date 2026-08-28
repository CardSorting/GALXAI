import assert from 'node:assert/strict';
import { BroccoliSettlementCompactor } from '../src/core/broccolidb/BroccoliSettlementCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SETTLEMENT & CLOSING COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSettlementCompactor.clear();

  // Full mock ALTA / HUD-1 settlement statement with micro-fees, recording taxes, and loan numbers
  const rawSettlement = `
ALTA COMBINED SETTLEMENT STATEMENT - ESCROW CLOSING
File Number: 2026-FL-94820 | Title Agency: First American Title Insurance Company
Settlement Date: August 28, 2026

FINANCIAL TRANSACTION SUMMARY:
Contract Sales Price: $850,000.00
Principal Amount of New Loan: $680,000.00 (First Mortgage, 30-Yr Fixed @ 5.75%)
Deposit / Earnest Money: $50,000.00
Cash from Borrower: $192,450.00

ITEMIZED CLOSING COSTS & PRORATIONS:
- County Recording Fee (Deed): $28.50
- County Recording Fee (Mortgage): $64.00
- State Documentary Stamp Tax on Deed: $5,950.00
- State Intangible Tax on Mortgage: $1,360.00
- Title Examination Fee: $250.00
- Lender Title Insurance Policy: $1,425.00
- Overnight Courier Delivery Fee: $45.00
- Mobile Notary Signing Fee: $150.00
- Wire Transfer Inbound/Outbound Fee: $50.00
- Prorated County Real Estate Taxes (01/01/26 to 08/28/26): $4,120.33

TOTAL SETTLEMENT CHARGES: $13,442.83
`.trim();

  console.log('[1/2] Compacting ALTA Settlement Statement in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliSettlementCompactor.compactSettlement(rawSettlement);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Purchase Price: ${res.purchasePrice}`);
  console.log(`      - Loan Amount: ${res.loanAmount}`);
  console.log(`      - Cash to Close: ${res.cashToClose}`);
  console.log(`      - Settlement Date: ${res.settlementDate}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Settlement Preview:\n"""\n${res.compactedSettlementPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.purchasePrice, '$850,000.00');
  assert.equal(res.loanAmount, '$680,000.00');
  assert.equal(res.cashToClose, '$192,450.00');
  assert.equal(res.settlementDate, 'August 28, 2026');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedSettlementPrompt.includes('$850,000.00'));
  assert.ok(res.compactedSettlementPrompt.includes('$680,000.00'));
  assert.ok(res.compactedSettlementPrompt.includes('$192,450.00'));
  assert.ok(res.compactedSettlementPrompt.includes('August 28, 2026'));
  assert.ok(!res.compactedSettlementPrompt.includes('Overnight Courier Delivery Fee: $45.00')); // Itemized fees pruned
  assert.ok(!res.compactedSettlementPrompt.includes('Prorated County Real Estate Taxes')); // Prorations pruned

  console.log('\n[✓] Settlement & Closing Statement Matrix Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SETTLEMENT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
