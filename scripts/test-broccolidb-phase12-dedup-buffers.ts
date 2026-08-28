/**
 * GALXAI BroccoliDB Phase 12 Poly-Hash Sketches, 1-WL Graphs, DCT & Swarm Echo Verification Suite
 * 
 * Tests the 5 Phase 12 deduplication buffers:
 * 1. BroccoliSparsePolyHashSketchBuffer (4-Way Polynomial Rolling N-Gram Min-Hash)
 * 2. BroccoliGraphHomomorphismWeisfeilerLehmanBuffer (1-WL Graph Isomorphism Topology Compressor)
 * 3. BroccoliDiscreteCosineTransformDctBuffer (Type-II DCT Spectral Telemetry Compactor)
 * 4. BroccoliQuantizedScalarColumnEncoderBuffer (MinMax Base Scaling Column Quantizer)
 * 5. BroccoliMultiAgentEchoChamberPrunerBuffer (Multi-Agent Swarm Echo Chamber Pruner)
 */

import { BroccoliSparsePolyHashSketchBuffer } from '../src/core/broccolidb/BroccoliSparsePolyHashSketchBuffer';
import { BroccoliGraphHomomorphismWeisfeilerLehmanBuffer } from '../src/core/broccolidb/BroccoliGraphHomomorphismWeisfeilerLehmanBuffer';
import { BroccoliDiscreteCosineTransformDctBuffer } from '../src/core/broccolidb/BroccoliDiscreteCosineTransformDctBuffer';
import { BroccoliQuantizedScalarColumnEncoderBuffer } from '../src/core/broccolidb/BroccoliQuantizedScalarColumnEncoderBuffer';
import { BroccoliMultiAgentEchoChamberPrunerBuffer } from '../src/core/broccolidb/BroccoliMultiAgentEchoChamberPrunerBuffer';

