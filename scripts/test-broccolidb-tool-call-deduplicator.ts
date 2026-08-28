import assert from 'node:assert/strict';
import { BroccoliToolCallDeduplicator } from '../src/core/broccolidb/BroccoliToolCallDeduplicator';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MULTI-AGENT TOOL CALL DEDUPLICATOR');
  console.log('======================================================================\n');

  BroccoliToolCallDeduplicator.clear();

  const toolName = 'query_enterprise_ledger';
  const toolPayload = JSON.stringify({
    checkpoints: [
      { id: 'chk_101', balance: 500000, currency: 'USD', status: 'verified' },
      { id: 'chk_102', balance: 125000, currency: 'EUR', status: 'verified' },
      { id: 'chk_103', balance: 350000, currency: 'GBP', status: 'verified' },
    ],
    timestamp: '2026-08-28T03:50:00Z',
  });

  // Agent 1 calls tool with keys: { limit: 10, orgId: "org_99", filter: "active" }
  const argsAgent1 = {
    limit: 10,
    orgId: 'org_99',
    filter: 'active',
  };

  // Agent 2 calls tool with flipped keys: { filter: "active", orgId: "org_99", limit: 10 }
  const argsAgent2 = {
    filter: 'active',
    orgId: 'org_99',
    limit: 10,
  };

  // 1. Initial tool call check from Agent 1 (Expected: Not duplicate)
  console.log('[1/3] Agent 1 Checks Tool Execution Vault...');
  const check1 = BroccoliToolCallDeduplicator.checkAndAcquire(toolName, argsAgent1);
  console.log(`      - Is Duplicate Call: ${check1.isDuplicateCall}`);
  assert.equal(check1.isDuplicateCall, false);

  // Store tool execution result
  console.log('\n[2/3] Executing Tool Call & Storing Result in Vault (<0.01ms)...');
  BroccoliToolCallDeduplicator.recordToolResult(toolName, argsAgent1, toolPayload);

  // 2. Concurrent Agent 2 calls tool with flipped object keys (Expected: 100% Duplicate Short-Circuit)
  console.log('\n[3/3] Agent 2 Invokes Tool with Flipped Object Keys...');
  const check2 = BroccoliToolCallDeduplicator.checkAndAcquire(toolName, argsAgent2, 2.50);

  console.log(`      - Is Duplicate Call: ${check2.isDuplicateCall}`);
  console.log(`      - Call Signatures Matched: ${check1.callSignature === check2.callSignature}`);
  console.log(`      - Tokens Saved: ${check2.tokensSaved} tokens`);
  console.log(`      - Dollars Saved on Tool Call: $${check2.dollarsSavedUsd.toFixed(6)}`);
  console.log(`      - Reused Tool Payload:`, JSON.parse(check2.resultPayload || '{}'));

  assert.equal(check2.isDuplicateCall, true);
  assert.equal(check1.callSignature, check2.callSignature);
  assert.ok(check2.tokensSaved > 0);
  assert.equal(JSON.parse(check2.resultPayload || '{}').checkpoints.length, 3);

  console.log('\n[✓] Multi-Agent Tool Argument Normalization & Duplicate Short-Circuiting Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TOOL CALL DEDUPLICATOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
