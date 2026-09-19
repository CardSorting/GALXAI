/**
 * Private launch gate for the future Nova message meter.
 *
 * The live Nova message contract is approved. This guard keeps provisioning
 * explicit and prevents accidental creation for an incomplete contract.
 */

export const MESSAGE_METER_RELEASE = {
  contractVersion: 'nova-message-v1',
  status: 'approved' as 'blocked' | 'approved',
  meterLookupKey: 'galx_nova_message_v1',
  priceLookupKey: 'galx_nova_message_monthly_v1',
  requiredApprovals: ['public_rate', 'request_limits', 'failure_behavior', 'spend_controls'] as const,
} as const;

export type MessageMeterApproval = {
  publicRateApproved: boolean;
  requestLimitsApproved: boolean;
  failureBehaviorApproved: boolean;
  spendControlsApproved: boolean;
  unitAmountUsd?: number;
};

export function assertMessageMeterProvisionable(approval: MessageMeterApproval): void {
  const approvalsComplete = approval.publicRateApproved
    && approval.requestLimitsApproved
    && approval.failureBehaviorApproved
    && approval.spendControlsApproved;

  if (!approvalsComplete || MESSAGE_METER_RELEASE.status !== 'approved') {
    throw new Error('MESSAGE_METER_RELEASE_BLOCKED: publish and approve the complete per-message contract before provisioning Stripe usage objects.');
  }

  if (!Number.isFinite(approval.unitAmountUsd) || (approval.unitAmountUsd ?? 0) <= 0) {
    throw new Error('MESSAGE_METER_RELEASE_BLOCKED: a positive approved per-message amount is required.');
  }
}
