import assert from 'node:assert/strict';
import { BroccoliPurchaseOrderCompactor } from '../src/core/broccolidb/BroccoliPurchaseOrderCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PURCHASE ORDER & 3-WAY MATCH COMPACTOR');
  console.log('======================================================================\n');

  BroccoliPurchaseOrderCompactor.clear();

  // Full mock enterprise Purchase Order with UCC terms, packaging instructions, and 3-way match
  const rawPo = `
ENTERPRISE PROCUREMENT PURCHASE ORDER
PURCHASE ORDER NUMBER: PO-2026-94820 | DATE: 08/28/2026
VENDOR: Supermicro Computer Inc, San Jose, CA
BUYER: GALXAI Infrastructure Procurement, Chicago, IL

LINE ITEMS & COMMITMENT:
Line 1: 50x GPU AI Server Nodes (HGX H100 8-GPU 80GB SXM5) @ $32,000.00/ea
Line 2: 100x 400GbE QSFP-DD Transceiver Optics @ $800.00/ea
TOTAL AMOUNT: $1,680,000.00

DELIVERY & PAYMENT SCHEDULE:
DELIVERY DATE: 09/15/2026
PAYMENT TERMS: Net 45 Days (FOB Destination)
SHIPPING METHOD: White Glove Freight Air Expedited

ACCOUNTS PAYABLE 3-WAY RECONCILIATION:
GRN STATUS: GRN-884920 Received 50 nodes + 100 optics (100% matched)
INVOICE MATCH: Invoice INV-SM-94820 matches PO & GRN at $1,680,000.00

TERMS AND CONDITIONS (UNIFORM COMMERCIAL CODE):
Acceptance of this Purchase Order constitutes an express agreement to all terms and conditions set forth herein. Seller warrants all goods shall be free from defects in material and workmanship for a period of 36 months from delivery date.
AUTHORIZED PROCUREMENT OFFICER: [ELECTRONIC SAP SIGNATURE #94820]
`.trim();

  console.log('[1/2] Compacting Purchase Order in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliPurchaseOrderCompactor.compactPo(rawPo);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Requisition: ${res.poNumberAndVendor}`);
  console.log(`      - Line Items: ${res.lineItemsAndCost}`);
  console.log(`      - Terms: ${res.deliveryAndTerms}`);
  console.log(`      - Match State: ${res.threeWayMatchState}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted PO Preview:\n"""\n${res.compactedPoPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.poNumberAndVendor.includes('PO-2026-94820'));
  assert.ok(res.poNumberAndVendor.includes('Supermicro'));
  assert.ok(res.lineItemsAndCost.includes('$1,680,000.00'));
  assert.ok(res.deliveryAndTerms.includes('09/15/2026'));
  assert.ok(res.deliveryAndTerms.includes('Net 45 Days'));
  assert.ok(res.threeWayMatchState.includes('GRN-884920'));
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(!res.compactedPoPrompt.includes('Acceptance of this Purchase Order constitutes')); // UCC boilerplate pruned

  assert.ok(!res.compactedPoPrompt.includes('White Glove Freight')); // Shipping details pruned

  console.log('\n[✓] Purchase Order & 3-Way Match Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PURCHASE ORDER COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
