import assert from 'node:assert/strict';
import { BroccoliGitStatusCompactor } from '../src/core/broccolidb/BroccoliGitStatusCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB GIT STATUS COMPACTOR');
  console.log('======================================================================\n');

  BroccoliGitStatusCompactor.clear();

  // Verbose git status terminal output with 15 lines of advice and tracking info
  const rawGitStatus = `
On branch feature/billing-optimization
Your branch is up to date with 'origin/feature/billing-optimization'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   src/core/billing-engine.ts
	new file:   src/core/stripe-client.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/core/broccolidb/index.ts
	modified:   src/core/broccolidb/broccolidb-table.ts
	deleted:    src/legacy/old-billing.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	scripts/benchmark-memory.ts
	tmp/scratch-notes.txt
`.trim();

  console.log('[1/2] Compacting Git Status Output in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliGitStatusCompactor.compactGitStatus(rawGitStatus);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Files: ${res.totalFilesCount} (M: ${res.modifiedFilesCount}, A: ${res.addedFilesCount}, ?: ${res.untrackedFilesCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Git State Preview:\n"""\n${res.compactedGitStatePrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.totalFilesCount, 7);
  assert.equal(res.modifiedFilesCount, 2);
  assert.equal(res.addedFilesCount, 2);
  assert.ok(res.savingsPercentage >= 45);
  assert.ok(res.compactedGitStatePrompt.includes('GIT STATUS [Branch: feature/billing-optimization]'));
  assert.ok(res.compactedGitStatePrompt.includes('M (2 files): src/core/broccolidb/index.ts, src/core/broccolidb/broccolidb-table.ts'));
  assert.ok(res.compactedGitStatePrompt.includes('A (2 files): src/core/billing-engine.ts, src/core/stripe-client.ts'));
  assert.ok(!res.compactedGitStatePrompt.includes('use "git restore --staged')); // Git advice pruned

  console.log('\n[✓] Git Status Porcelain Compaction & Advice Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL GIT STATUS COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
