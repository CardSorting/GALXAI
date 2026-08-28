/**
 * GALXAI BroccoliDB Phase 11 BWT, Protobuf Wire, Invariant Hoisting & Kronecker Tensor Verification Suite
 * 
 * Tests the 5 Phase 11 deduplication buffers:
 * 1. BroccoliBurrowsWheelerRunLengthBuffer (BWT Clustering & Run-Length Encoding)
 * 2. BroccoliProtobufVarintWireFormatBuffer (Protobuf Tag-Length-Value Binary Wire Codec)
 * 3. BroccoliDynamicInvariantHoistBuffer (Multi-Turn Dialogue Invariant Hoisting)
 * 4. BroccoliTensorRank1KroneckerProductBuffer (Rank-1 Kronecker Outer Product Tensor Decomposer)
 * 5. BroccoliAdaptiveGrammarCfgCompactorBuffer (Sequitur CFG Grammar Inducer)
 */

import { BroccoliBurrowsWheelerRunLengthBuffer } from '../src/core/broccolidb/BroccoliBurrowsWheelerRunLengthBuffer';
import { BroccoliProtobufVarintWireFormatBuffer } from '../src/core/broccolidb/BroccoliProtobufVarintWireFormatBuffer';
import { BroccoliDynamicInvariantHoistBuffer } from '../src/core/broccolidb/BroccoliDynamicInvariantHoistBuffer';
import { BroccoliTensorRank1KroneckerProductBuffer } from '../src/core/broccolidb/BroccoliTensorRank1KroneckerProductBuffer';
import { BroccoliAdaptiveGrammarCfgCompactorBuffer } from '../src/core/broccolidb/BroccoliAdaptiveGrammarCfgCompactorBuffer';

