import assert from 'node:assert/strict';
import { BroccoliPromptCASVault } from '../src/core/broccolidb/BroccoliPromptCASVault';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CAS PROMPT DEDUPLICATION & COMPRESSION VAULT');
  console.log('======================================================================\n');

  BroccoliPromptCASVault.clear();

  const largeSystemPrompt = `
You are the primary database migration and query optimization assistant for GALXAI.
Here is the strict PostgreSQL schema definition for the 4 core spend governance tables:
1. galx_spend_governance_policies
2. galx_model_route_evidence
3. galx_forensic_waste_incidents
4. galx_departmental_spend_attributions
Always follow strict RLS policies and include cryptographic SHA-256 evidence digests.
`.repeat(20); // ~4,000 bytes

  console.log(`[1/3] Ingesting initial 4KB system prompt into BroccoliDB CAS vault...`);
  const store1 = BroccoliPromptCASVault.storePrompt(largeSystemPrompt);
  console.log(`      - SHA-256 Digest: ${store1.sha256}`);
  console.log(`      - Is Deduplicated: ${store1.isDeduplicated}`);
  console.log(`      - Saved Bytes: ${store1.savedBytes} bytes`);

  assert.equal(store1.isDeduplicated, false);
  assert.ok(store1.sha256.length === 64);

  // 2. Ingest identical prompt 10 times (simulating 10 requests using the same prompt template)
  console.log(`\n[2/3] Simulating 10 production requests using the identical prompt template...`);
  for (let i = 0; i < 10; i++) {
    const storeN = BroccoliPromptCASVault.storePrompt(largeSystemPrompt);
    assert.equal(storeN.isDeduplicated, true);
    assert.equal(storeN.sha256, store1.sha256);
  }
  console.log(`      - 10/10 subsequent requests intercepted and deduplicated (0 duplicate allocations).`);

  // 3. Resolve prompt from CAS by hash
  console.log(`\n[3/3] Hydrating prompt payload from CAS vault by hash...`);
  const resolved = BroccoliPromptCASVault.resolvePrompt(store1.sha256);
  assert.equal(resolved, largeSystemPrompt);
  console.log(`      - Hydration Verified: 100% byte-for-byte exact match.`);

  // 4. Check Aggregate Storage Savings
  const stats = BroccoliPromptCASVault.getStorageSavingsStats();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  BROCCOLIDB CAS STORAGE EFFICIENCY METRICS`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`• Unique Stored Blobs:       ${stats.uniqueBlobsCount}`);
  console.log(`• Total Trace References:    ${stats.totalReferences}`);
  console.log(`• Gross Avoided Memory:      ${stats.avoidedGrossBytes.toLocaleString()} bytes`);
  console.log(`• Total Memory Footprint Saved: -${stats.savingsRatioPct}%`);
  console.log(`======================================================================\n`);

  assert.equal(stats.uniqueBlobsCount, 1);
  assert.equal(stats.totalReferences, 11);
  assert.ok(stats.savingsRatioPct >= 90);

  console.log('   ALL BROCCOLIDB CAS VAULT TESTS PASSED (100%)\n');
}

run();
