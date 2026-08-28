import assert from 'node:assert/strict';
import { BroccoliOrderTrackingCompactor } from '../src/core/broccolidb/BroccoliOrderTrackingCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CUSTOMER ORDER TRACKING COMPACTOR');
  console.log('======================================================================\n');

  BroccoliOrderTrackingCompactor.clear();

  // Multi-scan carrier tracking log with 10 intermediate transit hub events
  const rawTrackingLog = `
FedEx Ground Tracking #789104820194

[2026-08-20 04:12] Scan: Shipment information sent to FedEx
[2026-08-20 18:30] Scan: Picked up by carrier at origin facility, Memphis TN
[2026-08-21 02:15] Scan: Arrived at FedEx sort facility, Indianapolis IN
[2026-08-21 08:44] Scan: Departed sort facility, Indianapolis IN
[2026-08-22 14:10] Scan: In transit, Des Moines IA
[2026-08-23 09:20] Scan: Arrived at sort facility, Denver CO
[2026-08-24 16:30] Scan: Departed sort facility, Salt Lake City UT
[2026-08-25 11:00] Scan: In transit, Boise ID
[2026-08-26 03:15] Scan: Arrived at destination facility, Seattle WA
[2026-08-27 06:30] Scan: On FedEx vehicle for delivery, Seattle WA
[2026-08-27 14:15] Scan: Delivered - Front Porch. Signature: Not Required
`.trim();

  console.log('[1/2] Compacting Carrier Tracking Log in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliOrderTrackingCompactor.compactTrackingHistory(rawTrackingLog);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Carrier: ${res.carrierName} | Tracking #: ${res.trackingNumber}`);
  console.log(`      - Milestone Status: ${res.currentStatus}`);
  console.log(`      - Original Scans: ${res.originalScansCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Tracking Prompt Preview:\n"""\n${res.compactedTrackingPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.carrierName, 'FedEx');
  assert.equal(res.trackingNumber, '789104820194');
  assert.equal(res.currentStatus, 'DELIVERED');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedTrackingPrompt.includes('FedEx (Tracking #: 789104820194)'));
  assert.ok(res.compactedTrackingPrompt.includes('DELIVERED'));
  assert.ok(res.compactedTrackingPrompt.includes('Delivered - Front Porch'));

  assert.ok(!res.compactedTrackingPrompt.includes('Des Moines IA')); // Intermediate scan pruned
  assert.ok(!res.compactedTrackingPrompt.includes('Salt Lake City UT')); // Intermediate scan pruned

  console.log('\n[✓] Order Tracking Milestone Status Isolation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL ORDER TRACKING COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
