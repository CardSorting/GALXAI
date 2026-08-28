import assert from 'node:assert/strict';
import { BroccoliSubGraphCache } from '../src/core/broccolidb/BroccoliSubGraphCache';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CROSS-TENANT SUB-GRAPH PROMPT CACHE');
  console.log('======================================================================\n');

  BroccoliSubGraphCache.clear();

  // Create a 2,000-token shared corporate security compliance policy document
  const sharedSecurityPolicy = `
# GALXAI GLOBAL SOC2 & PCI-DSS COMPLIANCE SPECIFICATION
All employee access to customer PII databases must be authorized via multi-factor biometric authentication.
Ledger migrations require cryptographic quorum sign-off across three independent key escrow nodes.
Database backups are encrypted at rest with AES-256-GCM and replicated to geographic cold vaults every 60 minutes.
`.repeat(20); // ~2,000 tokens (> 1,024 minimum threshold)

  // Tenant 1 (Legal Department) Query
  console.log('[1/3] Ingesting Query from Tenant A (Legal Dept)...');
  const resTenantA = BroccoliSubGraphCache.alignSharedSubGraph(
    sharedSecurityPolicy,
    'What is the backup encryption standard?',
    'tenant_legal_dept'
  );

  console.log(`      - Is Shared Sub-Graph: ${resTenantA.isSharedSubGraph}`);
  console.log(`      - Document Tokens: ${resTenantA.documentTokens}`);
  console.log(`      - Is KV Cache Eligible (≥1024 tokens): ${resTenantA.isKVCacheEligible}`);
  console.log(`      - Document Hash: ${resTenantA.documentHash.substring(0, 16)}...`);

  assert.equal(resTenantA.isSharedSubGraph, false); // First access
  assert.equal(resTenantA.isKVCacheEligible, true);

  // Tenant 2 (Engineering Department) Query on the EXACT same policy document
  console.log('\n[2/3] Ingesting Query from Tenant B (Engineering Dept) on Same Document...');
  const resTenantB = BroccoliSubGraphCache.alignSharedSubGraph(
    sharedSecurityPolicy,
    'How often are backups replicated to cold vaults?',
    'tenant_eng_team'
  );

  console.log(`      - Is Shared Sub-Graph: ${resTenantB.isSharedSubGraph}`);
  console.log(`      - Document Hash Match: ${resTenantA.documentHash === resTenantB.documentHash}`);
  console.log(`      - Sub-Graph Shared Across Multiple Tenants: true`);

  assert.equal(resTenantB.isSharedSubGraph, true); // Second access recognized as shared sub-graph!
  assert.equal(resTenantA.documentHash, resTenantB.documentHash);

  const entry = BroccoliSubGraphCache.getInstance().subGraphTable.get(resTenantA.documentHash);
  console.log(`\n[3/3] Total Tenants Sharing Document Sub-Graph: ${entry?.totalTenantsShared}`);
  assert.equal(entry?.totalTenantsShared, 2);

  console.log('\n[✓] Cross-Tenant Shared Sub-Graph Alignment & KV Cache Unification Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SUB-GRAPH CACHE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
