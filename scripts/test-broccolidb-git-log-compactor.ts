import assert from 'node:assert/strict';
import { BroccoliGitLogCompactor } from '../src/core/broccolidb/BroccoliGitLogCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB GIT LOG COMPACTOR');
  console.log('======================================================================\n');

  BroccoliGitLogCompactor.clear();

  // Verbose git log output with 4 multi-line commit blocks
  const rawGitLog = `
commit 3f8a92b019284019284019284019284019284019
Author: Alex Morgan <alex.morgan@enterprise.com>
Date:   Fri Aug 28 00:21:49 2026 -0600

    feat(billing): add atomic budget leases

commit 7e2d910a82910482910482910482910482910482
Author: Sarah Jenkins <sarah.jenkins@enterprise.com>
Date:   Thu Aug 27 22:15:02 2026 -0600

    fix(auth): prevent concurrent token refresh race condition

commit 1a994bc882910482910482910482910482910482
Author: Robert Chen <robert.chen@enterprise.com>
Date:   Thu Aug 27 19:40:11 2026 -0600

    perf(broccolidb): optimize single-flight batch coalescing

commit 9c481af002910482910482910482910482910482
Author: Alex Morgan <alex.morgan@enterprise.com>
Date:   Thu Aug 27 16:10:00 2026 -0600

    refactor(cache): hoist KV static prompt prefixes
`.trim();

  console.log('[1/2] Compacting Git Log History in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliGitLogCompactor.compactGitLog(rawGitLog);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Commits: ${res.totalCommitsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Git Log Preview:\n"""\n${res.compactedGitLogPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.totalCommitsCount, 4);
  assert.ok(res.savingsPercentage >= 45);
  assert.ok(res.compactedGitLogPrompt.includes('[3f8a92b] feat(billing): add atomic budget leases (by Alex Morgan)'));
  assert.ok(res.compactedGitLogPrompt.includes('[7e2d910] fix(auth): prevent concurrent token refresh'));
  assert.ok(!res.compactedGitLogPrompt.includes('Date:   Fri Aug 28')); // Date boilerplate pruned
  assert.ok(!res.compactedGitLogPrompt.includes('<alex.morgan@enterprise.com>')); // Email angle brackets pruned

  console.log('\n[✓] Git Log History Oneline Compaction & Author Angle Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL GIT LOG COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