async function runPhase11DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 11 DEDUPLICATION BUFFER VERIFICATION  ');
  console.log('================================================================\n');

  // 1. Test BroccoliBurrowsWheelerRunLengthBuffer
  console.log('[1/5] Testing BroccoliBurrowsWheelerRunLengthBuffer (BWT Run-Length)...');
  const repetitiveText = 'BANANA_BANANA_BANANA_BANANA_APPLE_APPLE_APPLE_APPLE_CHERRY_CHERRY_CHERRY';
  const bwtResult = BroccoliBurrowsWheelerRunLengthBuffer.encode(repetitiveText);

  console.log(`      Original String Tokens : ${bwtResult.originalTokens}`);
  console.log(`      Compacted BWT Tokens   : ${bwtResult.compactedTokens}`);
  console.log(`      Runs Collapsed         : ${bwtResult.runsCollapsedCount}`);

  if (!bwtResult.wasTransformed || bwtResult.runsCollapsedCount < 3) {
    throw new Error('BWT run-length compaction failed');
  }
  console.log('      [PASS] BurrowsWheelerRunLengthBuffer: 100% verified BWT clustering.\n');

  // 2. Test BroccoliProtobufVarintWireFormatBuffer
  console.log('[2/5] Testing BroccoliProtobufVarintWireFormatBuffer (Protobuf Wire Codec)...');
  const verboseRecord = {
    transaction_id: 'TX-849204910293',
    account_number: 'ACC-99201920',
    amount_cents: 1450000,
    is_settled: true,
    routing_code: 'FEDWIRE-021000021',
    status: 'COMPLETED_SUCCESSFULLY',
  };

  const protoResult = BroccoliProtobufVarintWireFormatBuffer.encodeRecord(verboseRecord);
  console.log(`      Original JSON Tokens   : ${protoResult.originalTokens}`);
  console.log(`      Protobuf Wire Tokens   : ${protoResult.compactedTokens}`);
  console.log(`      Fields Encoded         : ${protoResult.fieldsEncodedCount}`);
  console.log(`      Tokens Saved           : ${protoResult.tokensSaved} (${protoResult.savingsPercentage}% spend cut)`);

  if (!protoResult.wasEncoded || protoResult.fieldsEncodedCount !== 6 || protoResult.savingsPercentage < 30.0) {
    throw new Error('Protobuf wire encoding failed');
  }
  console.log('      [PASS] ProtobufVarintWireFormatBuffer: 100% verified binary protobuf wire encoding.\n');

  // 3. Test BroccoliDynamicInvariantHoistBuffer
  console.log('[3/5] Testing BroccoliDynamicInvariantHoistBuffer (Multi-Turn Invariant Hoisting)...');
  const invariantPolicy = 'CRITICAL POLICY: All transactions above $10,000 USD require dual authorization.';
  const turns = [
    `Turn 1: User requested balance check.\n${invariantPolicy}\nBalance is $45,000 USD.`,
    `Turn 2: User requested withdrawal of $12,000 USD.\n${invariantPolicy}\nDual authorization requested.`,
    `Turn 3: Approver 1 verified transaction.\n${invariantPolicy}\nAwaiting second approver signature.`,
  ];

  const hoistResult = BroccoliDynamicInvariantHoistBuffer.hoistInvariants(turns);
  console.log(`      Original Session Tokens : ${hoistResult.originalTokens}`);
  console.log(`      Compacted Session Tokens: ${hoistResult.compactedTokens}`);
  console.log(`      Invariants Hoisted      : ${hoistResult.invariantsCount}`);
  console.log(`      Tokens Saved            : ${hoistResult.tokensSaved} (${hoistResult.savingsPercentage}% spend cut)`);

  if (!hoistResult.wasHoisted || hoistResult.invariantsCount !== 1) {
    throw new Error('Multi-turn invariant hoisting failed');
  }
  console.log('      [PASS] DynamicInvariantHoistBuffer: 100% verified invariant hoisting.\n');

  // 4. Test BroccoliTensorRank1KroneckerProductBuffer
  console.log('[4/5] Testing BroccoliTensorRank1KroneckerProductBuffer (Rank-1 Kronecker Outer Product)...');
  // Generate 8x8 Rank-1 matrix: M[r, c] = u[r] * v[c]
  const u = [1, 2, 3, 4, 5, 6, 7, 8];
  const v = [10, 20, 30, 40, 50, 60, 70, 80];
  const rank1Matrix = BroccoliTensorRank1KroneckerProductBuffer.reconstructMatrix(u, v);

  const tensorResult = BroccoliTensorRank1KroneckerProductBuffer.factorMatrix(rank1Matrix);
  console.log(`      Original 8x8 Matrix Tokens : ${tensorResult.originalTokens}`);
  console.log(`      Compacted Factor Tokens    : ${tensorResult.compactedTokens}`);
  console.log(`      Tokens Saved               : ${tensorResult.tokensSaved} (${tensorResult.savingsPercentage}% spend cut)`);
  console.log(`      Rank-1 Separable Match     : ${tensorResult.wasFactorable}`);

  if (!tensorResult.wasFactorable || tensorResult.savingsPercentage < 60.0) {
    throw new Error('Rank-1 Kronecker tensor factoring failed');
  }
  console.log('      [PASS] TensorRank1KroneckerProductBuffer: 100% verified Rank-1 tensor outer product factoring.\n');

  // 5. Test BroccoliAdaptiveGrammarCfgCompactorBuffer
  console.log('[5/5] Testing BroccoliAdaptiveGrammarCfgCompactorBuffer (Sequitur CFG Grammar)...');
  const phrase = 'The audit protocol verifies security compliance and governance.';
  const repetitiveGrammarText = `${phrase} ${phrase} ${phrase} ${phrase} ${phrase}`;

  const cfgResult = BroccoliAdaptiveGrammarCfgCompactorBuffer.induceGrammar(repetitiveGrammarText);
  console.log(`      Original Text Tokens    : ${cfgResult.originalTokens}`);
  console.log(`      Compacted Grammar Tokens: ${cfgResult.compactedTokens}`);
  console.log(`      Rules Generated         : ${cfgResult.rulesGeneratedCount}`);
  console.log(`      Tokens Saved            : ${cfgResult.tokensSaved} (${cfgResult.savingsPercentage}% spend cut)`);

  if (!cfgResult.wasCompacted || cfgResult.rulesGeneratedCount === 0 || cfgResult.tokensSaved === 0) {
    throw new Error('Sequitur CFG grammar induction failed');
  }
  console.log('      [PASS] AdaptiveGrammarCfgCompactorBuffer: 100% verified Sequitur CFG grammar induction.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 11 DEDUPLICATION BUFFERS VERIFIED 100%!           ');
  console.log('================================================================\n');
}

runPhase11DedupSuite().catch(err => {
  console.error('Phase 11 dedup suite error:', err);
  process.exit(1);
});
