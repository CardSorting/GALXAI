import assert from 'node:assert/strict';
import { BroccoliKVCacheOptimizer } from '../src/core/broccolidb/BroccoliKVCacheOptimizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB KV CACHE PREFIX OPTIMIZER & 50% CACHE DISCOUNT');
  console.log('======================================================================\n');

  BroccoliKVCacheOptimizer.clear();

  // Create 1,200-token static guideline text
  const staticGuidelineChunk = 'You are the enterprise assistant following strict guidelines and safety schemas. '.repeat(60);

  // 1. Simulate Unoptimized Prompt with line 1 dynamic timestamp that breaks KV cache alignment
  console.log('[1/2] Simulating Unoptimized Prompt (Line 1 Timestamp Breaking KV Cache)...');
  const unoptimizedMessages = [
    {
      role: 'system',
      content: `Current Timestamp: 2026-08-27T23:10:12Z\nRequest UUID: 98dfa2-3847-ab12\n\n${staticGuidelineChunk}`,
    },
    {
      role: 'user',
      content: 'How do I query my billing records?',
    },
  ];

  const opt1 = BroccoliKVCacheOptimizer.optimizePrompt(unoptimizedMessages);

  console.log(`      - Was Reordered: ${opt1.wasReordered}`);
  console.log(`      - Prefix Token Count: ${opt1.prefixTokenCount} tokens`);
  console.log(`      - Eligible for OpenAI 50% Cache: ${opt1.isEligibleForOpenAiCache} (Threshold: ≥1024)`);
  console.log(`      - KV Cache Key Hash: ${opt1.cacheKey}`);
  console.log(`      - Estimated Discount Per Request: $${opt1.estimatedCostReductionUsd.toFixed(6)}`);

  assert.equal(opt1.wasReordered, true);
  assert.equal(opt1.isEligibleForOpenAiCache, true);
  assert.ok(opt1.prefixTokenCount >= 1024);
  assert.ok(opt1.optimizedMessages[0].content.startsWith('You are the enterprise assistant'));

  // 2. Simulate Subsequent Request with New Timestamp (Should hit exact same KV cache key!)
  console.log('\n[2/2] Simulating Subsequent Request with NEW Timestamp (Testing Cache Key Alignment)...');
  const secondMessages = [
    {
      role: 'system',
      content: `Current Timestamp: 2026-08-27T23:10:45Z\nRequest UUID: cc771b-9901-ee44\n\n${staticGuidelineChunk}`,
    },
    {
      role: 'user',
      content: 'Can I export my invoices to CSV?',
    },
  ];

  const opt2 = BroccoliKVCacheOptimizer.optimizePrompt(secondMessages);

  console.log(`      - Cache Key 1: ${opt1.cacheKey}`);
  console.log(`      - Cache Key 2: ${opt2.cacheKey}`);
  console.log(`      - Cache Key Exact Match: ${opt1.cacheKey === opt2.cacheKey}`);

  assert.equal(opt1.cacheKey, opt2.cacheKey);

  // Check Stats
  const stats = BroccoliKVCacheOptimizer.getStats();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  BROCCOLIDB KV CACHE OPTIMIZATION STATS`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`• Unique Static Prefixes Cached: ${stats.uniquePrefixesCached}`);
  console.log(`• Total Aligned Cache Hits:      ${stats.totalCacheHits}`);
  console.log(`• Total Dollars Saved on Inputs: $${stats.totalAvoidedInputCostUsd.toFixed(6)}`);
  console.log(`======================================================================\n`);

  assert.equal(stats.uniquePrefixesCached, 1);
  assert.equal(stats.totalCacheHits, 2);

  console.log('   ALL KV CACHE OPTIMIZER TESTS PASSED (100%)\n');
}

run();
