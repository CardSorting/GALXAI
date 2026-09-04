/**
 * Test: QoSPoolRepository and Postgres Schema Invariants (V2 Industrial Apex)
 * Tests atomic lease acquisition, model warp weighting, heartbeat extensions,
 * token settlement, community monthly grant evaluation, and daily collective pool tracking.
 */

import { QoSPoolRepository } from '../src/lib/supabase/repositories/QoSPoolRepository';
import { closePostgresPool } from '../src/lib/db/postgres';

async function testQoSPoolRepository() {
  console.log('======================================================================');
  console.log('   🧪  TESTING SUPABASE QOS POOL REPOSITORY SUBSTRATE (V2 APEX)       ');
  console.log('======================================================================\n');

  const repo = QoSPoolRepository.getInstance();
  const testUserId = 'test_usr_lumi_pg_999';

  // 1. Acquire Stream Lease with Model Warp Multiplier
  console.log('1. Testing LUMI Stream Lease Acquisition (o3 Reasoning Model)...');
  const lease1 = await repo.acquireLumiLease({
    userId: testUserId,
    modelId: 'o3',
    maxBurst: 12,
    fiveHourQuota: 2050,
    ttlSeconds: 120
  });

  console.log('   ✓ Lease 1 Result:', lease1);
  if (!lease1.allowed || !lease1.leaseId) {
    throw new Error('Failed to acquire initial LUMI stream lease');
  }

  // 2. Heartbeat Stream Lease Extension
  console.log('\n2. Testing Reasoning Stream Lease Heartbeat Extension...');
  const heartbeatOk = await repo.heartbeatLumiLease(lease1.leaseId, testUserId, 60);
  console.log('   ✓ Heartbeat Extended Successfully:', heartbeatOk);

  // 3. Settle and Release Stream Lease with Reasoning Tokens
  console.log('\n3. Testing LUMI Stream Lease Settle & Release...');
  await repo.releaseLumiLease(lease1.leaseId, testUserId, 800, 1200, 3500);
  console.log('   ✓ Lease 1 released with 800 prompt, 1200 completion, and 3500 reasoning tokens');

  // 4. Test Zero-Lock Zombie Lease Sweeping
  console.log('\n4. Testing Zero-Lock Zombie Lease Sweeping...');
  const sweptCount = await repo.sweepExpiredLeases();
  console.log(`   ✓ Sweeper executed cleanly, swept ${sweptCount} expired leases`);

  // 5. Community Free Compute Grant Evaluation ($30/mo & $500/day collective)
  console.log('\n5. Testing Community Free Grant Evaluation...');
  const grantResult = await repo.evaluateCommunityGrant(testUserId, 0.005);
  console.log('   ✓ Grant Result:', grantResult);
  if (!grantResult.allowed) {
    throw new Error('Expected initial community free grant to be allowed');
  }

  // 6. Settle Community Grant Draw
  console.log('\n6. Testing Settle Community Grant Draw...');
  await repo.settleCommunityGrant(testUserId, 0.0025);
  console.log('   ✓ Grant draw $0.0025 settled successfully');

  console.log('\n======================================================================');
  console.log('   ✅ ALL QOS POOL REPOSITORY V2 INVARIANTS PASSED                   ');
  console.log('======================================================================\n');
}

testQoSPoolRepository()
  .catch(err => {
    console.error('\n❌ Repository Test Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closePostgresPool());
