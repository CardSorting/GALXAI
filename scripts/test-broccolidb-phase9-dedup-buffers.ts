/**
 * GALXAI BroccoliDB Phase 9 KV-Cache, SVD Subspace & BPE DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 9 deduplication buffers:
 * 1. BroccoliCrossTurnKvAttentionAnchorBuffer (64-Token PagedAttention KV Cache Anchor)
 * 2. BroccoliBpeBytePairTokenDedupBuffer (Streaming Byte-Pair Encoding BPE)
 * 3. BroccoliSvdLowRankProjectionDedupBuffer (128-to-16 Low-Rank SVD Projection)
 * 4. BroccoliTemporalSlidingEventQuantizerBuffer (Microsecond Epoch Timestamp Quantizer)
 * 5. BroccoliContextualPruningTokenWeightBuffer (Information-Theoretic Salience Pruner)
 */

import { BroccoliCrossTurnKvAttentionAnchorBuffer } from '../src/core/broccolidb/BroccoliCrossTurnKvAttentionAnchorBuffer';
import { BroccoliBpeBytePairTokenDedupBuffer } from '../src/core/broccolidb/BroccoliBpeBytePairTokenDedupBuffer';
import { BroccoliSvdLowRankProjectionDedupBuffer } from '../src/core/broccolidb/BroccoliSvdLowRankProjectionDedupBuffer';
import { BroccoliTemporalSlidingEventQuantizerBuffer } from '../src/core/broccolidb/BroccoliTemporalSlidingEventQuantizerBuffer';
import { BroccoliContextualPruningTokenWeightBuffer } from '../src/core/broccolidb/BroccoliContextualPruningTokenWeightBuffer';

