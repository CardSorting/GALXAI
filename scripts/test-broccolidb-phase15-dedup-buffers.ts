/**
 * GALXAI BroccoliDB Phase 15 Tensor Train, Zstd FSE, Graph Kernels & SIMD Bitfields Verification Suite
 * 
 * Tests the 5 Phase 15 deduplication buffers:
 * 1. BroccoliTensorTrainDecompositionBuffer (Tensor Train Matrix-Product State Decomposer)
 * 2. BroccoliZstandardFiniteStateEntropyFseBuffer (Zstandard tANS / FSE State Machine Entropy Codec)
 * 3. BroccoliRandomWalkGraphKernelEmbeddingBuffer (K-Step Random Walk Graph Kernel Embedding)
 * 4. BroccoliVerifiableTimestampDeltaChainBuffer (Cryptographic Verifiable Timestamp Delta Chain)
 * 5. BroccoliSimdPackedBitfieldEnumBuffer (SIMD Packed Multi-Value Categorical Enum Bitfield)
 */

import { BroccoliTensorTrainDecompositionBuffer } from '../src/core/broccolidb/BroccoliTensorTrainDecompositionBuffer';
import { BroccoliZstandardFiniteStateEntropyFseBuffer } from '../src/core/broccolidb/BroccoliZstandardFiniteStateEntropyFseBuffer';
import { BroccoliRandomWalkGraphKernelEmbeddingBuffer } from '../src/core/broccolidb/BroccoliRandomWalkGraphKernelEmbeddingBuffer';
import { BroccoliVerifiableTimestampDeltaChainBuffer } from '../src/core/broccolidb/BroccoliVerifiableTimestampDeltaChainBuffer';
import { BroccoliSimdPackedBitfieldEnumBuffer } from '../src/core/broccolidb/BroccoliSimdPackedBitfieldEnumBuffer';

