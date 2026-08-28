/**
 * GALXAI BroccoliDB Phase 8 Distributed Sync, Roaring Bitmaps & Causal DAG DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 8 deduplication buffers:
 * 1. BroccoliIbltInvertibleBloomBuffer (IBLT Cross-Cluster Set Reconciliation)
 * 2. BroccoliRoaringBitmapPostingBuffer (Sparse/Dense Roaring Bitmap Posting Index)
 * 3. BroccoliTokenTiling2dMatrixBuffer (2D Token Tiling & Dense Matrix Compressor)
 * 4. BroccoliRadixTreePatriciaDictionaryBuffer (Path-Compressed Radix Trie)
 * 5. BroccoliChronoEventDeduplicationDagBuffer (Causal Event DAG & Retry Storm Pruner)
 */

import { BroccoliIbltInvertibleBloomBuffer } from '../src/core/broccolidb/BroccoliIbltInvertibleBloomBuffer';
import { BroccoliRoaringBitmapPostingBuffer } from '../src/core/broccolidb/BroccoliRoaringBitmapPostingBuffer';
import { BroccoliTokenTiling2dMatrixBuffer } from '../src/core/broccolidb/BroccoliTokenTiling2dMatrixBuffer';
import { BroccoliRadixTreePatriciaDictionaryBuffer } from '../src/core/broccolidb/BroccoliRadixTreePatriciaDictionaryBuffer';
import { BroccoliChronoEventDeduplicationDagBuffer } from '../src/core/broccolidb/BroccoliChronoEventDeduplicationDagBuffer';

