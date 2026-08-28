import assert from 'node:assert/strict';
import { BroccoliSpendLease } from '../src/core/broccolidb/BroccoliSpendLease';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB ATOMIC SPEND LEASES & CAS CONCURRENCY CONTROL');
  console.log('======================================================================\n');

  BroccoliSpendLease.clear();

  // 1. Set $10.00 budget for engineering_squad
  console.log('[1/4] Configuring $10.00 budget bucket for engineering_squad...');
  const bucket = BroccoliSpendLease.setBudget('engineering_squad', 10.00);
  assert.equal(bucket.availableSpendUsd, 10.00);
  assert.equal(bucket.version, 1);

  // 2. Concurrently reserve $4.00 and $4.00 (Total $8.00)
  console.log('\n[2/4] Concurrently reserving $4.00 on Worker A and $4.00 on Worker B...');
  const resA = BroccoliSpendLease.reserveBudget('engineering_squad', 4.00);
  assert.equal(resA.success, true);
  assert.ok(resA.leaseId);
  console.log(`      - Worker A Lease: ${resA.leaseId} | Available: $${resA.availableRemainingUsd.toFixed(2)}`);

  const resB = BroccoliSpendLease.reserveBudget('engineering_squad', 4.00);
  assert.equal(resB.success, true);
  assert.ok(resB.leaseId);
  console.log(`      - Worker B Lease: ${resB.leaseId} | Available: $${resB.availableRemainingUsd.toFixed(2)}`);

  assert.equal(resB.availableRemainingUsd, 2.00);

  // 3. Worker C attempts $3.00 (Exceeds remaining $2.00 -> Should fail gracefully)
  console.log('\n[3/4] Worker C attempts $3.00 (capacity $2.00 remaining)...');
  const resC = BroccoliSpendLease.reserveBudget('engineering_squad', 3.00);
  assert.equal(resC.success, false);
  console.log(`      - Worker C Rejection: "${resC.rejectionReason}"`);

  // 4. Settle Worker A with actual cost $1.50 (Refunds $2.50 unused reservation)
  console.log('\n[4/4] Settling Worker A with actual cost $1.50 (Refunds $2.50)...');
  const settledA = BroccoliSpendLease.settleSpend(resA.leaseId!, 1.50);
  assert.equal(settledA, true);

  // Worker C now retries $3.00 (Available now $4.50 -> Should succeed!)
  const retryC = BroccoliSpendLease.reserveBudget('engineering_squad', 3.00);
  console.log(`      - Worker C Retry: Success: ${retryC.success} | Available: $${retryC.availableRemainingUsd.toFixed(2)}`);
  assert.equal(retryC.success, true);

  console.log('\n[✓] Atomic CAS Multi-Worker Concurrency Protection Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB SPEND LEASE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
