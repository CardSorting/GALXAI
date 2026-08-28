import assert from 'node:assert/strict';
import { BroccoliRecordCompactor } from '../src/core/broccolidb/BroccoliRecordCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB RECORD COMPACTOR & KEY-PATH FLATTENER');
  console.log('======================================================================\n');

  BroccoliRecordCompactor.clear();

  // 5 nested enterprise customer and subscription records
  const nestedCustomerRecords = [
    {
      customerId: 'cust_001',
      profile: { name: 'Alice Smith', country: 'US', tier: 'enterprise' },
      billing: { mrrUsd: 1500, activeSeats: 45, autoRenew: true },
    },
    {
      customerId: 'cust_002',
      profile: { name: 'Bob Jones', country: 'DE', tier: 'pro' },
      billing: { mrrUsd: 450, activeSeats: 12, autoRenew: false },
    },
    {
      customerId: 'cust_003',
      profile: { name: 'Charlie Kim', country: 'JP', tier: 'enterprise' },
      billing: { mrrUsd: 3200, activeSeats: 110, autoRenew: true },
    },
    {
      customerId: 'cust_004',
      profile: { name: 'Diana Prince', country: 'UK', tier: 'starter' },
      billing: { mrrUsd: 99, activeSeats: 3, autoRenew: true },
    },
    {
      customerId: 'cust_005',
      profile: { name: 'Evan Wright', country: 'CA', tier: 'pro' },
      billing: { mrrUsd: 600, activeSeats: 18, autoRenew: true },
    },
  ];

  console.log('[1/2] Compacting 5 Deeply-Nested JSON Records into Dense Key-Path Table...');
  const res = BroccoliRecordCompactor.compactRecords(nestedCustomerRecords);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original JSON Tokens: ${res.originalTokens} -> Compacted Table Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Representation:\n"""\n${res.compactedRepresentation}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedRepresentation.includes('profile.name|profile.country'));
  assert.ok(res.compactedRepresentation.includes('cust_001|Alice Smith'));

  console.log('\n[✓] Key-Path Flattening & Syntax Punctuation Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL RECORD COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
