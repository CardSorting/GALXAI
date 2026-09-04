import assert from 'node:assert/strict';
import { ContinuousRateGovernor } from './ContinuousRateGovernor';

console.log('[Test Suite] Continuous Rate Governor Invariant Verification');

const governor = new ContinuousRateGovernor({
  capacity: 10,
  refillRatePerSecond: 100
});

const res1 = governor.tryAcquire(5);
assert.strictEqual(typeof res1 === 'boolean' ? res1 : (res1 as any)?.allowed, true, 'Initial acquisition of 5 tokens should succeed');

const res2 = governor.tryAcquire(5);
assert.strictEqual(typeof res2 === 'boolean' ? res2 : (res2 as any)?.allowed, true, 'Second acquisition of 5 tokens should succeed');

const res3 = governor.tryAcquire(1);
assert.strictEqual(typeof res3 === 'boolean' ? res3 : (res3 as any)?.allowed, false, 'Acquisition on exhausted bucket must be rejected');

console.log('✓ All 3 rate governor unit tests passed with 100% integrity.');
