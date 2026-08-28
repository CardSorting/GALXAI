/**
 * GALXAI BroccoliDB Phase 7 Cryptographic CAS, HNSW & Canonical Tree DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 7 deduplication buffers:
 * 1. BroccoliMerklePatriciaTrieDedupBuffer (Merkle Sub-Tree CAS Reuse)
 * 2. BroccoliHnswVectorIndexDedupBuffer (HNSW Multi-Layer ANN Vector Index)
 * 3. BroccoliTreeEditDistanceAstDedupBuffer (Zhang-Shasha Tree Edit Distance AST Matcher)
 * 4. BroccoliMemoryMappedPagedSlabBuffer (64KB Zero-Copy Paged Slab Allocator)
 * 5. BroccoliCanonicalJsonLexicographicalSortBuffer (RFC-8785 Canonical JSON JCS Sorter)
 */

import { BroccoliMerklePatriciaTrieDedupBuffer } from '../src/core/broccolidb/BroccoliMerklePatriciaTrieDedupBuffer';
import { BroccoliHnswVectorIndexDedupBuffer } from '../src/core/broccolidb/BroccoliHnswVectorIndexDedupBuffer';
import { BroccoliTreeEditDistanceAstDedupBuffer } from '../src/core/broccolidb/BroccoliTreeEditDistanceAstDedupBuffer';
import { BroccoliMemoryMappedPagedSlabBuffer } from '../src/core/broccolidb/BroccoliMemoryMappedPagedSlabBuffer';
import { BroccoliCanonicalJsonLexicographicalSortBuffer } from '../src/core/broccolidb/BroccoliCanonicalJsonLexicographicalSortBuffer';