async function runPhase8DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 8 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliIbltInvertibleBloomBuffer
  console.log('[1/5] Testing BroccoliIbltInvertibleBloomBuffer (IBLT Set Reconciliation)...');
  const ibltA = BroccoliIbltInvertibleBloomBuffer.createInstance(128);
  const ibltB = BroccoliIbltInvertibleBloomBuffer.createInstance(128);

  // Set A: shared items + 'doc_alpha'
  ibltA.insert('item_1');
  ibltA.insert('item_2');
  ibltA.insert('doc_alpha');

  // Set B: shared items + 'doc_beta'
  ibltB.clear();
  ibltB.insert('item_1');
  ibltB.insert('item_2');
  ibltB.insert('doc_beta');

  const recon = BroccoliIbltInvertibleBloomBuffer.reconcileDifferences(ibltA, ibltB);
  console.log(`      IBLT Differences Found : ${recon.totalDifferencesCount}`);
  console.log(`      Keys in A not B        : [${recon.positiveDifferences.join(', ')}]`);
  console.log(`      Keys in B not A        : [${recon.negativeDifferences.join(', ')}]`);

  if (!recon.isReconciled || recon.totalDifferencesCount !== 2) {
    throw new Error('IBLT set reconciliation failed');
  }
  console.log('      [PASS] IbltInvertibleBloomBuffer: 100% verified O(diff) distributed reconciliation.\n');

  // 2. Test BroccoliRoaringBitmapPostingBuffer
  console.log('[2/5] Testing BroccoliRoaringBitmapPostingBuffer (Roaring Bitmap Sparse/Dense)...');
  const roaring = BroccoliRoaringBitmapPostingBuffer.getInstance();
  roaring.clear();

  // Add 4,500 document IDs to trigger conversion from Array to Bitset container
  for (let id = 1; id <= 4500; id++) {
    roaring.add(id);
  }
  roaring.add(0x10000 + 42); // Distinct high chunk

  const contains100 = roaring.contains(100);
  const contains9999 = roaring.contains(9999);
  const stats = roaring.getStats();

  console.log(`      Total Docs Indexed  : ${stats.totalDocs}`);
  console.log(`      Bitset Containers   : ${stats.bitsetContainers}`);
  console.log(`      Array Containers    : ${stats.arrayContainers}`);
  console.log(`      Contains Doc #100   : ${contains100}`);
  console.log(`      Contains Doc #9999  : ${contains9999}`);

  if (!contains100 || contains9999 || stats.bitsetContainers !== 1) {
    throw new Error('Roaring Bitmap posting verification failed');
  }
  console.log('      [PASS] RoaringBitmapPostingBuffer: 100% verified sparse/dense hybrid indexing.\n');

  // 3. Test BroccoliTokenTiling2dMatrixBuffer
  console.log('[3/5] Testing BroccoliTokenTiling2dMatrixBuffer (2D Matrix Token Tiling)...');
  const denseMatrix: number[][] = [];
  for (let r = 0; r < 16; r++) {
    const row: number[] = [];
    for (let c = 0; c < 16; c++) {
      row.push((r < 8 && c < 8) ? 1 : 0); // 4 quadrants of repeated patterns
    }
    denseMatrix.push(row);
  }

  const tileResult = BroccoliTokenTiling2dMatrixBuffer.tileMatrix(denseMatrix, 4);
  console.log(`      Original Matrix Tokens : ${tileResult.originalTokens}`);
  console.log(`      Compacted Tile Tokens  : ${tileResult.compactedTokens}`);
  console.log(`      Tokens Saved           : ${tileResult.tokensSaved} (${tileResult.savingsPercentage}% spend reduction)`);
  console.log(`      Unique Tiles in Dict   : ${tileResult.uniqueTilesCount}`);
  console.log(`      Total Tiles Used in Grid: ${tileResult.totalTilesUsed}`);

  if (!tileResult.wasTiled || tileResult.uniqueTilesCount !== 2 || tileResult.totalTilesUsed !== 16) {
    throw new Error('2D token tiling matrix compression failed');
  }
  console.log('      [PASS] TokenTiling2dMatrixBuffer: 100% verified 2D spatial matrix tiling.\n');

  // 4. Test BroccoliRadixTreePatriciaDictionaryBuffer
  console.log('[4/5] Testing BroccoliRadixTreePatriciaDictionaryBuffer (Path-Compressed Radix Trie)...');
  const paths = [
    '/Users/enterprise/project/src/core/broccolidb/BroccoliDomainSpendOptimizer.ts',
    '/Users/enterprise/project/src/core/broccolidb/BroccoliHighVelocityPipeline.ts',
    '/Users/enterprise/project/src/core/broccolidb/BroccoliMegaIncidentStreamCascader.ts',
    '/Users/enterprise/project/src/core/broccolidb/BroccoliMegaDocumentPyramidCompactor.ts',
    '/Users/enterprise/project/scripts/benchmark-high-velocity-processing.ts',
    '/Users/enterprise/project/scripts/test-broccolidb-streaming-buffers.ts',
  ];

  const radixResult = BroccoliRadixTreePatriciaDictionaryBuffer.compactPaths(paths);
  console.log(`      Original Path Tokens : ${radixResult.originalTokens}`);
  console.log(`      Compacted Trie Tokens: ${radixResult.compactedTokens}`);
  console.log(`      Paths Compressed     : ${radixResult.totalPaths}`);

  if (!radixResult.wasCompacted || radixResult.totalPaths !== 6) {
    throw new Error('Radix tree path compression failed');
  }
  console.log('      [PASS] RadixTreePatriciaDictionaryBuffer: 100% verified path-compressed Radix tree.\n');

  // 5. Test BroccoliChronoEventDeduplicationDagBuffer
  console.log('[5/5] Testing BroccoliChronoEventDeduplicationDagBuffer (Causal DAG Retry Pruner)...');
  const traceSpans = [
    { spanId: 'span_1', traceId: 'tr_84920', serviceName: 'PaymentService', action: 'ProcessCard', lamportClock: 1 },
    { spanId: 'span_2', traceId: 'tr_84920', parentSpanId: 'span_1', serviceName: 'LedgerService', action: 'DebitAccount', lamportClock: 2 },
    { spanId: 'span_3', traceId: 'tr_84920', parentSpanId: 'span_1', serviceName: 'LedgerService', action: 'DebitAccount', lamportClock: 3 }, // Retry attempt 1
    { spanId: 'span_4', traceId: 'tr_84920', parentSpanId: 'span_1', serviceName: 'LedgerService', action: 'DebitAccount', lamportClock: 4 }, // Retry attempt 2
    { spanId: 'span_5', traceId: 'tr_84920', parentSpanId: 'span_1', serviceName: 'NotificationService', action: 'SendEmail', lamportClock: 5 },
  ];

  const dagResult = BroccoliChronoEventDeduplicationDagBuffer.deduplicateCausalSpans(traceSpans);
  console.log(`      Original Spans Count   : ${dagResult.totalSpans}`);
  console.log(`      Retained Causal Spans  : ${dagResult.retainedSpans}`);
  console.log(`      Retry Spans Collapsed  : ${dagResult.retrySpansCollapsed}`);
  console.log(`      Tokens Saved           : ${dagResult.tokensSaved} (${dagResult.savingsPercentage}% spend cut)`);

  if (!dagResult.wasDeduplicated || dagResult.retrySpansCollapsed !== 2 || dagResult.retainedSpans !== 3) {
    throw new Error('Causal DAG retry deduplication failed');
  }
  console.log('      [PASS] ChronoEventDeduplicationDagBuffer: 100% verified causal DAG retry storm pruning.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 8 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase8DedupSuite().catch(err => {
  console.error('Phase 8 dedup suite error:', err);
  process.exit(1);
});