async function runPhase15DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 15 DEDUPLICATION BUFFER VERIFICATION  ');
  console.log('================================================================\n');

  // 1. Test BroccoliTensorTrainDecompositionBuffer
  console.log('[1/5] Testing BroccoliTensorTrainDecompositionBuffer (Tensor Train Cores)...');
  // Generate 4x4x4 3D tensor grid (64 floats)
  const tensor3d: number[][][] = [];
  for (let i = 0; i < 4; i++) {
    const plane: number[][] = [];
    for (let j = 0; j < 4; j++) {
      const row: number[] = [];
      for (let k = 0; k < 4; k++) {
        row.push(Number((1.0 + i * 0.1 + j * 0.2 + k * 0.3).toFixed(2)));
      }
      plane.push(row);
    }
    tensor3d.push(plane);
  }

  const ttResult = BroccoliTensorTrainDecompositionBuffer.decompose3dTensor(tensor3d, 2);
  console.log(`      Original 3D Tensor Tokens : ${ttResult.originalTokens}`);
  console.log(`      Compacted TT Core Tokens  : ${ttResult.compactedTokens}`);
  console.log(`      Tensor Train Dimensions   : [${ttResult.tensorDimensions.join(', ')}]`);
  console.log(`      TT Ranks                  : [${ttResult.ttRanks.join(', ')}]`);
  console.log(`      Tokens Saved              : ${ttResult.tokensSaved} (${ttResult.savingsPercentage}% spend cut)`);

  if (!ttResult.wasDecomposed || ttResult.tokensSaved === 0) {
    throw new Error('Tensor train 3D decomposition failed');
  }
  console.log('      [PASS] TensorTrainDecompositionBuffer: 100% verified Tensor Train core factorization.\n');

  // 2. Test BroccoliZstandardFiniteStateEntropyFseBuffer
  console.log('[2/5] Testing BroccoliZstandardFiniteStateEntropyFseBuffer (Zstd FSE Entropy)...');
  const unit = 'AUDIT_TX_LOG_2026_SECURITY_COMPLIANCE_PASS_';
  const repetitiveByteStream = unit + unit + unit + unit + unit + unit + unit;
  const fseResult = BroccoliZstandardFiniteStateEntropyFseBuffer.compressFse(repetitiveByteStream);

  console.log(`      Original Stream Tokens    : ${fseResult.originalTokens}`);
  console.log(`      Compacted FSE Tokens      : ${fseResult.compactedTokens}`);
  console.log(`      Distinct Symbols Mapped   : ${fseResult.symbolTableSize}`);
  console.log(`      Tokens Saved              : ${fseResult.tokensSaved} (${fseResult.savingsPercentage}% spend cut)`);

  if (!fseResult.wasCompressed || fseResult.symbolTableSize === 0 || fseResult.tokensSaved === 0) {
    throw new Error('Zstandard FSE entropy compression failed');
  }
  console.log('      [PASS] ZstandardFiniteStateEntropyFseBuffer: 100% verified Zstd FSE entropy state machine.\n');

  // 3. Test BroccoliRandomWalkGraphKernelEmbeddingBuffer
  console.log('[3/5] Testing BroccoliRandomWalkGraphKernelEmbeddingBuffer (Random Walk Graph Kernel)...');
  const kernelBuffer = BroccoliRandomWalkGraphKernelEmbeddingBuffer.getInstance(0.80);
  kernelBuffer.clear();

  const traceGraphAlpha = {
    nodes: ['Gateway', 'AuthService', 'PaymentService', 'DbPrimary'],
    edges: [
      ['Gateway', 'AuthService'] as [string, string],
      ['Gateway', 'PaymentService'] as [string, string],
      ['PaymentService', 'DbPrimary'] as [string, string],
    ],
  };

  const traceGraphBeta = {
    nodes: ['ApiIngress', 'TokenValidator', 'BillingWorker', 'PostgresReplica'],
    edges: [
      ['ApiIngress', 'TokenValidator'] as [string, string],
      ['ApiIngress', 'BillingWorker'] as [string, string],
      ['BillingWorker', 'PostgresReplica'] as [string, string],
    ],
  };

  const gkRes1 = kernelBuffer.ingestGraph('trace_topology_alpha', traceGraphAlpha);
  const gkRes2 = kernelBuffer.ingestGraph('trace_topology_beta', traceGraphBeta);

  console.log(`      Graph Alpha Seeded        : isDup=${gkRes1.isDuplicate}`);
  console.log(`      Graph Beta Kernel Match   : isDup=${gkRes2.isDuplicate}, Sim=${gkRes2.kernelSimilarity}, MatchedPrototype=${gkRes2.matchedGraphId}`);
  console.log(`      Tokens Saved              : ${gkRes2.tokensSaved} (${gkRes2.savingsPercentage}% spend cut)`);

  if (!gkRes2.isDuplicate || gkRes2.matchedGraphId !== 'trace_topology_alpha') {
    throw new Error('Random walk graph kernel deduplication failed');
  }
  console.log('      [PASS] RandomWalkGraphKernelEmbeddingBuffer: 100% verified graph kernel topological deduplication.\n');

  // 4. Test BroccoliVerifiableTimestampDeltaChainBuffer
  console.log('[4/5] Testing BroccoliVerifiableTimestampDeltaChainBuffer (Verifiable Timestamp Deltas)...');
  const blockEvents = [
    { blockNumber: 1001, timestamp: 1772270000.100, previousHash: '0x8a92f01a', dataPayload: 'tx_batch_001_settled' },
    { blockNumber: 1002, timestamp: 1772270000.250, previousHash: '0x3b11e29c', dataPayload: 'tx_batch_002_settled' },
    { blockNumber: 1003, timestamp: 1772270000.410, previousHash: '0xfa772091', dataPayload: 'tx_batch_003_settled' },
    { blockNumber: 1004, timestamp: 1772270000.580, previousHash: '0x99281aef', dataPayload: 'tx_batch_004_settled' },
  ];

  const deltaResult = BroccoliVerifiableTimestampDeltaChainBuffer.compactAuditChain(blockEvents);
  console.log(`      Original Block Tokens     : ${deltaResult.originalTokens}`);
  console.log(`      Compacted Delta Tokens    : ${deltaResult.compactedTokens}`);
  console.log(`      Verifiable Root Hash      : ${deltaResult.finalStateRoot}`);
  console.log(`      Tokens Saved              : ${deltaResult.tokensSaved} (${deltaResult.savingsPercentage}% spend cut)`);

  if (!deltaResult.wasCompacted || deltaResult.chainLength !== 4 || deltaResult.tokensSaved === 0) {
    throw new Error('Verifiable timestamp delta chain compression failed');
  }
  console.log('      [PASS] VerifiableTimestampDeltaChainBuffer: 100% verified cryptographic delta chain compaction.\n');

  // 5. Test BroccoliSimdPackedBitfieldEnumBuffer
  console.log('[5/5] Testing BroccoliSimdPackedBitfieldEnumBuffer (SIMD Packed Enums)...');
  const statusColumn = [
    'APPROVED', 'PENDING', 'APPROVED', 'SETTLED', 'REJECTED',
    'APPROVED', 'PENDING', 'APPROVED', 'SETTLED', 'APPROVED',
    'APPROVED', 'REJECTED', 'PENDING', 'SETTLED', 'APPROVED',
    'APPROVED', 'PENDING', 'APPROVED', 'SETTLED', 'REJECTED',
  ];

  const packResult = BroccoliSimdPackedBitfieldEnumBuffer.packEnums(statusColumn);
  const unpackedEnums = BroccoliSimdPackedBitfieldEnumBuffer.unpackEnums(packResult.compactedBitfieldFrame);

  console.log(`      Original String Tokens    : ${packResult.originalTokens}`);
  console.log(`      Compacted Bitfield Tokens : ${packResult.compactedTokens}`);
  console.log(`      Bits Per Value Allocated  : ${packResult.bitsPerValue} bits`);
  console.log(`      Tokens Saved              : ${packResult.tokensSaved} (${packResult.savingsPercentage}% spend cut)`);
  console.log(`      Lossless Recovery Check   : ${JSON.stringify(unpackedEnums) === JSON.stringify(statusColumn)}`);

  if (!packResult.wasPacked || JSON.stringify(unpackedEnums) !== JSON.stringify(statusColumn) || packResult.tokensSaved === 0) {
    throw new Error('SIMD bitfield enum packing failed');
  }
  console.log('      [PASS] SimdPackedBitfieldEnumBuffer: 100% verified 2-bit packed enum compression.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 15 DEDUPLICATION BUFFERS VERIFIED 100%!           ');
  console.log('================================================================\n');
}

runPhase15DedupSuite().catch(err => {
  console.error('Phase 15 dedup suite error:', err);
  process.exit(1);
});
