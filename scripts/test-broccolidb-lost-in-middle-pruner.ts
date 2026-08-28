import assert from 'node:assert/strict';
import { BroccoliLostInMiddlePruner, RetrievedChunk } from '../src/core/broccolidb/BroccoliLostInMiddlePruner';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LOST-IN-THE-MIDDLE ATTENTION PRUNER');
  console.log('======================================================================\n');

  BroccoliLostInMiddlePruner.clear();

  // Create 8 simulated RAG chunks with varying relevance scores
  const chunks: RetrievedChunk[] = [
    { id: 'chunk_1', relevanceScore: 0.95, text: 'TOP RELEVANT: The primary database replication key is stored in vault 01.' },
    { id: 'chunk_2', relevanceScore: 0.32, text: 'NOISE: The cafeteria lunch menu for Tuesday has been updated.' },
    { id: 'chunk_3', relevanceScore: 0.88, text: 'SECOND RELEVANT: Ledger checkpoints are signed using ECDSA secp256k1.' },
    { id: 'chunk_4', relevanceScore: 0.21, text: 'NOISE: Office parking permits must be renewed annually.' },
    { id: 'chunk_5', relevanceScore: 0.76, text: 'THIRD RELEVANT: Automated failover triggers if node heartbeat misses 3 pings.' },
    { id: 'chunk_6', relevanceScore: 0.15, text: 'NOISE: Holiday calendar schedule for 2026.' },
    { id: 'chunk_7', relevanceScore: 0.68, text: 'FOURTH RELEVANT: Inactive API keys are automatically revoked after 90 days.' },
    { id: 'chunk_8', relevanceScore: 0.40, text: 'LOW SCORE: General company marketing slogans.' },
  ];

  console.log('[1/2] Optimizing 8 RAG Chunks with U-Shaped Attention Re-Ranking...');
  const result = BroccoliLostInMiddlePruner.optimizeContextChunks(chunks, 4);

  console.log(`      - Was Optimized: ${result.wasOptimized}`);
  console.log(`      - Original Chunks: ${result.originalChunkCount} -> Retained: ${result.retainedChunkCount}`);
  console.log(`      - Original Tokens: ${result.originalTokens} -> Compacted: ${result.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Optimized Context:\n"""\n${result.orderedContextText}\n"""`);

  assert.equal(result.wasOptimized, true);
  assert.equal(result.retainedChunkCount, 4); // Noise chunks (< 0.55) pruned!
  assert.ok(result.tokensSaved > 0);
  // Verify U-shape: Top 1 (0.95) is at Doc 1 (start), Top 2 (0.88) is at Doc 4 (end)
  assert.ok(result.orderedContextText.includes('[Reference Doc 1 (Score: 0.95)]'));
  assert.ok(result.orderedContextText.includes('[Reference Doc 4 (Score: 0.88)]'));

  console.log('\n[✓] Lost-in-the-Middle Context Pruning & U-Shaped Attention Curve Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LOST-IN-THE-MIDDLE PRUNER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
