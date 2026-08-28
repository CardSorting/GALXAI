import assert from 'node:assert/strict';
import { BroccoliSystemVarSplitter } from '../src/core/broccolidb/BroccoliSystemVarSplitter';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SYSTEM VARIABLE SPLITTER & KV HOISTER');
  console.log('======================================================================\n');

  BroccoliSystemVarSplitter.clear();

  // 1,200 tokens of static organization policy preceded by transient dynamic variables
  const staticPolicy = `
# GALXAI Global Organization Architecture & Governance Rules
All database queries must use parameterized prepared statements.
Ensure zero SQL injection vectors across all REST and GraphQL endpoints.
Ledger records must be validated using secp256k1 cryptographic signatures.
Memory allocation thresholds are capped at 512MB per tenancy worker.
`.repeat(25); // ~1,200 tokens

  // User 1 prompt with dynamic transient prefix
  const rawPromptUser1 = `You are assisting user_alice_101 in session_99812 at 2026-08-28T00:05:00Z.\n\n${staticPolicy}`;

  // User 2 prompt with different dynamic transient prefix
  const rawPromptUser2 = `You are assisting user_bob_202 in session_33114 at 2026-08-28T00:05:12Z.\n\n${staticPolicy}`;

  console.log('[1/2] Splitting Dynamic Variable Prefix for User Alice...');
  const res1 = BroccoliSystemVarSplitter.splitSystemPrompt(rawPromptUser1);

  console.log(`      - Was Split: ${res1.wasSplit}`);
  console.log(`      - Static Invariant Tokens: ${res1.staticPrefixTokens} tokens`);
  console.log(`      - Is KV Cache Eligible (≥1024 tokens): ${res1.isKVCacheEligible}`);
  console.log(`      - Static Prefix Hash: ${res1.staticPrefixHash.substring(0, 16)}...`);
  console.log(`      - Reconstructed User Prefix: "${res1.reconstructedUserPrefix.trim()}"`);

  assert.equal(res1.wasSplit, true);
  assert.equal(res1.isKVCacheEligible, true);

  console.log('\n[2/2] Splitting Dynamic Variable Prefix for User Bob...');
  const res2 = BroccoliSystemVarSplitter.splitSystemPrompt(rawPromptUser2);

  console.log(`      - Static Prefix Hash Match with User Alice: ${res1.staticPrefixHash === res2.staticPrefixHash}`);
  console.log(`      - 100% Shared KV Cache Unlocked: true`);

  assert.equal(res2.wasSplit, true);
  assert.equal(res1.staticPrefixHash, res2.staticPrefixHash); // 100% Shared KV Cache Hit!

  console.log('\n[✓] System Variable AST Splitting & Shared Invariant Prefix Hoisting Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SYSTEM VAR SPLITTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
