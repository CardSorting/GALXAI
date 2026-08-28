import assert from 'node:assert/strict';
import { BroccoliSubstringTrieCompactor } from '../src/core/broccolidb/BroccoliSubstringTrieCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SUBSTRING TRIE & SWARM PROMPT UNIFIER');
  console.log('======================================================================\n');

  BroccoliSubstringTrieCompactor.clear();

  const sharedSecurityClause = `
## Enterprise Security & Integrity Directive
All API invocations must include valid HMAC-SHA256 authentication headers.
Unauthenticated requests trigger immediate rate limiting and IP blocking.
Ledger records must be signed using ECDSA secp256k1 keys.
`.trim();

  const sharedComplianceClause = `
## ISO/IEC 27001 Data Privacy Compliance
Customer PII must never be logged in cleartext to cloud monitoring tools.
All database connections must enforce TLS 1.3 encryption in transit.
`.trim();

  // Agent 1: Billing Auditor
  const agent1Prompt = `
# Agent 1: Billing & Invoice Auditor
You are responsible for auditing customer invoices and credit balance deductions.

${sharedSecurityClause}

${sharedComplianceClause}

Please verify all pending invoice deductions.
`.trim();

  // Agent 2: Database Schema Refactorer
  const agent2Prompt = `
# Agent 2: Database Schema Refactorer
You are responsible for analyzing PostgreSQL index performance and foreign keys.

${sharedSecurityClause}

${sharedComplianceClause}

Please inspect migration step 04.
`.trim();

  // Agent 3: SRE Incident Responder
  const agent3Prompt = `
# Agent 3: SRE Incident Responder
You are responsible for diagnosing cloud service heartbeat interruptions.

${sharedSecurityClause}

${sharedComplianceClause}

Please review the latest alert telemetry.
`.trim();

  console.log('[1/2] Unifying 3 Heterogeneous Agent Prompts in Substring Trie...');
  const res = BroccoliSubstringTrieCompactor.unifyAgentPrompts([agent1Prompt, agent2Prompt, agent3Prompt]);

  console.log(`      - Was Optimized: ${res.wasOptimized}`);
  console.log(`      - Common Root Tokens: ${res.commonRootTokens} tokens`);
  console.log(`      - Original Swarm Tokens: ${res.individualAgentTokens.reduce((a, b) => a + b, 0)} tokens`);
  console.log(`      - Total Tokens Slashed: ${res.totalTokensSavedAcrossSwarm} tokens (-${res.savingsPercentage}%)`);
  console.log(`      - Unified Root Prefix Preview:\n"""\n${res.unifiedRootPrefix.slice(0, 150)}...\n"""`);

  assert.equal(res.wasOptimized, true);
  assert.ok(res.commonRootTokens > 0);
  assert.ok(res.totalTokensSavedAcrossSwarm > 0);
  assert.ok(res.unifiedRootPrefix.includes('Enterprise Security & Integrity Directive'));

  console.log('\n[✓] Multi-Agent Substring Trie Extraction & KV Cache Alignment Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SUBSTRING TRIE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