async function runPhase12DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 12 DEDUPLICATION BUFFER VERIFICATION  ');
  console.log('================================================================\n');

  // 1. Test BroccoliSparsePolyHashSketchBuffer
  console.log('[1/5] Testing BroccoliSparsePolyHashSketchBuffer (Polynomial Rolling Min-Hash)...');
  const sketchBuffer = BroccoliSparsePolyHashSketchBuffer.getInstance(0.75);
  sketchBuffer.clear();

  const docAlpha = 'The Federal Reserve Bank of New York settles interbank wire transfers via Fedwire Funds Service.';
  const docBeta  = 'The Federal Reserve Bank of New York settles interbank wire transfers via Fedwire Funds System.'; // Tiny 1-word mutation
  const docGamma = 'Quantum supercomputing architectures simulate protein folding molecular dynamics.'; // Completely unrelated

  const res1 = sketchBuffer.testAndInsert('doc_alpha', docAlpha);
  const res2 = sketchBuffer.testAndInsert('doc_beta', docBeta);
  const res3 = sketchBuffer.testAndInsert('doc_gamma', docGamma);

  console.log(`      Doc Alpha Seeded       : isDup=${res1.isDuplicate}`);
  console.log(`      Doc Beta Match (Near)  : isDup=${res2.isDuplicate}, MinHashScore=${res2.minHashScore}, MatchedDoc=${res2.matchedDocId}`);
  console.log(`      Doc Gamma Match (Far)  : isDup=${res3.isDuplicate}, MinHashScore=${res3.minHashScore}`);

  if (!res2.isDuplicate || res3.isDuplicate || res2.matchedDocId !== 'doc_alpha') {
    throw new Error('Polynomial rolling min-hash sketch deduplication failed');
  }
  console.log('      [PASS] SparsePolyHashSketchBuffer: 100% verified 4-way polynomial sketch matching.\n');

  // 2. Test BroccoliGraphHomomorphismWeisfeilerLehmanBuffer
  console.log('[2/5] Testing BroccoliGraphHomomorphismWeisfeilerLehmanBuffer (1-WL Graph Isomorphism)...');
  const wlBuffer = BroccoliGraphHomomorphismWeisfeilerLehmanBuffer.getInstance();
  wlBuffer.clear();

  // Workflow DAG A: 1 -> 2 -> 3
  const graphA = {
    nodes: ['Ingest', 'Transform', 'Export'],
    edges: [['Ingest', 'Transform'], ['Transform', 'Export']] as Array<[string, string]>,
  };

  // Workflow DAG B: Identical line topology under different node IDs: X -> Y -> Z
  const graphB = {
    nodes: ['Fetch', 'Cleanse', 'Publish'],
    edges: [['Fetch', 'Cleanse'], ['Cleanse', 'Publish']] as Array<[string, string]>,
  };

  const wlRes1 = BroccoliGraphHomomorphismWeisfeilerLehmanBuffer.ingestGraph('dag_pipeline_a', graphA);
  const wlRes2 = BroccoliGraphHomomorphismWeisfeilerLehmanBuffer.ingestGraph('dag_pipeline_b', graphB);

  console.log(`      Graph A Canonical 1-WL Hash: ${wlRes1.canonicalGraphHash}`);
  console.log(`      Graph B Canonical 1-WL Hash: ${wlRes2.canonicalGraphHash}`);
  console.log(`      Topological Match          : isIsomorphic=${wlRes2.isIsomorphic}, Prototype=${wlRes2.matchedGraphId}`);
  console.log(`      Tokens Saved               : ${wlRes2.tokensSaved} (${wlRes2.savingsPercentage}% spend cut)`);

  if (!wlRes2.isIsomorphic || wlRes1.canonicalGraphHash !== wlRes2.canonicalGraphHash || wlRes2.matchedGraphId !== 'dag_pipeline_a') {
    throw new Error('1-WL graph isomorphism topology deduplication failed');
  }
  console.log('      [PASS] GraphHomomorphismWeisfeilerLehmanBuffer: 100% verified 1-WL topological deduplication.\n');

  // 3. Test BroccoliDiscreteCosineTransformDctBuffer
  console.log('[3/5] Testing BroccoliDiscreteCosineTransformDctBuffer (Type-II DCT Spectral)...');
  const volatilityCurve: number[] = [];
  for (let i = 0; i < 32; i++) {
    volatilityCurve.push(Number((20.0 + 5.0 * Math.cos((Math.PI * i) / 16)).toFixed(2)));
  }

  const dctResult = BroccoliDiscreteCosineTransformDctBuffer.transformDct(volatilityCurve, 4);
  console.log(`      Original Curve Tokens  : ${dctResult.originalTokens}`);
  console.log(`      Compacted DCT Tokens   : ${dctResult.compactedTokens}`);
  console.log(`      Coefficients Retained  : ${dctResult.retainedCoefficientsCount}`);
  console.log(`      Tokens Saved           : ${dctResult.tokensSaved} (${dctResult.savingsPercentage}% spend cut)`);

  if (!dctResult.wasCompacted || dctResult.retainedCoefficientsCount !== 4 || dctResult.tokensSaved === 0) {
    throw new Error('Type-II DCT spectral telemetry compression failed');
  }
  console.log('      [PASS] DiscreteCosineTransformDctBuffer: 100% verified DCT-II spectral compaction.\n');

  // 4. Test BroccoliQuantizedScalarColumnEncoderBuffer
  console.log('[4/5] Testing BroccoliQuantizedScalarColumnEncoderBuffer (MinMax Base Column Scaling)...');
  const priceQuotes = [
    14500.12, 14500.15, 14500.18, 14500.14, 14500.22,
    14500.25, 14500.19, 14500.28, 14500.30, 14500.32,
  ];

  const quantResult = BroccoliQuantizedScalarColumnEncoderBuffer.quantizeColumn(priceQuotes, 2);
  const dequantized = BroccoliQuantizedScalarColumnEncoderBuffer.dequantizeColumn(quantResult.compactedColumnFrame);

  console.log(`      Original Float Tokens  : ${quantResult.originalTokens}`);
  console.log(`      Compacted Column Tokens: ${quantResult.compactedTokens}`);
  console.log(`      Tokens Saved           : ${quantResult.tokensSaved} (${quantResult.savingsPercentage}% spend cut)`);
  console.log(`      Reversibility Match    : ${JSON.stringify(dequantized) === JSON.stringify(priceQuotes)}`);

  if (!quantResult.wasQuantized || JSON.stringify(dequantized) !== JSON.stringify(priceQuotes)) {
    throw new Error('Column scalar quantization failed');
  }
  console.log('      [PASS] QuantizedScalarColumnEncoderBuffer: 100% verified fixed-point column quantization.\n');

  // 5. Test BroccoliMultiAgentEchoChamberPrunerBuffer
  console.log('[5/5] Testing BroccoliMultiAgentEchoChamberPrunerBuffer (Swarm Consensus Pruning)...');
  const swarmMessages = [
    { agentId: 'Agent_1', role: 'SecurityAuditor', content: 'Vulnerability CVE-2026-8492 requires immediate patch deployment.' },
    { agentId: 'Agent_2', role: 'DevOpsLead', content: 'I agree with Agent_1 that we should deploy the security patch.' },
    { agentId: 'Agent_3', role: 'ComplianceOfficer', content: 'LGTM, concurring with previous finding.' },
    { agentId: 'Agent_4', role: 'ReleaseManager', content: 'Confirming the analysis of Agent_1, deployment queued for staging.' },
  ];

  const swarmResult = BroccoliMultiAgentEchoChamberPrunerBuffer.pruneSwarmDialogue(swarmMessages);
  console.log(`      Original Swarm Tokens  : ${swarmResult.originalTokens}`);
  console.log(`      Compacted Swarm Tokens : ${swarmResult.compactedTokens}`);
  console.log(`      Echo Messages Pruned   : ${swarmResult.echoMessagesPrunedCount}`);
  console.log(`      Tokens Saved           : ${swarmResult.tokensSaved} (${swarmResult.savingsPercentage}% spend cut)`);

  if (!swarmResult.wasPruned || swarmResult.echoMessagesPrunedCount !== 3) {
    throw new Error('Multi-agent swarm echo chamber pruning failed');
  }
  console.log('      [PASS] MultiAgentEchoChamberPrunerBuffer: 100% verified multi-agent echo chamber pruning.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 12 DEDUPLICATION BUFFERS VERIFIED 100%!           ');
  console.log('================================================================\n');
}

runPhase12DedupSuite().catch(err => {
  console.error('Phase 12 dedup suite error:', err);
  process.exit(1);
});
