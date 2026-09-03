import assert from 'node:assert/strict';
import { ContinuousRateGovernor } from './ContinuousRateGovernor';

console.log('[Test Suite] Continuous Rate Governor Invariant Verification');

const governor = new ContinuousRateGovernor({
  capacity: 10,
  refillRatePerSec: 100
});

const res1 = governor.tryAcquire(5);
assert.strictEqual(res1.allowed, true, 'Initial acquisition of 5 tokens should succeed');
assert.strictEqual(res1.remaining, 5, 'Remaining tokens must be 5');

const res2 = governor.tryAcquire(5);
assert.strictEqual(res2.allowed, true, 'Second acquisition of 5 tokens should succeed');

const res3 = governor.tryAcquire(1);
assert.strictEqual(res3.allowed, false, 'Acquisition on exhausted bucket must be rejected');

console.log('✓ All 3 rate governor unit tests passed with 100% integrity.');
