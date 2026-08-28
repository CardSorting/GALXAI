import assert from 'node:assert/strict';
import { SpendAnomalyDetector } from '../src/core/governance/SpendAnomalyDetector';
import { GovernanceAlertDispatcher } from '../src/core/governance/GovernanceAlertDispatcher';

function run() {
  console.log('======================================================================');
  console.log('  TESTING REAL-TIME SPEND ANOMALY DETECTION & WEBHOOK ALERTS');
  console.log('======================================================================\n');

  SpendAnomalyDetector.resetWindows();
  const now = Date.now();

  // 1. Feed 10 steady baseline requests ($0.005 each)
  console.log('[1/3] Ingesting steady baseline telemetry (10 samples @ $0.005/req)...');
  for (let i = 0; i < 10; i++) {
    const res = SpendAnomalyDetector.recordAndEvaluate({
      timestampMs: now - (10 - i) * 10000,
      costUsd: 0.005,
      tokens: 150,
      serviceId: 'customer_support_router',
      department: 'cx_ops',
    });
    assert.equal(res.isAnomaly, false);
  }
  console.log('      - Steady state established with 0 false positive anomalies.');

  // 2. Simulate sudden 20x runaway surge ($0.25 on a single request)
  console.log('[2/3] Simulating sudden 20x runaway surge ($0.25 burst)...');
  const anomaly = SpendAnomalyDetector.recordAndEvaluate({
    timestampMs: now,
    costUsd: 0.25,
    tokens: 15000,
    serviceId: 'customer_support_router',
    department: 'cx_ops',
  });

  console.log(`      - Anomaly Detected: ${anomaly.isAnomaly}`);
  console.log(`      - Severity: ${anomaly.severity.toUpperCase()}`);
  console.log(`      - Velocity Multiplier: ${anomaly.velocityMultiplier}x`);
  console.log(`      - Z-Score: ${anomaly.zScore}`);
  console.log(`      - Trigger: ${anomaly.triggerReason}`);

  assert.equal(anomaly.isAnomaly, true);
  assert.equal(anomaly.severity, 'high');
  assert.ok(anomaly.velocityMultiplier >= 5.0);

  // 3. Test Slack & PagerDuty Payload Formatting
  console.log('\n[3/3] Formatting Slack Block Kit & PagerDuty Event Payloads...');
  const slackPayload = GovernanceAlertDispatcher.formatSlackPayload(anomaly, 'inc_anomaly_8912');
  assert.ok(slackPayload.blocks.length >= 3);
  assert.ok(slackPayload.text.includes('GALXAI Alert'));

  const pdPayload = GovernanceAlertDispatcher.formatPagerDutyPayload(anomaly, 'inc_anomaly_8912', 'pd_key_123');
  assert.equal(pdPayload.event_action, 'trigger');
  assert.equal(pdPayload.payload.severity, 'error');

  console.log('      - Slack & PagerDuty payloads generated and validated.');

  // 4. Test BroccoliDB Natural Language Query on Anomalies
  console.log('\n[4/4] Testing BroccoliDB Natural Queries on Spend Anomalies...');
  const naturalAnomalies = SpendAnomalyDetector.queryAnomaliesNatural('find anomalies in department cx_ops');
  assert.equal(naturalAnomalies.length, 1);
  console.log('      - BroccoliDB Natural Language Query Verified on Anomaly Table.');

  console.log('\n======================================================================');
  console.log('   ALL SPEND ANOMALY & ALERTING TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
