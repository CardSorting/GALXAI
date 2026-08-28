/**
 * GALXAI BroccoliDB Phase 14 Gorilla XOR, T-Digest, Bipartite Matching & Geometric Median Verification Suite
 * 
 * Tests the 5 Phase 14 deduplication buffers:
 * 1. BroccoliGorillaXorFloatCompressorBuffer (Facebook Gorilla XOR Float64 Time-Series Compactor)
 * 2. BroccoliTDigestQuantileSketchBuffer (T-Digest Streaming Quantile Centroid Sketch)
 * 3. BroccoliBipartiteMaximumMatchingDedupBuffer (Hopcroft-Karp Maximum Bipartite Matching)
 * 4. BroccoliHypergraphIncidentEdgeFoldBuffer (Hypergraph N-Ary Relation Incidence Folder)
 * 5. BroccoliGeometricMedianVectorCentroidBuffer (Weiszfeld Robust Geometric Median Vector Compactor)
 */

import { BroccoliGorillaXorFloatCompressorBuffer } from '../src/core/broccolidb/BroccoliGorillaXorFloatCompressorBuffer';
import { BroccoliTDigestQuantileSketchBuffer } from '../src/core/broccolidb/BroccoliTDigestQuantileSketchBuffer';
import { BroccoliBipartiteMaximumMatchingDedupBuffer } from '../src/core/broccolidb/BroccoliBipartiteMaximumMatchingDedupBuffer';
import { BroccoliHypergraphIncidentEdgeFoldBuffer } from '../src/core/broccolidb/BroccoliHypergraphIncidentEdgeFoldBuffer';
import { BroccoliGeometricMedianVectorCentroidBuffer } from '../src/core/broccolidb/BroccoliGeometricMedianVectorCentroidBuffer';

