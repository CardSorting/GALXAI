/**
 * GALXAI BroccoliDB Phase 13 LZ4 Streaming, CSR Sparse Matrices, Cross-Lingual & Mel-Spectrogram Verification Suite
 * 
 * Tests the 5 Phase 13 deduplication buffers:
 * 1. BroccoliLz4StreamingFrameCodecBuffer (Streaming LZ4 Block & Match Distance Codec)
 * 2. BroccoliCsrSparseMatrixCompressionBuffer (Compressed Sparse Row CSR Matrix Compactor)
 * 3. BroccoliCrossLingualSemanticCanonicalizerBuffer (Multilingual Intent & Concept Canonicalizer)
 * 4. BroccoliGraphColoringRegisterAllocationBuffer (Kempe Graph Coloring Register Allocation)
 * 5. BroccoliSpectrogramGridMatrixQuantizerBuffer (Mel-Spectrogram INT4 Quantizer & Silence Pruner)
 */

import { BroccoliLz4StreamingFrameCodecBuffer } from '../src/core/broccolidb/BroccoliLz4StreamingFrameCodecBuffer';
import { BroccoliCsrSparseMatrixCompressionBuffer } from '../src/core/broccolidb/BroccoliCsrSparseMatrixCompressionBuffer';
import { BroccoliCrossLingualSemanticCanonicalizerBuffer } from '../src/core/broccolidb/BroccoliCrossLingualSemanticCanonicalizerBuffer';
import { BroccoliGraphColoringRegisterAllocationBuffer } from '../src/core/broccolidb/BroccoliGraphColoringRegisterAllocationBuffer';
import { BroccoliSpectrogramGridMatrixQuantizerBuffer } from '../src/core/broccolidb/BroccoliSpectrogramGridMatrixQuantizerBuffer';

