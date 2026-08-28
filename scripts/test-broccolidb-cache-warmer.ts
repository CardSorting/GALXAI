import assert from 'node:assert/strict';
import { BroccoliCacheWarmer } from '../src/core/broccolidb/BroccoliCacheWarmer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PROMPT CACHE PRE-WARMER & TTL KEEP-ALIVE');
  console.log('======================================================================\n');

  BroccoliCacheWarmer.clear();

  const prefixHash = 'hash_enterprise_rag_guidelines_9918';
  const prefixTokens = 2048; // 2,048 tokens (> 1,024 minimum)

  console.log('[1/3] Initializing and Recording Access to 2,048-Token Prefix...');
  BroccoliCacheWarmer.recordAccess(prefixHash, prefixTokens);

  // 1. Check immediate status (0 ms idle -> should NOT warm)
  const eval1 = BroccoliCacheWarmer.evaluateCacheStatus(prefixHash, Date.now());
  console.log(`      - Immediate Idle Status: shouldWarm = ${eval1.shouldWarm} (Idle: ${eval1.idleDurationSeconds}s)`);
  assert.equal(eval1.shouldWarm, false);

  // 2. Simulate 4.5 minutes of idle time (270,000 ms) -> In danger of cache eviction
  const simulatedTime = Date.now() + 270 * 1000;
  console.log('\n[2/3] Simulating 4.5 Minutes of Inactivity (TTL Threshold = 4 mins)...');
  const eval2 = BroccoliCacheWarmer.evaluateCacheStatus(prefixHash, simulatedTime);

  console.log(`      - Eviction Warning Status: shouldWarm = ${eval2.shouldWarm}`);
  console.log(`      - Idle Duration: ${eval2.idleDurationSeconds}s`);
  console.log(`      - Estimated Luna Keep-Alive Ping Cost: $${eval2.estimatedWarmCostUsd.toFixed(7)}`);
  console.log(`      - Protected User Savings on Warm Hit: $${eval2.potentialUserSavingsUsd.toFixed(6)}`);

  assert.equal(eval2.shouldWarm, true);
  assert.ok(eval2.potentialUserSavingsUsd > eval2.estimatedWarmCostUsd * 10); // ROI > 10x!

  // 3. Execute Keep-Alive Ping & Verify Reset
  console.log('\n[3/3] Executing 1-Token Keep-Alive Ping on Luna...');
  BroccoliCacheWarmer.executeKeepAlivePing(prefixHash);

  const entry = BroccoliCacheWarmer.getInstance().cacheTable.get(prefixHash);
  console.log(`      - Keep-Alive Count: ${entry?.keepAliveCount}`);
  console.log(`      - Total Saved Dollars Logged: $${entry?.totalDollarsSavedOnWarmHits.toFixed(6)}`);

  assert.equal(entry?.keepAliveCount, 1);
  assert.ok((entry?.totalDollarsSavedOnWarmHits || 0) > 0);

  console.log('\n[✓] Prompt Cache Pre-Warmer & TTL Keep-Alive Substrate Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CACHE WARMER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