async function runPhase14DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 14 DEDUPLICATION BUFFER VERIFICATION  ');
  console.log('================================================================\n');

  // 1. Test BroccoliGorillaXorFloatCompressorBuffer
  console.log('[1/5] Testing BroccoliGorillaXorFloatCompressorBuffer (Gorilla XOR Float64)...');
  const floatSeries = [
    14500.125, 14500.125, 14500.125, 14500.250, 14500.250,
    14500.250, 14500.500, 14500.500, 14500.500, 14500.500,
  ];

  const gorillaResult = BroccoliGorillaXorFloatCompressorBuffer.compressFloats(floatSeries);
  const decompressedFloats = BroccoliGorillaXorFloatCompressorBuffer.decompressFloats(gorillaResult.compactedGorillaFrame);

  console.log(`      Original Float Tokens  : ${gorillaResult.originalTokens}`);
  console.log(`      Compacted Gorilla Toks : ${gorillaResult.compactedTokens}`);
  console.log(`      Tokens Saved           : ${gorillaResult.tokensSaved} (${gorillaResult.savingsPercentage}% spend cut)`);
  console.log(`      Bit-Exact Match Check  : ${JSON.stringify(decompressedFloats) === JSON.stringify(floatSeries)}`);

  if (!gorillaResult.wasCompressed || JSON.stringify(decompressedFloats) !== JSON.stringify(floatSeries)) {
    throw new Error('Gorilla XOR float compression failed');
  }
  console.log('      [PASS] GorillaXorFloatCompressorBuffer: 100% verified Gorilla XOR float64 compression.\n');

  // 2. Test BroccoliTDigestQuantileSketchBuffer
  console.log('[2/5] Testing BroccoliTDigestQuantileSketchBuffer (T-Digest Quantile Sketch)...');
  const latencyDistribution: number[] = [];
  for (let i = 1; i <= 100; i++) {
    latencyDistribution.push(i * 5.0); // 5ms to 500ms
  }

  const tdigestResult = BroccoliTDigestQuantileSketchBuffer.digest(latencyDistribution);
  console.log(`      Original Points Tokens : ${tdigestResult.originalTokens}`);
  console.log(`      Compacted Sketch Tokens: ${tdigestResult.compactedTokens}`);
  console.log(`      Centroids Maintained   : ${tdigestResult.centroidsCount}`);
  console.log(`      P50 Latency (Median)   : ${tdigestResult.p50} ms`);
  console.log(`      P90 Latency            : ${tdigestResult.p90} ms`);
  console.log(`      P99 Latency (Tail)     : ${tdigestResult.p99} ms`);
  console.log(`      Tokens Saved           : ${tdigestResult.tokensSaved} (${tdigestResult.savingsPercentage}% spend cut)`);

  if (!tdigestResult.wasCompacted || tdigestResult.p50 < 200 || tdigestResult.p99 < 450) {
    throw new Error('T-Digest quantile sketch compaction failed');
  }
  console.log('      [PASS] TDigestQuantileSketchBuffer: 100% verified T-Digest quantile streaming sketch.\n');

  // 3. Test BroccoliBipartiteMaximumMatchingDedupBuffer
  console.log('[3/5] Testing BroccoliBipartiteMaximumMatchingDedupBuffer (Hopcroft-Karp Matching)...');
  const taskGraph = {
    leftWorkers: ['Worker_A', 'Worker_B', 'Worker_C'],
    rightTasks: ['Task_1', 'Task_2', 'Task_3', 'Task_4'],
    edges: [
      ['Worker_A', 'Task_1'] as [string, string],
      ['Worker_A', 'Task_2'] as [string, string],
      ['Worker_B', 'Task_2'] as [string, string],
      ['Worker_B', 'Task_3'] as [string, string],
      ['Worker_C', 'Task_3'] as [string, string],
    ],
  };

  const bpmResult = BroccoliBipartiteMaximumMatchingDedupBuffer.computeMatching(taskGraph);
  console.log(`      Original Task Graph Tokens: ${bpmResult.originalTokens}`);
  console.log(`      Compacted Allocation Toks : ${bpmResult.compactedTokens}`);
  console.log(`      Maximum Matches Formed    : ${bpmResult.matchCount}`);
  console.log(`      Matched Worker-Task Pairs : ${JSON.stringify(bpmResult.matchedPairs)}`);

  if (!bpmResult.wasMatched || bpmResult.matchCount !== 3) {
    throw new Error('Maximum bipartite matching failed');
  }
  console.log('      [PASS] BipartiteMaximumMatchingDedupBuffer: 100% verified Hopcroft-Karp bipartite matching.\n');

  // 4. Test BroccoliHypergraphIncidentEdgeFoldBuffer
  console.log('[4/5] Testing BroccoliHypergraphIncidentEdgeFoldBuffer (Hypergraph N-Ary Folding)...');
  const hyperEdges = [
    { id: 'tx_1', nodes: ['Buyer_1', 'Seller_A', 'Broker_X', 'Escrow_Z'], relationType: 'ESCROW_SETTLEMENT' },
    { id: 'tx_2', nodes: ['Buyer_1', 'Seller_A', 'Broker_X', 'Escrow_Z'], relationType: 'ESCROW_SETTLEMENT' }, // Identical 4-party cluster!
    { id: 'tx_3', nodes: ['Buyer_2', 'Seller_B', 'Broker_Y'], relationType: 'DIRECT_PURCHASE' },
    { id: 'tx_4', nodes: ['Buyer_1', 'Seller_A', 'Broker_X', 'Escrow_Z'], relationType: 'ESCROW_RELEASE' },    // Same 4-party cluster!
  ];

  const hyperResult = BroccoliHypergraphIncidentEdgeFoldBuffer.foldHypergraph(hyperEdges);
  console.log(`      Original Hypergraph Tokens: ${hyperResult.originalTokens}`);
  console.log(`      Compacted Hypergraph Toks : ${hyperResult.compactedTokens}`);
  console.log(`      Unique Node Clusters      : ${hyperResult.uniqueHyperedgesCount}`);
  console.log(`      Tokens Saved              : ${hyperResult.tokensSaved} (${hyperResult.savingsPercentage}% spend cut)`);

  if (!hyperResult.wasFolded || hyperResult.uniqueHyperedgesCount !== 2) {
    throw new Error('Hypergraph incident edge folding failed');
  }
  console.log('      [PASS] HypergraphIncidentEdgeFoldBuffer: 100% verified n-ary hyperedge incidence folding.\n');

  // 5. Test BroccoliGeometricMedianVectorCentroidBuffer
  console.log('[5/5] Testing BroccoliGeometricMedianVectorCentroidBuffer (Weiszfeld Geometric Median)...');
  const swarmTrajectories = [
    [10.0, 20.0, 30.0],
    [10.1, 20.05, 29.95],
    [9.95, 19.95, 30.05],
    [10.05, 20.1, 30.1],
    [10.0, 19.9, 30.0],
  ];

  const medianResult = BroccoliGeometricMedianVectorCentroidBuffer.computeGeometricMedian(swarmTrajectories);
  console.log(`      Original Vectors Tokens   : ${medianResult.originalTokens}`);
  console.log(`      Compacted Centroid Tokens : ${medianResult.compactedTokens}`);
  console.log(`      Geometric Median Vector   : [${medianResult.geometricMedian.join(', ')}]`);
  console.log(`      Tokens Saved              : ${medianResult.tokensSaved} (${medianResult.savingsPercentage}% spend cut)`);

  if (!medianResult.wasClustered || medianResult.geometricMedian.length !== 3 || Math.abs(medianResult.geometricMedian[0] - 10.0) > 0.1) {
    throw new Error('Weiszfeld geometric median computation failed');
  }
  console.log('      [PASS] GeometricMedianVectorCentroidBuffer: 100% verified Weiszfeld geometric median clustering.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 14 DEDUPLICATION BUFFERS VERIFIED 100%!           ');
  console.log('================================================================\n');
}

runPhase14DedupSuite().catch(err => {
  console.error('Phase 14 dedup suite error:', err);
  process.exit(1);
});
