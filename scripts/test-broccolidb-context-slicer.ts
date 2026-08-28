import assert from 'node:assert/strict';
import { BroccoliContextSlicer } from '../src/core/broccolidb/BroccoliContextSlicer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CONTEXT SLICER & SECTION AST PRUNER');
  console.log('======================================================================\n');

  BroccoliContextSlicer.clear();

  // Create a 10-section 3,000-token enterprise SaaS legal agreement
  const fullAgreementDocument = `
# Master Services Agreement
This agreement is entered into between GALXAI and the Enterprise Customer.

## Section 1: Service Level Guarantees
GALXAI guarantees 99.999% uptime availability across all primary cloud regions.
Heartbeat pings are evaluated every 250ms with sub-microsecond failover.

## Section 2: Data Encryption & Sovereign Privacy
All customer PII and database snapshots are encrypted at rest with AES-256-GCM.
Keys are rotated every 90 days in hardware security modules (HSMs).

## Section 3: Billing & Invoicing
Invoices are generated on the 1st of each calendar month and payable net-30.
Late fees accrue at 1.5% per month on outstanding balances.

## Section 4: Refund Policy and Subscription Cancellation
Customers may cancel their subscription at any time with 30 days written notice.
Eligible unused credit balances will be refunded pro-rata to the original payment method within 5 business days.

## Section 5: Limitation of Liability
Neither party shall be liable for indirect, incidental, or consequential damages.
Total aggregate liability is capped at the total amount paid in the preceding 12 months.
`.repeat(5); // ~3,000 tokens

  const userQuery = 'What is the refund policy and notice period under Section 4?';

  console.log('[1/2] Slicing 3,000-Token Document for Query: "' + userQuery + '"...');
  const result = BroccoliContextSlicer.sliceDocumentForQuery(fullAgreementDocument, userQuery);

  console.log(`      - Was Sliced: ${result.wasSliced}`);
  console.log(`      - Matched Section: "${result.targetSectionHeading}"`);
  console.log(`      - Original Document Tokens: ${result.originalDocumentTokens} -> Sliced: ${result.slicedTokens}`);
  console.log(`      - Tokens Slashed: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Sliced Context Text:\n"""\n${result.slicedContextText.slice(0, 200)}...\n"""`);

  assert.equal(result.wasSliced, true);
  assert.ok(result.targetSectionHeading?.includes('Refund Policy'));
  assert.ok(result.savingsPercentage >= 80);
  assert.ok(result.slicedContextText.includes('30 days written notice'));

  console.log('\n[✓] Structural Context Slicing & Heading AST Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CONTEXT SLICER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
