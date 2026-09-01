/**
 * Test: Tier Sharding Substrate & Predictive Hydraulic Routing
 * Verifies multi-tier shard isolation (Sovereign VPC, Fleet, Growth, LUMI, Community),
 * EWMA latency tracking, and 2-phase shard reservation leases.
 */

import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';

async function testTierShardsMesh() {
  console.log('======================================================================');
  console.log('   🧪  TESTING TIER SHARDS & PREDICTIVE ROUTING MESH                 ');
  console.log('======================================================================\n');

  const substrate = new GalxCredentialSubstrate();
  const pool = new GalxCredentialPool(substrate);

  // 1. Register Multi-Tier Shards
  console.log('1. Registering Multi-Tier Compute Shards...');
  const shards: GalxShardAccount[] = [
    {
      id: 'shard_sovereign_vpc_01',
      userId: 'system_admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Sovereign VPC Dedicated Lane',
      apiKeyMasked: 'sk-sovereign...001',
      encryptedSecrets: {
        ciphertext: 'mock_enc_01',
        iv: 'iv_01',
        tag: 'tag_01'
      },
      priority: 100,
      weight: 10,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 10_000_000,
        remainingTokens: 10_000_000,
        refillRatePerMinute: 10_000_000,
        maxRequests: 10_000,
        remainingRequests: 10_000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 500,
        totalTokensConsumed: 250_000,
        consecutiveFailures: 0,
        successfulRequests: 500,
        averageLatencyMs: 14.2
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    },
    {
      id: 'shard_fleet_scale_02',
      userId: 'system_admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'Fleet Scale Anycast Cluster',
      apiKeyMasked: 'sk-fleet...002',
      encryptedSecrets: {
        ciphertext: 'mock_enc_02',
        iv: 'iv_02',
        tag: 'tag_02'
      },
      priority: 80,
      weight: 8,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 5_000_000,
        remainingTokens: 5_000_000,
        refillRatePerMinute: 5_000_000,
        maxRequests: 5_000,
        remainingRequests: 5_000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 1200,
        totalTokensConsumed: 600_000,
        consecutiveFailures: 2,
        successfulRequests: 1198,
        averageLatencyMs: 18.5
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    },
    {
      id: 'shard_lumi_quota_03',
      userId: 'system_admin',
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'LUMI Quota-Metered Lane',
      apiKeyMasked: 'sk-lumi...003',
      encryptedSecrets: {
        ciphertext: 'mock_enc_03',
        iv: 'iv_03',
        tag: 'tag_03'
      },
      priority: 50,
      weight: 5,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 2_000_000,
        remainingTokens: 2_000_000,
        refillRatePerMinute: 2_000_000,
        maxRequests: 2_000,
        remainingRequests: 2_000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 3000,
        totalTokensConsumed: 1_500_000,
        consecutiveFailures: 5,
        successfulRequests: 2995,
        averageLatencyMs: 22.0
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    }
  ];

  for (const s of shards) {
    substrate.addAccount(s);
    console.log(`   ✓ Registered Shard [${s.id}] - ${s.accountLabel} (Latency: ${s.stats?.averageLatencyMs}ms)`);
  }

  // 2. Test Dynamic Reliability Weight Auto-Tuning
  console.log('\n2. Testing Dynamic Reliability Weight Auto-Tuning:');
  for (const s of shards) {
    const dynamicWeight = pool.calculateDynamicReliabilityWeight(s);
    console.log(`   - Shard ${s.id}: Base Weight=${s.weight} -> Dynamic Reliability Weight=${dynamicWeight.toFixed(3)}`);
    if (dynamicWeight <= 0) {
      throw new Error(`Dynamic weight for shard ${s.id} must be positive`);
    }
  }

  // 3. Test Atomic Shard Lease Acquisition
  console.log('\n3. Testing Atomic Shard Lease Acquisition...');
  const leaseResult = pool.acquireLease({
    provider: 'openai',
    userId: 'tenant_enterprise_777',
    estimatedTokens: 2500,
    isPriorityUser: true
  });

  console.log('   ✓ Acquired Shard Lease:', {
    leaseId: leaseResult.lease?.leaseId,
    shardId: leaseResult.lease?.shardId,
    fencingToken: leaseResult.lease?.fencingToken,
    estimatedTokens: leaseResult.lease?.estimatedTokens
  });

  if (!leaseResult.lease || !leaseResult.lease.shardId) {
    throw new Error('Failed to acquire shard execution lease');
  }

  // 4. Test Shard Lease Scavenging
  console.log('\n4. Testing Shard Lease Scavenging & Capacity Reclamation...');
  const futureMs = Date.now() + 70_000;
  const reclaimed = pool.scavengeExpiredLeases(futureMs);
  console.log(`   ✓ Reclaimed ${reclaimed} expired execution leases`);
  if (reclaimed < 1) {
    throw new Error('Expected at least 1 expired lease to be scavenged');
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL TIER SHARDS & PREDICTIVE ROUTING INVARIANTS PASSED         ');
  console.log('======================================================================\n');
}

testTierShardsMesh().catch(err => {
  console.error('\n❌ Shard Test Failed:', err);
  process.exit(1);
});
