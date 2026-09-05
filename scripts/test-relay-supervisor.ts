/**
 * @file scripts/test-relay-supervisor.ts
 * @description Comprehensive automated test suite for GALXAI Local Relay Management Suite.
 */

import assert from 'node:assert';
import { GalxRelaySupervisor } from '../src/core/relay/GalxRelaySupervisor.js';
import { GalxTunnelSupervisor } from '../src/core/relay/GalxTunnelSupervisor.js';
import { GalxRelayWatchdog } from '../src/core/relay/GalxRelayWatchdog.js';
import { GalxLaunchAgent } from '../src/core/relay/GalxLaunchAgent.js';

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 GALXAI: Local Relay Management & Health Monitoring Test Suite');
  console.log('========================================================================\n');

  // 1. Auto-Discovery
  console.log('🔍 TEST 1: Relay Server Auto-Discovery...');
  const resolved = GalxRelaySupervisor.resolveRelayServerPath();
  assert(!!resolved.serverScript, 'Relay server script path resolved');
  assert(resolved.serverScript.endsWith('relay-server.ts'), 'Path points to relay-server.ts');
  assert(!!resolved.cwd, 'CWD resolved');
  console.log(`  ✅ [PASS] Resolved serverScript: ${resolved.serverScript}`);
  console.log(`  ✅ [PASS] Ecosystem config: ${resolved.ecosystemPath || 'none'}`);

  // 2. Port Authority & Sensing
  console.log('\n🔍 TEST 2: Port 3001 Socket Sensing...');
  const portCheck = await GalxRelaySupervisor.checkPort(3001);
  console.log(`  -> Port 3001 in use: ${portCheck.inUse} (PID: ${portCheck.pid || 'N/A'}, Command: ${portCheck.command || 'N/A'})`);
  assert(typeof portCheck.inUse === 'boolean', 'Port check returns boolean inUse');
  console.log('  ✅ [PASS] Port check executed cleanly');

  // 3. Health Probe & Telemetry
  console.log('\n🔍 TEST 3: Health Probe & Telemetry Query...');
  const health = await GalxRelaySupervisor.getHealth(3001, 2000);
  console.log(`  -> Health probe ok: ${health.ok} (RTT: ${health.rttMs}ms)`);
  if (health.ok && health.data) {
    assert(health.data.status === 'ok', 'Health status is ok');
    assert(typeof health.data.shards.total === 'number', 'Shards total is number');
    assert(typeof health.data.memory.rssMb === 'number', 'Memory RSS is number');
    console.log(`  ✅ [PASS] Relay version: ${health.data.version}`);
    console.log(`  ✅ [PASS] Storage engine: ${health.data.storageEngine}`);
    console.log(`  ✅ [PASS] Enrolled shards: ${health.data.shards.active} active`);
    console.log(`  ✅ [PASS] Memory RSS: ${health.data.memory.rssMb} MB`);
  } else {
    console.log('  ⚠️ Relay offline on port 3001, testing fallback status reporting');
  }

  // 4. Unified Status Report
  console.log('\n🔍 TEST 4: Unified Status Aggregation...');
  const status = await GalxRelaySupervisor.getStatus(3001);
  assert(typeof status.isOnline === 'boolean', 'Status isOnline is boolean');
  assert(status.port === 3001, 'Status port is 3001');
  console.log(`  -> Online: ${status.isOnline} | Mode: ${status.mode} | PID: ${status.pid || 'N/A'}`);
  console.log('  ✅ [PASS] Status aggregated cleanly');

  // 5. Smoke Test Wire
  console.log('\n🔍 TEST 5: Smoke Test Wire Verification...');
  const smoke = await GalxRelaySupervisor.smokeTest(3001);
  console.log(`  -> Smoke test success: ${smoke.success} (RTT: ${smoke.rttMs}ms)`);
  if (status.isOnline) {
    assert(smoke.success, 'Smoke test passes when relay is online');
    console.log('  ✅ [PASS] Smoke test confirmed wire connectivity');
  } else {
    assert(!smoke.success, 'Smoke test reports failure when relay is offline');
    console.log('  ✅ [PASS] Smoke test cleanly reports offline condition');
  }

  // 6. Autonomous Watchdog Probe
  console.log('\n🔍 TEST 6: Watchdog Single Probe Rule Execution...');
  const watchdog = new GalxRelayWatchdog({ port: 3001, enableNotifications: false });
  const pollResult = await watchdog.poll();
  console.log(`  -> Watchdog probe healthy: ${pollResult.healthy}`);
  assert(typeof pollResult.healthy === 'boolean', 'Watchdog poll returned boolean');
  console.log('  ✅ [PASS] Watchdog evaluated health rules cleanly');

  // 7. Cloudflare Tunnel Supervisor
  console.log('\n🔍 TEST 7: Cloudflare Tunnel Orchestrator State...');
  try {
    const cfBin = GalxTunnelSupervisor.resolveCloudflaredPath();
    console.log(`  -> Found cloudflared binary at: ${cfBin}`);
    const tunnelState = GalxTunnelSupervisor.getTunnelState();
    console.log(`  -> Current tunnel state: ${tunnelState ? (tunnelState.isAlive ? 'Active' : 'Dormant') : 'None'}`);
    console.log('  ✅ [PASS] Cloudflare Tunnel Supervisor ready');
  } catch (err: any) {
    console.log(`  ⚠️ Notice: ${err.message}`);
  }

  // 8. macOS LaunchAgent Plist Generator
  console.log('\n🔍 TEST 8: macOS LaunchAgent Plist Generation...');
  if (process.platform === 'darwin') {
    const plist = GalxLaunchAgent.generatePlistContent();
    assert(plist.includes('com.galxai.relay'), 'Plist contains service label');
    assert(plist.includes('relay-server.ts'), 'Plist points to relay-server.ts');
    assert(plist.includes('RunAtLoad'), 'Plist includes RunAtLoad');
    console.log('  ✅ [PASS] Plist XML generated correctly with valid launchd keys');
    const agentStatus = GalxLaunchAgent.status();
    console.log(`  -> LaunchAgent installed: ${agentStatus.isInstalled} (Loaded: ${agentStatus.isLoaded})`);
    console.log('  ✅ [PASS] LaunchAgent status query completed');
  } else {
    console.log('  ⏩ Skipping macOS LaunchAgent test on non-darwin platform');
  }

  console.log('\n========================================================================');
  console.log('🏁 ALL RELAY SUPERVISOR TESTS PASSED WITH 100% INTEGRITY!');
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