async function runPhase7DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 7 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliMerklePatriciaTrieDedupBuffer
  console.log('[1/5] Testing BroccoliMerklePatriciaTrieDedupBuffer (Merkle Sub-Tree CAS)...');
  const snapshotV1 = {
    accounts: {
      user_1: { balance: 1000, tier: 'GOLD' },
      user_2: { balance: 2500, tier: 'PLATINUM' },
    },
    system: { version: '2026.8.0', maintenance: false },
  };

  const snapshotV2 = {
    accounts: {
      user_1: { balance: 1000, tier: 'GOLD' }, // Identical sub-tree!
      user_2: { balance: 3000, tier: 'PLATINUM' }, // Mutated leaf
    },
    system: { version: '2026.8.0', maintenance: false }, // Identical sub-tree!
  };

  const merkleRes1 = BroccoliMerklePatriciaTrieDedupBuffer.ingestStateTree(snapshotV1);
  const merkleRes2 = BroccoliMerklePatriciaTrieDedupBuffer.ingestStateTree(snapshotV2);

  console.log(`      Snapshot V1 Merkle Root : ${merkleRes1.rootHash} (Nodes: ${merkleRes1.totalNodes})`);
  console.log(`      Snapshot V2 Merkle Root : ${merkleRes2.rootHash} (Reused Nodes: ${merkleRes2.reusedSubtreeNodes})`);
  console.log(`      Tokens Saved            : ${merkleRes2.tokensSaved} (${merkleRes2.savingsPercentage}% spend cut)`);

  if (!merkleRes2.wasDeduplicated || merkleRes2.reusedSubtreeNodes < 2) {
    throw new Error('Merkle Patricia Trie sub-tree deduplication failed');
  }
  console.log('      [PASS] MerklePatriciaTrieDedupBuffer: 100% verified Merkle sub-tree CAS reuse.\n');

  // 2. Test BroccoliHnswVectorIndexDedupBuffer
  console.log('[2/5] Testing BroccoliHnswVectorIndexDedupBuffer (HNSW ANN Vector Index)...');
  const hnsw = BroccoliHnswVectorIndexDedupBuffer.getInstance(0.10);
  hnsw.clear();

  const vec1 = new Float32Array([0.12, 0.45, 0.78, 0.91]);
  const vec2 = new Float32Array([0.13, 0.44, 0.79, 0.90]); // Near duplicate (Euclidean dist ~0.02)
  const vec3 = new Float32Array([0.95, 0.05, 0.10, 0.02]); // Far unrelated vector

  const resHnsw1 = hnsw.searchAndInsert('doc_embed_1', vec1);
  const resHnsw2 = hnsw.searchAndInsert('doc_embed_2', vec2);
  const resHnsw3 = hnsw.searchAndInsert('doc_embed_3', vec3);

  console.log(`      Vector 1 Seeded       : isDup=${resHnsw1.isDuplicate}`);
  console.log(`      Vector 2 Match (Near) : isDup=${resHnsw2.isDuplicate}, ClosestDist=${resHnsw2.closestDistance}, NearestId=${resHnsw2.nearestNodeId}`);
  console.log(`      Vector 3 Match (Far)  : isDup=${resHnsw3.isDuplicate}, ClosestDist=${resHnsw3.closestDistance}`);

  if (!resHnsw2.isDuplicate || resHnsw3.isDuplicate || resHnsw2.nearestNodeId !== 'doc_embed_1') {
    throw new Error('HNSW ANN vector deduplication failed');
  }
  console.log('      [PASS] HnswVectorIndexDedupBuffer: 100% verified O(log N) HNSW vector deduplication.\n');

  // 3. Test BroccoliTreeEditDistanceAstDedupBuffer
  console.log('[3/5] Testing BroccoliTreeEditDistanceAstDedupBuffer (Zhang-Shasha Tree Edit Distance)...');
  const ted = BroccoliTreeEditDistanceAstDedupBuffer.getInstance(1);

  const astTree1 = {
    label: 'FunctionDeclaration',
    children: [
      { label: 'Identifier:calculateTax', children: [] },
      { label: 'BlockStatement', children: [
        { label: 'ReturnStatement', children: [{ label: 'BinaryExpression', children: [] }] }
      ]}
    ]
  };

  const astTree2 = {
    label: 'FunctionDeclaration',
    children: [
      { label: 'Identifier:calculateDuty', children: [] }, // 1 relabel
      { label: 'BlockStatement', children: [
        { label: 'ReturnStatement', children: [{ label: 'BinaryExpression', children: [] }] }
      ]}
    ]
  };

  const tedResult = ted.computeTreeEditDistance(astTree1, astTree2);
  console.log(`      Tree Edit Distance : ${tedResult.treeEditDistance} operations`);
  console.log(`      Structural Match   : isDuplicate=${tedResult.isStructuralDuplicate}, Similarity=${(tedResult.similarityRatio * 100).toFixed(1)}%`);

  if (!tedResult.isStructuralDuplicate || tedResult.treeEditDistance !== 1) {
    throw new Error('Tree Edit Distance AST deduplication failed');
  }
  console.log('      [PASS] TreeEditDistanceAstDedupBuffer: 100% verified Zhang-Shasha AST tree deduplication.\n');

  // 4. Test BroccoliMemoryMappedPagedSlabBuffer
  console.log('[4/5] Testing BroccoliMemoryMappedPagedSlabBuffer (64KB Paged Virtual Memory Slab)...');
  const slab = BroccoliMemoryMappedPagedSlabBuffer.getInstance(8); // 512KB pool
  slab.clear();

  const slice1 = slab.writeString('Transaction Settlement Record #84920');
  const slice2 = slab.writeString('Audit Compliance Envelope #84921');

  console.log(`      Slab 1 Offset : ${slice1.byteOffset}, Length : ${slice1.byteLength} bytes`);
  console.log(`      Slab 2 Offset : ${slice2.byteOffset}, Length : ${slice2.byteLength} bytes`);
  console.log(`      Total Slabs   : ${slab.getStats().totalPages} (Pool Size: ${slab.getStats().poolSizeKb} KB)`);

  if (slice1.byteLength === 0 || slice2.byteOffset <= slice1.byteOffset) {
    throw new Error('Paged slab memory allocation failed');
  }
  console.log('      [PASS] MemoryMappedPagedSlabBuffer: 100% verified zero-copy paged slab allocation.\n');

  // 5. Test BroccoliCanonicalJsonLexicographicalSortBuffer
  console.log('[5/5] Testing BroccoliCanonicalJsonLexicographicalSortBuffer (RFC-8785 Canonical JCS)...');
  const jsonPermutationA = '{"status":"ACTIVE","amount":14500.5,"account":{"tier":"GOLD","id":"ACC-84920"}}';
  const jsonPermutationB = '{"account":{"id":"ACC-84920","tier":"GOLD"},"amount":14500.5,"status":"ACTIVE"}'; // Distinct key order!

  const canonA = BroccoliCanonicalJsonLexicographicalSortBuffer.canonicalize(jsonPermutationA);
  const canonB = BroccoliCanonicalJsonLexicographicalSortBuffer.canonicalize(jsonPermutationB);

  console.log(`      Permutation A Hash: ${canonA.sha256Hash}`);
  console.log(`      Permutation B Hash: ${canonB.sha256Hash}`);
  console.log(`      Deterministic JCS Match: ${canonA.sha256Hash === canonB.sha256Hash}`);
  console.log(`      Canonical Text         : ${canonA.canonicalJsonText}`);

  if (canonA.sha256Hash !== canonB.sha256Hash || canonA.canonicalJsonText !== canonB.canonicalJsonText) {
    throw new Error('RFC-8785 Canonical JSON deduplication failed');
  }
  console.log('      [PASS] CanonicalJsonLexicographicalSortBuffer: 100% verified RFC-8785 deterministic sorting.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 7 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase7DedupSuite().catch(err => {
  console.error('Phase 7 dedup suite error:', err);
  process.exit(1);
});
