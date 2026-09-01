/**
 * Test: GalxLumiQoSPoolGovernor Invariant Verification
 * Verifies that quota-based LUMI traffic is throttled and clamped without starving Pay-As-You-Go/VIP users.
 */

import { GalxLumiQoSPoolGovernor, LUMI_MAX_BURST_PER_USER } from '../src/core/governor/GalxLumiQoSPoolGovernor';

async function testLumiQoSPoolGovernor() {
  console.log('======================================================================');
  console.log('   🧪  TESTING GALXAI LUMI QOS POOL GOVERNOR SUBSTRATE               ');
  console.log('======================================================================\n');

  const governor = GalxLumiQoSPoolGovernor.getInstance();
  const testUserId = 'user_lumi_test_agent_123';
  const vipUserId = 'user_vip_enterprise_456';

  // 1. Initial State Check
  const initialMetrics = governor.getPoolMetrics();
  console.log('1. Initial LUMI QoS Pool Metrics:');
  console.log(`   - Pool: ${initialMetrics.poolName}`);
  console.log(`   - Max Concurrency: ${initialMetrics.maxConcurrencyLimit}`);
  console.log(`   - Reserved VIP Floor: ${initialMetrics.reservedVipFloorPct}%`);
  console.log(`   - Congestion State: ${initialMetrics.congestionState}\n`);

  if (initialMetrics.reservedVipFloorPct !== 70) {
    throw new Error(`Expected 70% reserved VIP floor, got ${initialMetrics.reservedVipFloorPct}%`);
  }

  // 2. VIP User Admission Bypass
  console.log('2. Testing VIP / Pay-As-You-Go User Admission...');
  const vipResult = governor.evaluateRequest(vipUserId, false, true, 'gpt-5.6-sol');
  console.log(`   ✓ VIP Request Admitted: allowed=${vipResult.allowed}, pool=${vipResult.pool}`);
  if (!vipResult.allowed || vipResult.pool !== 'qos_vip_payg') {
    throw new Error('VIP request was incorrectly restricted by LUMI QoS governor');
  }

  // 3. LUMI User Standard Admission
  console.log('\n3. Testing LUMI User Normal Admission...');
  const lumiResult1 = governor.evaluateRequest(testUserId, true, false, 'gpt-5.6-luna');
  console.log(`   ✓ LUMI Request 1 Admitted: allowed=${lumiResult1.allowed}, activeStreams=${lumiResult1.activeUserStreams}, quotaRemaining=${lumiResult1.userQuotaRemaining}`);
  if (!lumiResult1.allowed || lumiResult1.pool !== 'qos_lumi_quota') {
    throw new Error('LUMI request was not admitted into qos_lumi_quota pool');
  }

  // 4. Per-User Burst Concurrency Clamp Test
  console.log('\n4. Testing Per-User Concurrency Clamping (Max 12 Simultaneous Streams)...');
  for (let i = 2; i <= LUMI_MAX_BURST_PER_USER; i++) {
    const res = governor.evaluateRequest(testUserId, true, false, 'gpt-5.6-luna');
    if (!res.allowed) throw new Error(`Stream ${i} should have been allowed under limit of ${LUMI_MAX_BURST_PER_USER}`);
  }

  // 13th simultaneous stream should be rejected with LUMI_USER_CONCURRENCY_LIMIT
  const burstExceeded = governor.evaluateRequest(testUserId, true, false, 'gpt-5.6-luna');
  console.log(`   ✓ 13th Concurrent Stream Blocked: allowed=${burstExceeded.allowed}, code=${burstExceeded.rejectionReason?.code}`);
  if (burstExceeded.allowed || burstExceeded.rejectionReason?.code !== 'LUMI_USER_CONCURRENCY_LIMIT') {
    throw new Error('Failed to clamp runaway concurrency burst for LUMI user');
  }

  // 5. Stream Slot Release
  console.log('\n5. Testing Stream Slot Release...');
  governor.releaseStreamSlot(testUserId, true);
  const releasedAttempt = governor.evaluateRequest(testUserId, true, false, 'gpt-5.6-luna');
  console.log(`   ✓ Stream Slot Reacquired After Release: allowed=${releasedAttempt.allowed}`);
  if (!releasedAttempt.allowed) {
    throw new Error('Failed to acquire slot after previous stream released');
  }

  // Clean up test streams
  for (let i = 0; i < LUMI_MAX_BURST_PER_USER; i++) {
    governor.releaseStreamSlot(testUserId, true);
  }

  const finalMetrics = governor.getPoolMetrics();
  console.log('\n6. Final QoS Pool State:');
  console.log(`   - Active LUMI Streams: ${finalMetrics.totalActiveStreams}`);
  console.log(`   - Throttled Requests Count: ${finalMetrics.totalRequestsThrottled5h}`);
  console.log(`   - Congestion State: ${finalMetrics.congestionState}`);

  console.log('\n======================================================================');
  console.log('   ✅ ALL LUMI QOS POOL GOVERNOR INVARIANTS PASSED                   ');
  console.log('======================================================================\n');
}

testLumiQoSPoolGovernor().catch(err => {
  console.error('\n❌ Test Failed:', err);
  process.exit(1);
});
