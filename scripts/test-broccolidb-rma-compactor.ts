import assert from 'node:assert/strict';
import { BroccoliRmaCompactor } from '../src/core/broccolidb/BroccoliRmaCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB RETURNS & RMA POLICY COMPACTOR');
  console.log('======================================================================\n');

  BroccoliRmaCompactor.clear();

  // Full e-commerce returns and warranty policy document with warehouse receiving addresses and customs legal disclaimers
  const rawReturnPolicy = `
GLOBAL E-COMMERCE RETURN & WARRANTY POLICY (REVISION 2026.4)

RETURN WINDOW & ELIGIBILITY:
Customers may initiate a return within 30 days of the delivery date recorded by the carrier.
Items must be in unopened original packaging with all manufacturer warranty cards, accessories, and tags attached.

EXCEPTIONS & NON-RETURNABLE ITEMS:
Digital software licenses, gift cards, clearance final sale items, and opened hygienic products cannot be returned or exchanged under any circumstances.

REFUND PROCESSING:
Approved returns will be processed within 5-7 business days to the original payment method used at checkout.

WAREHOUSE RECEIVING & LOGISTICS INSTRUCTIONS:
All authorized RMA returns must be securely packaged and shipped to:
Global Fulfillment Logistics Center
Attn: Returns Processing Dept - Dock 4
100 Industrial Parkway, Suite 500
Plainfield, IN 46168

RESTOCKING FEES & CUSTOMS DECLARATIONS:
International returns must include customs form CN22 with Harmonized Tariff Code 9801.00.10.
A 15% restocking fee applies to open-box commercial enterprise equipment.
`.trim();

  console.log('[1/2] Compacting Return Policy Document in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliRmaCompactor.compactRmaPolicy(rawReturnPolicy);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Return Window: ${res.returnWindow}`);
  console.log(`      - Refund Method: ${res.refundMethod}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted RMA Preview:\n"""\n${res.compactedRmaPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.returnWindow, '30 days');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedRmaPrompt.includes('30 days'));
  assert.ok(res.compactedRmaPrompt.includes('unopened original packaging'));
  assert.ok(res.compactedRmaPrompt.includes('Digital software licenses'));
  assert.ok(!res.compactedRmaPrompt.includes('Plainfield, IN 46168')); // Warehouse address pruned

  assert.ok(!res.compactedRmaPrompt.includes('CN22 with Harmonized Tariff')); // Customs boilerplate pruned

  console.log('\n[✓] Returns & RMA Policy Matrix Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL RMA COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
