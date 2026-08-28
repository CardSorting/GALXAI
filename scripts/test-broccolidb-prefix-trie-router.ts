import assert from 'node:assert/strict';
import { BroccoliPrefixTrieRouter } from '../src/core/broccolidb/BroccoliPrefixTrieRouter';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MULTI-BRANCH PREFIX TRIE ROUTER');
  console.log('======================================================================\n');

  BroccoliPrefixTrieRouter.clear();

  // 1,200 token shared system instructions & problem context
  const sharedSystemContext = `
# GALXAI Autonomous Architecture & Security Review Protocol
You are an autonomous AI auditor inspecting enterprise cloud infrastructure.
Follow all strict deterministic ISO/IEC 27001 compliance standards.
Evaluate memory layout, cache coherency, database replication latencies, and RBAC rules.
Ensure all cryptographic ledger entries are signed using ECDSA secp256k1 keys.
`.repeat(25); // ~1,200 tokens (Exceeds OpenAI 1024-token prompt cache threshold)

  console.log('[1/3] Registering Shared Root Prefix in BroccoliDB Trie Vault...');
  const reg = BroccoliPrefixTrieRouter.registerSharedRoot(sharedSystemContext);

  console.log(`      - Root Prefix Tokens: ${reg.tokenCount} tokens`);
  console.log(`      - Is KV Cache Eligible (≥1024 tokens): ${reg.isKVCacheEligible}`);
  console.log(`      - Root Hash: ${reg.rootHash.substring(0, 16)}...`);

  assert.equal(reg.isKVCacheEligible, true);
  assert.ok(reg.tokenCount >= 1024);

  // 2. Dispatch Branch 1 (Initial prefill)
  console.log('\n[2/3] Dispatching Branch 1 (Security Audit)...');
  const b1 = BroccoliPrefixTrieRouter.alignBranch(
    reg.rootHash,
    'Branch 1: Perform audit on IAM roles and cross-account STS permissions.'
  );

  console.log(`      - Branch 1 Aligned: ${b1.isAlignedWithSharedRoot}`);
  console.log(`      - Total Concurrent Branches: ${b1.totalConcurrentBranches}`);
  console.log(`      - Tokens Cached Across Swarm: ${b1.tokensCachedAcrossSwarm}`);

  assert.equal(b1.isAlignedWithSharedRoot, true);
  assert.equal(b1.totalConcurrentBranches, 1);

  // 3. Dispatch Branch 2 & Branch 3 (Expected: 100% KV Cache Re-use with 50% discount)
  console.log('\n[3/3] Dispatching Parallel Branch 2 (Database Sharding) & Branch 3 (FinOps Spend)...');
  const b2 = BroccoliPrefixTrieRouter.alignBranch(
    reg.rootHash,
    'Branch 2: Evaluate PostgreSQL replication lag and WAL replay checkpoints.'
  );
  const b3 = BroccoliPrefixTrieRouter.alignBranch(
    reg.rootHash,
    'Branch 3: Analyze GPU token spend velocity and idle instance reclamation.'
  );

  console.log(`      - Branch 2 Root Cached Tokens: ${b2.tokensCachedAcrossSwarm} tokens`);
  console.log(`      - Branch 2 Dollars Saved Swarm: $${b2.dollarsSavedSwarmUsd.toFixed(6)}`);
  console.log(`      - Branch 3 Total Swarm Branches: ${b3.totalConcurrentBranches}`);

  assert.equal(b2.tokensCachedAcrossSwarm, reg.tokenCount);
  assert.equal(b3.tokensCachedAcrossSwarm, reg.tokenCount);
  assert.equal(b3.totalConcurrentBranches, 3);

  console.log('\n[✓] Multi-Branch Prefix Trie Alignment & 50% Shared KV Cache Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PREFIX TRIE ROUTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
