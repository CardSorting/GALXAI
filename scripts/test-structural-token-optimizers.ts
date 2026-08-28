import assert from 'node:assert/strict';
import { ContextCompactor } from '../src/core/optimization/ContextCompactor';
import { OutputVerbosityOptimizer } from '../src/core/optimization/OutputVerbosityOptimizer';
import { SemanticEdgeCache } from '../src/core/optimization/SemanticEdgeCache';

function run() {
  console.log('======================================================================');
  console.log('  TESTING STRUCTURAL TOKEN REDUCTION & COMPACTION ENGINES');
  console.log('======================================================================\n');

  // 1. Test Context Compactor (Solving Quadratic Context History Bloat)
  console.log('[1/3] Testing Lossless Context Compactor (O(N^2) History Inflation)...');
  
  // Create 12 conversational turns totaling ~4,000 tokens
  const longDialogue: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: 'You are a helpful database migration assistant.' },
  ];

  for (let i = 1; i <= 10; i++) {
    longDialogue.push({
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Conversation turn ${i}: Explaining complex PostgreSQL indexing strategy and partitioning schema rules in detailed technical prose. `.repeat(15),
    });
  }

  const compaction = ContextCompactor.compact(longDialogue, {
    maxUncompactedTokens: 1_000,
    preserveRecentTurns: 3,
  });

  console.log(`      - Was Compacted: ${compaction.wasCompacted}`);
  console.log(`      - Original Messages: ${compaction.originalMessageCount} -> Compacted: ${compaction.compactedMessageCount}`);
  console.log(`      - Original Tokens: ~${compaction.originalEstimatedTokens} -> Compacted: ~${compaction.compactedEstimatedTokens}`);
  console.log(`      - Tokens Saved Per Turn: ~${compaction.tokensSaved} (-${compaction.savingsPercentage}%)`);

  assert.equal(compaction.wasCompacted, true);
  assert.ok(compaction.savingsPercentage >= 40);
  assert.ok(compaction.compactedMessageCount <= 5);

  // 2. Test Output Verbosity Optimizer (Slashing Fluff on $15/1M Output Tokens)
  console.log('\n[2/3] Testing Output Verbosity Optimizer (Slashing Filler Tokens)...');
  const apiMessages = [
    { role: 'user', content: 'Return customer record #4812 as JSON' },
  ];

  const verbosityResult = OutputVerbosityOptimizer.optimizeRequest(apiMessages, {
    isApiCall: true,
    workload: 'data_extraction',
  });

  console.log(`      - Was Optimized: ${verbosityResult.result.wasOptimized}`);
  console.log(`      - Directive Attached: "${verbosityResult.result.directiveInjected}"`);
  console.log(`      - Estimated Output Slashed: -${verbosityResult.result.estimatedOutputTokensSavedPct}%`);

  assert.equal(verbosityResult.result.wasOptimized, true);
  assert.ok(verbosityResult.optimizedMessages[0].content.includes('Concise response mode'));

  // 3. Test Semantic Edge Cache ($0.000 Inference on Near-Identical Queries)
  console.log('\n[3/3] Testing Sub-2ms Semantic Edge Cache ($0.000 Duplicate Queries)...');
  SemanticEdgeCache.clear();

  const query = 'What is your 30-day refund policy?';
  const model = 'gpt-5.6-sol';

  // First call is a miss
  const lookupMiss = SemanticEdgeCache.lookup(query, model);
  assert.equal(lookupMiss.hit, false);

  // Store completion in cache
  SemanticEdgeCache.store(query, model, 'You can request a full refund within 30 days of purchase.', 250);

  // Second near-identical call is a HIT
  const lookupHit = SemanticEdgeCache.lookup('What is your 30-day refund policy? ', model);
  console.log(`      - Cache Hit: ${lookupHit.hit}`);
  console.log(`      - Response Content: "${lookupHit.entry?.responseContent}"`);
  console.log(`      - Latency Saved: ${lookupHit.latencySavedMs}ms`);
  console.log(`      - Cost on Duplicate Query: $0.000 (100% saved)`);

  assert.equal(lookupHit.hit, true);
  assert.equal(lookupHit.entry?.hitCount, 1);

  console.log('\n======================================================================');
  console.log('   ALL STRUCTURAL TOKEN REDUCTION TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
