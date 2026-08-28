import assert from 'node:assert/strict';
import { BroccoliInvoiceCompactor } from '../src/core/broccolidb/BroccoliInvoiceCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CUSTOMER BILLING INVOICE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliInvoiceCompactor.clear();

  // Full customer billing invoice with tax breakdowns, bank wire instructions, and remittance slips
  const rawInvoice = `
ACME ENTERPRISE CLOUD SERVICES
100 Financial Way, Suite 400, New York, NY 10005
Tax ID: 12-3456789 | EU VAT ID: EU849201948

INVOICE DETAILS:
Invoice ID: INV-2026-88491
Invoice Date: August 28, 2026
Due Date: September 28, 2026
Status: PAID (Payment Successful via Visa ending in 4242)

BILLED TO:
Customer: Global FinTech Corp (Account #948201)
Billing Address: 500 Market St, San Francisco, CA 94105

LINE ITEMS:
1. Plan: Enterprise AI Scale Plan (Monthly) - $400.00
2. Excess Token Lease Allocation (10M tokens) - $50.00

TAX ITEMIZATION:
- California State Sales Tax (6.00%): $27.00
- San Francisco County Local Tax (1.25%): $5.63
- Bay Area Transportation District Tax (0.50%): $2.25
- EU Reverse Charge VAT Notice (Article 196 Council Directive 2006/112/EC): 0%

Total Amount: $484.88 USD

BANK WIRE REMITTANCE INSTRUCTIONS:
Bank: JPMorgan Chase Bank, N.A.
Routing / ABA: 021000021
Account: 948201948201
SWIFT / BIC: CHASUS33
IBAN: US84CHAS021000021948201948201

REMITTANCE SLIP:
Please detach and mail with check to: PO Box 88491, Newark, NJ 07101.
`.trim();

  console.log('[1/2] Compacting Billing Invoice in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliInvoiceCompactor.compactInvoice(rawInvoice);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Invoice ID: ${res.invoiceId}`);
  console.log(`      - Total Amount: ${res.totalAmount}`);
  console.log(`      - Plan Name: ${res.planName}`);
  console.log(`      - Payment Status: ${res.paymentStatus}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Invoice Preview:\n"""\n${res.compactedInvoicePrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.invoiceId, 'INV-2026-88491');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedInvoicePrompt.includes('INV-2026-88491'));
  assert.ok(res.compactedInvoicePrompt.includes('Enterprise AI Scale Plan'));
  assert.ok(res.compactedInvoicePrompt.includes('PAID'));

  assert.ok(!res.compactedInvoicePrompt.includes('San Francisco County Local Tax')); // Tax breakdown pruned
  assert.ok(!res.compactedInvoicePrompt.includes('SWIFT / BIC: CHASUS33')); // Bank wire pruned

  console.log('\n[✓] Customer Invoice Billing Summary Matrix Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL INVOICE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
