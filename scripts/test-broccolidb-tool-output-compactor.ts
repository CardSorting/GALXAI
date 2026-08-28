import assert from 'node:assert/strict';
import { BroccoliToolOutputCompactor } from '../src/core/broccolidb/BroccoliToolOutputCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB TOOL OBSERVATION COMPACTOR & JSON PRUNER');
  console.log('======================================================================\n');

  BroccoliToolOutputCompactor.clear();

  // 1. Test Large Tabular API Response (e.g. 50 customer records with pagination boilerplate)
  const heavyApiResponse = {
    request_id: 'req_9988112233',
    status: 'success',
    pagination: {
      total_records: 50,
      current_page: 1,
      has_next: true,
      links: { next: 'https://api.galx.ai/v1/customers?page=2' },
    },
    customers: Array.from({ length: 50 }, (_, i) => ({
      id: `cust_${i + 1}`,
      name: `Enterprise Customer ${i + 1}`,
      email: `customer${i + 1}@corp.com`,
      meta: null,
      notes: undefined,
    })),
  };

  console.log('[1/2] Compacting 50-Record Heavy API Response Payload...');
  const result1 = BroccoliToolOutputCompactor.compactToolOutput(heavyApiResponse, 3);

  console.log(`      - Was Compacted: ${result1.wasCompacted}`);
  console.log(`      - Original Tokens: ${result1.originalTokens} -> Compacted: ${result1.compactedTokens}`);
  console.log(`      - Tokens Saved: ${result1.tokensSaved} (-${result1.savingsPercentage}%)`);
  console.log(`      - Compacted Payload: ${result1.compactedPayload.slice(0, 150)}...`);

  assert.equal(result1.wasCompacted, true);
  assert.ok(result1.savingsPercentage >= 65);
  assert.ok(!result1.compactedPayload.includes('pagination')); // Pagination pruned!
  assert.ok(result1.compactedPayload.includes('_totalCount":50')); // Summary retained!

  // 2. Test Verbose CLI / Bash Output (50 lines of logs with downloading progress)
  const rawLogOutput = `
npm warn deprecated inflight@1.0.6: This module is not supported.
Downloading package @supabase/supabase-js...
Downloading package @stripe/stripe-js...
${Array.from({ length: 40 }, (_, i) => `[Server Step ${i + 1}] Processing ledger migration index ${i + 1}`).join('\n')}
Migration successful: 40 tables updated in 12ms.
`;

  console.log('\n[2/2] Compacting 45-Line Verbose CLI Migration Log...');
  const result2 = BroccoliToolOutputCompactor.compactToolOutput(rawLogOutput);

  console.log(`      - Was Compacted: ${result2.wasCompacted}`);
  console.log(`      - Original Log Tokens: ${result2.originalTokens} -> Compacted: ${result2.compactedTokens}`);
  console.log(`      - Tokens Saved: ${result2.tokensSaved} (-${result2.savingsPercentage}%)`);

  assert.equal(result2.wasCompacted, true);
  assert.ok(result2.savingsPercentage >= 40);
  assert.ok(result2.compactedPayload.includes('[Log Output Truncated:'));

  console.log('\n[✓] Agent Tool Observation Compaction & JSON Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TOOL OUTPUT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
