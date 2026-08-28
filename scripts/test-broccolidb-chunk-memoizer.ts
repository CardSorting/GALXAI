import assert from 'node:assert/strict';
import { BroccoliChunkMemoizer } from '../src/core/broccolidb/BroccoliChunkMemoizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SUB-QUERY CHUNK MEMOIZER & FACT VAULT');
  console.log('======================================================================\n');

  BroccoliChunkMemoizer.clear();

  const intent = 'customer_subscription_tier';
  const entityId = 'cust_enterprise_9988';
  const cachedFactPayload = JSON.stringify({
    tier: 'enterprise_platinum',
    creditsRemaining: 450000,
    renewalDate: '2027-01-01',
    slaGuaranteedMs: 250,
  });

  // 1. Initial Lookup (Expected: Cache Miss)
  console.log('[1/3] Performing Initial Sub-Query Lookup (Agent 1)...');
  const res1 = BroccoliChunkMemoizer.lookup(intent, entityId);
  console.log(`      - Is Cache Hit: ${res1.isCacheHit}`);
  assert.equal(res1.isCacheHit, false);

  // 2. Store computed fact in BroccoliDB
  console.log('\n[2/3] Storing Computed Fact in BroccoliDB Memory Vault...');
  BroccoliChunkMemoizer.store(intent, entityId, cachedFactPayload);

  // 3. Subsequent Lookup from Independent Sub-Agent 2 (Expected: 100% Cache Hit)
  console.log('\n[3/3] Performing Sub-Query Lookup from Independent Sub-Agent 2...');
  const res2 = BroccoliChunkMemoizer.lookup(intent, entityId, 15.00);

  console.log(`      - Is Cache Hit: ${res2.isCacheHit}`);
  console.log(`      - Tokens Saved: ${res2.tokensSaved} tokens`);
  console.log(`      - Dollars Saved on Sub-Agent Call: $${res2.dollarsSaved.toFixed(6)}`);
  console.log(`      - Cached Payload:`, JSON.parse(res2.responsePayload));

  assert.equal(res2.isCacheHit, true);
  assert.ok(res2.tokensSaved > 0);
  assert.equal(JSON.parse(res2.responsePayload).tier, 'enterprise_platinum');

  console.log('\n[✓] Multi-Agent Sub-Query Chunk Memoization & Zero-Cost Short-Circuit Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CHUNK MEMOIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
