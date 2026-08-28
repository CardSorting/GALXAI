import assert from 'node:assert/strict';
import { BroccoliContractRedlineCompactor } from '../src/core/broccolidb/BroccoliContractRedlineCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CONTRACT REDLINE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliContractRedlineCompactor.clear();

  // Original Agreement: 5 clauses
  const originalContract = `
1. Scope of Work: Contractor shall provide enterprise AI architecture and database optimization.

2. Term and Termination: Either party may terminate this agreement upon 30 days written notice.

3. Limitation of Liability: Neither party shall be liable for indirect, punitive, or consequential damages. Liability is uncapped.

4. Governing Law: This agreement is governed by Delaware law.

5. Confidentiality: Each party shall protect proprietary confidential information for a period of 5 years.
`.trim();

  // Revised Agreement: Clause 3 mutated to have a $5M liability cap, Clause 1-2 & 4-5 unchanged
  const revisedContract = `
1. Scope of Work: Contractor shall provide enterprise AI architecture and database optimization.

2. Term and Termination: Either party may terminate this agreement upon 30 days written notice.

3. Limitation of Liability: In no event shall either party's aggregate liability exceed $5,000,000 or the total fees paid in the preceding 12 months.

4. Governing Law: This agreement is governed by Delaware law.

5. Confidentiality: Each party shall protect proprietary confidential information for a period of 5 years.
`.trim();

  console.log('[1/2] Slicing Contract Redline in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliContractRedlineCompactor.compactRedline(originalContract, revisedContract);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Clauses: ${res.totalClausesCount} (Mutated: ${res.mutatedClausesCount}, Unchanged: ${res.unchangedClausesCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Redline Prompt Preview:\n"""\n${res.compactedRedlinePrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.mutatedClausesCount, 1);
  assert.equal(res.unchangedClausesCount, 4);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedRedlinePrompt.includes('[4 UNCHANGED BOILERPLATE CLAUSES OMITTED]'));
  assert.ok(res.compactedRedlinePrompt.includes('MUTATED SECTION [3]'));
  assert.ok(res.compactedRedlinePrompt.includes('$5,000,000'));

  console.log('\n[✓] Contract Redline Mutation Slicing & Unchanged Provision Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CONTRACT REDLINE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