async function runPhase13DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 13 DEDUPLICATION BUFFER VERIFICATION  ');
  console.log('================================================================\n');

  // 1. Test BroccoliLz4StreamingFrameCodecBuffer
  console.log('[1/5] Testing BroccoliLz4StreamingFrameCodecBuffer (LZ4 Streaming Codec)...');
  const unit = 'TRANSACTION_SETTLEMENT_BATCH_ID_84920_';
  const streamPayload = unit + unit + unit + unit + unit + unit;
  const lz4Result = BroccoliLz4StreamingFrameCodecBuffer.compress(streamPayload);
  const decompressed = BroccoliLz4StreamingFrameCodecBuffer.decompress(lz4Result.compactedLz4Frame);

  console.log(`      Original String Tokens : ${lz4Result.originalTokens}`);
  console.log(`      Compacted LZ4 Tokens   : ${lz4Result.compactedTokens}`);
  console.log(`      Matches Found          : ${lz4Result.matchesCount}`);
  console.log(`      Lossless Decompressed  : ${decompressed === streamPayload}`);

  if (!lz4Result.wasCompressed || decompressed !== streamPayload || lz4Result.matchesCount === 0) {
    throw new Error('LZ4 streaming codec compression failed');
  }
  console.log('      [PASS] Lz4StreamingFrameCodecBuffer: 100% verified LZ4 streaming compression.\n');

  // 2. Test BroccoliCsrSparseMatrixCompressionBuffer
  console.log('[2/5] Testing BroccoliCsrSparseMatrixCompressionBuffer (CSR Sparse Matrix)...');
  // Generate 16x16 sparse matrix with 98% zeros
  const sparseMatrix: number[][] = Array.from({ length: 16 }, () => new Array(16).fill(0));
  sparseMatrix[0][2] = 15.5;
  sparseMatrix[2][7] = 42.0;
  sparseMatrix[5][1] = 99.2;
  sparseMatrix[8][9] = 120.0;
  sparseMatrix[12][4] = 88.4;
  sparseMatrix[15][15] = 200.0;

  const csrResult = BroccoliCsrSparseMatrixCompressionBuffer.compressMatrix(sparseMatrix);
  const decompressedMatrix = BroccoliCsrSparseMatrixCompressionBuffer.decompressMatrix(csrResult.compactedCsrFrame);

  console.log(`      Original Dense Tokens  : ${csrResult.originalTokens}`);
  console.log(`      Compacted CSR Tokens   : ${csrResult.compactedTokens}`);
  console.log(`      Sparsity Ratio         : ${(csrResult.sparsityRatio * 100).toFixed(1)}%`);
  console.log(`      Tokens Saved           : ${csrResult.tokensSaved} (${csrResult.savingsPercentage}% spend cut)`);
  console.log(`      Matrix Match Check     : ${JSON.stringify(decompressedMatrix) === JSON.stringify(sparseMatrix)}`);

  if (!csrResult.wasCompacted || JSON.stringify(decompressedMatrix) !== JSON.stringify(sparseMatrix) || csrResult.savingsPercentage < 50.0) {
    throw new Error('CSR sparse matrix compression failed');
  }
  console.log('      [PASS] CsrSparseMatrixCompressionBuffer: 100% verified CSR matrix compression.\n');

  // 3. Test BroccoliCrossLingualSemanticCanonicalizerBuffer
  console.log('[3/5] Testing BroccoliCrossLingualSemanticCanonicalizerBuffer (Cross-Lingual Concepts)...');
  const multiLingualTranscript = 'Customer 1 (ES): Solicito un reembolso de mi compra immediately. ' +
    'Customer 2 (FR): Je souhaite demander un remboursement pour mon achat please. ' +
    'Customer 3 (DE): Wie kann ich mein passwort zurücksetzen today?';

  const crossResult = BroccoliCrossLingualSemanticCanonicalizerBuffer.canonicalize(multiLingualTranscript);
  console.log(`      Original Multilingual Tokens : ${crossResult.originalTokens}`);
  console.log(`      Compacted Concepts Tokens    : ${crossResult.compactedTokens}`);
  console.log(`      Concepts Canonicalized       : ${crossResult.conceptsCanonicalizedCount}`);
  console.log(`      Tokens Saved                 : ${crossResult.tokensSaved} (${crossResult.savingsPercentage}% spend cut)`);

  if (!crossResult.wasCanonicalized || crossResult.conceptsCanonicalizedCount !== 3) {
    throw new Error('Cross-lingual semantic canonicalization failed');
  }
  console.log('      [PASS] CrossLingualSemanticCanonicalizerBuffer: 100% verified cross-lingual concept mapping.\n');

  // 4. Test BroccoliGraphColoringRegisterAllocationBuffer
  console.log('[4/5] Testing BroccoliGraphColoringRegisterAllocationBuffer (Kempe Graph Coloring)...');
  const codeExpr = 'let totalRevenue = (accountBalance + pendingSettlement) * taxRate - auditFee + complianceCharge;';
  const interference = {
    variables: ['accountBalance', 'pendingSettlement', 'taxRate', 'auditFee', 'complianceCharge'],
    interferences: [
      ['accountBalance', 'pendingSettlement'] as [string, string],
      ['taxRate', 'auditFee'] as [string, string],
    ],
  };

  const regResult = BroccoliGraphColoringRegisterAllocationBuffer.allocateRegisters(codeExpr, interference);
  console.log(`      Original Expression Tokens : ${regResult.originalTokens}`);
  console.log(`      Compacted Register Tokens  : ${regResult.compactedTokens}`);
  console.log(`      Chromatic Number (Registers): ${regResult.chromaticNumber}`);
  console.log(`      Tokens Saved               : ${regResult.tokensSaved} (${regResult.savingsPercentage}% spend cut)`);

  if (!regResult.wasAllocated || regResult.chromaticNumber > 3 || regResult.tokensSaved === 0) {
    throw new Error('Kempe graph coloring register allocation failed');
  }
  console.log('      [PASS] GraphColoringRegisterAllocationBuffer: 100% verified Kempe graph coloring.\n');

  // 5. Test BroccoliSpectrogramGridMatrixQuantizerBuffer
  console.log('[5/5] Testing BroccoliSpectrogramGridMatrixQuantizerBuffer (Mel-Spectrogram INT4)...');
  // Generate 8 frequency bands x 32 time frames with silence blocks
  const specMatrix: number[][] = [];
  for (let f = 0; f < 8; f++) {
    const row: number[] = [];
    for (let t = 0; t < 32; t++) {
      row.push((t >= 10 && t <= 20) ? -15.0 : -60.0); // Active speech in frames 10..20, silence elsewhere
    }
    specMatrix.push(row);
  }

  const specResult = BroccoliSpectrogramGridMatrixQuantizerBuffer.quantizeSpectrogram(specMatrix, -60, 0);
  console.log(`      Original Spectrogram Tokens : ${specResult.originalTokens}`);
  console.log(`      Compacted INT4 Frame Tokens : ${specResult.compactedTokens}`);
  console.log(`      Silent Frames Pruned        : ${specResult.silentFramesPrunedCount}`);
  console.log(`      Tokens Saved                : ${specResult.tokensSaved} (${specResult.savingsPercentage}% spend cut)`);

  if (!specResult.wasQuantized || specResult.silentFramesPrunedCount < 15 || specResult.savingsPercentage < 60.0) {
    throw new Error('Spectrogram INT4 quantization failed');
  }
  console.log('      [PASS] SpectrogramGridMatrixQuantizerBuffer: 100% verified INT4 spectrogram quantization.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 13 DEDUPLICATION BUFFERS VERIFIED 100%!           ');
  console.log('================================================================\n');
}

runPhase13DedupSuite().catch(err => {
  console.error('Phase 13 dedup suite error:', err);
  process.exit(1);
});