async function runPhase9DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 9 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliCrossTurnKvAttentionAnchorBuffer
  console.log('[1/5] Testing BroccoliCrossTurnKvAttentionAnchorBuffer (KV-Cache 64-Token Alignment)...');
  const kvBuffer = BroccoliCrossTurnKvAttentionAnchorBuffer.getInstance();
  kvBuffer.clear();

  const invariantSystemPrompt = 'SYSTEM INSTRUCTION: You are an autonomous financial spend optimizer for enterprise databases.';
  kvBuffer.registerPinnedPrefix('sys_prompt_v1', invariantSystemPrompt);

  const turn1 = kvBuffer.alignPrompt('sys_prompt_v1', 'Query balance for Account #84920.');
  const turn2 = kvBuffer.alignPrompt('sys_prompt_v1', 'Execute settlement for $14,500 USD.');

  console.log(`      Prefix Tokens (Aligned to 64-Block) : ${turn1.prefixTokens} (Block Boundary Check: ${turn1.prefixTokens % 64 === 0})`);
  console.log(`      Turn 1 Total Tokens                 : ${turn1.totalTokens}`);
  console.log(`      Turn 2 Total Tokens                 : ${turn2.totalTokens}`);
  console.log(`      KV-Cache Cache Hit Score            : ${turn1.kvCacheHitScore * 100}%`);

  if (!turn1.wasAligned || turn1.prefixTokens % 64 !== 0 || turn1.kvCacheHitScore !== 1.0) {
    throw new Error('KV-cache attention anchoring alignment failed');
  }
  console.log('      [PASS] CrossTurnKvAttentionAnchorBuffer: 100% verified 64-token KV-cache alignment.\n');

  // 2. Test BroccoliBpeBytePairTokenDedupBuffer
  console.log('[2/5] Testing BroccoliBpeBytePairTokenDedupBuffer (BPE Sub-Word Merge)...');
  const rawText = 'The integration structure requires constant verification and transaction status monitoringable.';
  const bpeResult = BroccoliBpeBytePairTokenDedupBuffer.compressBpe(rawText);
  const decompressed = BroccoliBpeBytePairTokenDedupBuffer.decompressBpe(bpeResult.compactedBpeText);

  console.log(`      Original Tokens      : ${bpeResult.originalTokens}`);
  console.log(`      Compacted BPE Tokens : ${bpeResult.compactedTokens}`);
  console.log(`      Merges Applied       : ${bpeResult.mergesAppliedCount}`);
  console.log(`      Reversibility Match  : ${decompressed === rawText}`);

  if (!bpeResult.wasCompressed || decompressed !== rawText || bpeResult.mergesAppliedCount < 3) {
    throw new Error('BPE token deduplication failed');
  }
  console.log('      [PASS] BpeBytePairTokenDedupBuffer: 100% verified Byte-Pair Encoding merges.\n');

  // 3. Test BroccoliSvdLowRankProjectionDedupBuffer
  console.log('[3/5] Testing BroccoliSvdLowRankProjectionDedupBuffer (128-to-16 Low-Rank SVD)...');
  const svdBuffer = BroccoliSvdLowRankProjectionDedupBuffer.getInstance(0.85);
  svdBuffer.clear();

  const highDimVec1 = new Float32Array(128);
  const highDimVec2 = new Float32Array(128);
  const highDimVec3 = new Float32Array(128);

  for (let i = 0; i < 128; i++) {
    highDimVec1[i] = Math.sin(i * 0.1);
    highDimVec2[i] = Math.sin(i * 0.1) + 0.02; // Near-duplicate with tiny noise
    highDimVec3[i] = Math.cos(i * 0.5);        // Orthogonal vector
  }

  const svdRes1 = svdBuffer.testAndInsert('vec_1', highDimVec1);
  const svdRes2 = svdBuffer.testAndInsert('vec_2', highDimVec2);
  const svdRes3 = svdBuffer.testAndInsert('vec_3', highDimVec3);

  console.log(`      Vector 1 Low-Rank Seeded : isDup=${svdRes1.isDuplicate}`);
  console.log(`      Vector 2 Match (Near)    : isDup=${svdRes2.isDuplicate}, Cosine=${svdRes2.lowRankCosineSimilarity}, MatchedId=${svdRes2.matchedId}`);
  console.log(`      Vector 3 Match (Far)     : isDup=${svdRes3.isDuplicate}, Cosine=${svdRes3.lowRankCosineSimilarity}`);

  if (!svdRes2.isDuplicate || svdRes3.isDuplicate || svdRes2.matchedId !== 'vec_1') {
    throw new Error('Truncated SVD low-rank subspace deduplication failed');
  }
  console.log('      [PASS] SvdLowRankProjectionDedupBuffer: 100% verified 16-dim SVD subspace deduplication.\n');

  // 4. Test BroccoliTemporalSlidingEventQuantizerBuffer
  console.log('[4/5] Testing BroccoliTemporalSlidingEventQuantizerBuffer (Microsecond Timestamp Quantization)...');
  const hftTimestamps = [
    1724832000.123450,
    1724832000.123455,
    1724832000.123460,
    1724832000.123465,
    1724832000.123470,
  ];

  const timeResult = BroccoliTemporalSlidingEventQuantizerBuffer.quantizeTimestamps(hftTimestamps);
  const dequantized = BroccoliTemporalSlidingEventQuantizerBuffer.dequantizeTimestamps(timeResult.compactedQuantizedFrame);

  console.log(`      Original Array Tokens    : ${timeResult.originalTokens}`);
  console.log(`      Quantized Frame Tokens   : ${timeResult.compactedTokens}`);
  console.log(`      Tokens Saved             : ${timeResult.tokensSaved} (${timeResult.savingsPercentage}% spend cut)`);
  console.log(`      Dequantized Match        : ${JSON.stringify(dequantized) === JSON.stringify(hftTimestamps)}`);

  if (!timeResult.wasQuantized || JSON.stringify(dequantized) !== JSON.stringify(hftTimestamps)) {
    throw new Error('Temporal microsecond timestamp quantization failed');
  }
  console.log('      [PASS] TemporalSlidingEventQuantizerBuffer: 100% verified microsecond delta quantization.\n');

  // 5. Test BroccoliContextualPruningTokenWeightBuffer
  console.log('[5/5] Testing BroccoliContextualPruningTokenWeightBuffer (Salience Pruning)...');
  const verboseFillerPrompt = 'Please note that in order to execute settlement, as previously mentioned, ' +
    'the treasury balance must exceed $10,000,000 USD on Federal Reserve account #84920.';

  const pruneResult = BroccoliContextualPruningTokenWeightBuffer.pruneFiller(verboseFillerPrompt);
  console.log(`      Original Tokens        : ${pruneResult.originalTokens}`);
  console.log(`      Compacted Tokens       : ${pruneResult.compactedTokens}`);
  console.log(`      Filler Phrases Removed : ${pruneResult.fillerPhrasesRemovedCount}`);
  console.log(`      Tokens Saved           : ${pruneResult.tokensSaved} (${pruneResult.savingsPercentage}% spend cut)`);
  console.log(`      Pruned Text            : "${pruneResult.prunedText}"`);

  if (!pruneResult.wasPruned || pruneResult.fillerPhrasesRemovedCount !== 3 || !pruneResult.prunedText.includes('$10,000,000 USD')) {
    throw new Error('Contextual salience token pruning failed');
  }
  console.log('      [PASS] ContextualPruningTokenWeightBuffer: 100% verified salience token pruning.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 9 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase9DedupSuite().catch(err => {
  console.error('Phase 9 dedup suite error:', err);
  process.exit(1);
});
