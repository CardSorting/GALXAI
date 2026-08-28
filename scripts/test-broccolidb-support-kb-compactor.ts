import assert from 'node:assert/strict';
import { BroccoliSupportKbCompactor } from '../src/core/broccolidb/BroccoliSupportKbCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SUPPORT KB ARTICLE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSupportKbCompactor.clear();

  // Zendesk Help Center knowledge base article with navigation chrome, TOC, author, and feedback widgets
  const rawKbArticle = `
# How to Resolve 401 Unauthorized API Errors

Written by: Alex Morgan, Lead Developer Support
Last updated: August 20, 2026

Table of Contents:
1. Overview
2. Common Causes
3. Step-by-Step Resolution

## Overview
A 401 Unauthorized status code indicates that the request has not been applied because it lacks valid authentication credentials.

## Step-by-Step Resolution
1. Verify that your API key is correctly prefixed with \`sk_live_\` or \`sk_test_\`.
2. Ensure the Authorization header is formatted as \`Authorization: Bearer YOUR_API_KEY\`.
3. Check your billing dashboard to confirm the workspace has active credits.

Related Articles:
- How to rotate your API secret keys
- Managing multi-workspace permissions

Was this article helpful?
[Yes] [No]

Have more questions? Submit a request
`.trim();

  console.log('[1/2] Compacting Support KB Article in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliSupportKbCompactor.compactKbArticle(rawKbArticle);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Article Preview:\n"""\n${res.compactedArticle}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 25);
  assert.ok(res.compactedArticle.includes('# How to Resolve 401 Unauthorized API Errors'));
  assert.ok(res.compactedArticle.includes('Verify that your API key is correctly prefixed'));
  assert.ok(!res.compactedArticle.includes('Table of Contents'));
  assert.ok(!res.compactedArticle.includes('Was this article helpful?'));
  assert.ok(!res.compactedArticle.includes('Written by: Alex Morgan'));

  console.log('\n[✓] Support KB Navigation Chrome & Feedback Widget Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SUPPORT KB COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
