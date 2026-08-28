import assert from 'node:assert/strict';
import { BroccoliLockfileCompactor } from '../src/core/broccolidb/BroccoliLockfileCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LOCKFILE & DEPENDENCY COMPACTOR');
  console.log('======================================================================\n');

  BroccoliLockfileCompactor.clear();

  // Full package-lock.json with 5 dependencies containing integrity hashes, resolved urls, and dev flags
  const rawLockfile = JSON.stringify({
    name: 'galxai-control-plane',
    version: '1.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'galxai-control-plane',
        version: '1.0.0',
        dependencies: {
          zod: '^3.22.4',
          stripe: '^14.14.0',
          '@supabase/ssr': '^0.1.0',
          hono: '^4.0.0',
          dotenv: '^16.4.5',
        },
      },
      'node_modules/zod': {
        version: '3.22.4',
        resolved: 'https://registry.npmjs.org/zod/-/zod-3.22.4.tgz',
        integrity: 'sha512-4Uq4Q8gUvU00k0aV3p0...very-long-sha512-hash-string-here',
        dev: false,
      },
      'node_modules/stripe': {
        version: '14.14.0',
        resolved: 'https://registry.npmjs.org/stripe/-/stripe-14.14.0.tgz',
        integrity: 'sha512-stripe-long-sha512-hash-string-here',
        dev: false,
      },
      'node_modules/@supabase/ssr': {
        version: '0.1.0',
        resolved: 'https://registry.npmjs.org/@supabase/ssr/-/ssr-0.1.0.tgz',
        integrity: 'sha512-supabase-long-sha512-hash-string-here',
        dev: false,
      },
      'node_modules/hono': {
        version: '4.0.0',
        resolved: 'https://registry.npmjs.org/hono/-/hono-4.0.0.tgz',
        integrity: 'sha512-hono-long-sha512-hash-string-here',
        dev: false,
      },
      'node_modules/dotenv': {
        version: '16.4.5',
        resolved: 'https://registry.npmjs.org/dotenv/-/dotenv-16.4.5.tgz',
        integrity: 'sha512-dotenv-long-sha512-hash-string-here',
        dev: false,
      },
    },
  }, null, 2);

  console.log('[1/2] Compacting Package Lockfile in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliLockfileCompactor.compactLockfile(rawLockfile);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Packages: ${res.totalPackagesCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Dependency Preview:\n"""\n${res.compactedDependencyPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.totalPackagesCount, 5);
  assert.ok(res.savingsPercentage >= 45);
  assert.ok(res.compactedDependencyPrompt.includes('zod@3.22.4'));
  assert.ok(res.compactedDependencyPrompt.includes('stripe@14.14.0'));
  assert.ok(res.compactedDependencyPrompt.includes('@supabase/ssr@0.1.0'));
  assert.ok(!res.compactedDependencyPrompt.includes('registry.npmjs.org')); // URL pruned
  assert.ok(!res.compactedDependencyPrompt.includes('sha512-')); // Integrity hash pruned

  console.log('\n[✓] Lockfile Dependency Extraction & Integrity Hash Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LOCKFILE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
