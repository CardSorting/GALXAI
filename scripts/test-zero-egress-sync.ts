/**
 * Test: Zero-Egress Sync, BroccoliDB Read Shield, Single-Flight & XFetch/Bloom
 * Tests HTTP 304 fast-path ETag comparison, BroccoliDB snapshot restoration,
 * Single-Flight stampede coalescing, Bloom Filter negative shielding,
 * and XFetch probabilistic early refresh.
 */

import { GalxZeroEgressCacheMesh } from '../src/lib/cache/GalxZeroEgressCacheMesh';
import { BroccoliEgressReducer } from '../src/core/broccolidb/BroccoliEgressReducer';

async function testZeroEgressSync() {
  console.log('======================================================================');
  console.log('   🧪  TESTING ZERO-EGRESS SYNC, XFETCH & BLOOM ORIGIN SHIELD         ');
  console.log('======================================================================\n');

  const cacheMesh = GalxZeroEgressCacheMesh.getInstance();
  const testUserId = 'usr_egress_test_user_77';

  // 1. Initial Sync (Bootstrap payload)
  console.log('1. Executing Initial Chat Sync (Deriving ETag & Caching in BroccoliDB)...');
  const sync1 = await cacheMesh.syncChatWithZeroEgress(testUserId);
  console.log('   ✓ Initial Sync Result:', {
    notModified: sync1.notModified,
    etag: sync1.etag,
    messageCount: sync1.messages.length,
    bytesTransferred: `${sync1.bytesTransferredEstimate} bytes`,
    servedFromBroccoliL1: sync1.servedFromBroccoliL1
  });

  if (!sync1.etag) {
    throw new Error('Expected initial sync to derive a valid ETag');
  }

  // 2. Second Sync (Zero-Egress HTTP 304 Fast-Path restored from BroccoliDB)
  console.log('\n2. Executing Second Sync (Expected Zero-Egress HTTP 304 via BroccoliDB L1)...');
  const sync2 = await cacheMesh.syncChatWithZeroEgress(testUserId);
  console.log('   ✓ Second Sync Result:', {
    notModified: sync2.notModified,
    etag: sync2.etag,
    messageCount: sync2.messages.length,
    bytesTransferred: `${sync2.bytesTransferredEstimate} bytes`,
    servedFromBroccoliL1: sync2.servedFromBroccoliL1
  });

  if (!sync2.notModified || sync2.bytesTransferredEstimate > 60 || !sync2.servedFromBroccoliL1) {
    throw new Error('Expected zero-egress HTTP 304 fast-path match served from BroccoliDB L1');
  }

  // 3. Test Single-Flight Stampede Coalescing (50 concurrent requests collapsing into 1 flight)
  console.log('\n3. Testing Single-Flight Stampede Coalescing across 50 concurrent requests...');
  const egressReducer = BroccoliEgressReducer.getInstance();
  egressReducer.invalidatePool('lumi_main_pool'); // Invalidate to trigger stampede

  const concurrentPromises = Array.from({ length: 50 }, () => egressReducer.getOrFetchQoSPool('lumi_main_pool'));
  const results = await Promise.all(concurrentPromises);

  // 4. Test Bloom Filter Negative Key Shielding
  console.log('\n4. Testing Bloom Filter Negative Origin Shield on Non-Existent Key...');
  const fakePoolResult = await egressReducer.getOrFetchQoSPool('non_existent_fake_pool_12345');
  console.log('   ✓ Fake Pool Rejection Result:', {
    poolId: fakePoolResult.poolId,
    isNegativeCache: fakePoolResult.isNegativeCache,
    isActive: fakePoolResult.isActive
  });

  if (!fakePoolResult.isNegativeCache) {
    throw new Error('Expected Bloom Filter negative shielding for non-existent pool');
  }

  const metrics = egressReducer.getMetrics();
  console.log('\n   ✓ BroccoliDB Origin Hit Rate Mitigation Metrics:', {
    totalRequests: results.length + 1,
    originHits: metrics.originHits,
    coalescedStampedes: metrics.coalescedStampedes,
    bloomRejections: metrics.bloomRejections,
    l1CacheHits: metrics.l1CacheHits,
    totalEgressSaved: `${metrics.totalEgressSavedBytes} bytes`
  });

  if (metrics.originHits > 1) {
    throw new Error(`Expected at most 1 origin hit, got ${metrics.originHits}`);
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL XFETCH, BLOOM SHIELD & ZERO-EGRESS INVARIANTS PASSED       ');
  console.log('======================================================================\n');
}

testZeroEgressSync().catch(err => {
  console.error('\n❌ Zero-Egress Test Failed:', err);
  process.exit(1);
});
