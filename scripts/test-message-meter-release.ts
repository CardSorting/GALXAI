import assert from 'node:assert/strict';
import {
  MESSAGE_METER_RELEASE,
  assertMessageMeterProvisionable,
} from '../src/lib/billing/message-meter-release';

assert.equal(MESSAGE_METER_RELEASE.status, 'approved');
assert.deepEqual(MESSAGE_METER_RELEASE.requiredApprovals, [
  'public_rate',
  'request_limits',
  'failure_behavior',
  'spend_controls',
]);

assert.doesNotThrow(() => assertMessageMeterProvisionable({
  publicRateApproved: true,
  requestLimitsApproved: true,
  failureBehaviorApproved: true,
  spendControlsApproved: true,
  unitAmountUsd: 0.02,
}));

console.log('Message meter release gate checks passed: the approved Nova message contract may provision live usage objects.');
