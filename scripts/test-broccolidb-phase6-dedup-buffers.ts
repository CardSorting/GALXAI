/**
 * GALXAI BroccoliDB Phase 6 Memory Tiering, Codecs & Entropy DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 6 deduplication buffers:
 * 1. BroccoliBrotliDictionaryTokenBuffer (Static Shared Dictionary Tokenization)
 * 2. BroccoliVariableByteIntVintBuffer (7-Bit Varint Integer Compression)
 * 3. BroccoliRegexStateTrieCanonicalizerBuffer (DFA Regulatory Standard Canonicalizer)
 * 4. BroccoliBitPackedBooleanMaskBuffer (64-Bit Bit-Packed Boolean Flags)
 * 5. BroccoliEntropyHuffmanFrequencyBuffer (Streaming Shannon Entropy Evaluator)
 */

import { BroccoliBrotliDictionaryTokenBuffer } from '../src/core/broccolidb/BroccoliBrotliDictionaryTokenBuffer';
import { BroccoliVariableByteIntVintBuffer } from '../src/core/broccolidb/BroccoliVariableByteIntVintBuffer';
import { BroccoliRegexStateTrieCanonicalizerBuffer } from '../src/core/broccolidb/BroccoliRegexStateTrieCanonicalizerBuffer';
import { BroccoliBitPackedBooleanMaskBuffer } from '../src/core/broccolidb/BroccoliBitPackedBooleanMaskBuffer';
import { BroccoliEntropyHuffmanFrequencyBuffer } from '../src/core/broccolidb/BroccoliEntropyHuffmanFrequencyBuffer';

async function runPhase6DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 6 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliBrotliDictionaryTokenBuffer
  console.log('[1/5] Testing BroccoliBrotliDictionaryTokenBuffer (Shared Static Dictionary)...');
  const legalDoc = 'The transaction requires strict compliance and regulatory governance across each jurisdiction. ' +
    'Each party provides a representation and warranty regarding confidentiality and proprietary trade secrets.';

  const brotliResult = BroccoliBrotliDictionaryTokenBuffer.encodeWords(legalDoc);
  const decodedDoc = BroccoliBrotliDictionaryTokenBuffer.decodeWords(brotliResult.compactedText);

  console.log(`      Original Tokens     : ${brotliResult.originalTokens}`);
  console.log(`      Compacted Tokens    : ${brotliResult.compactedTokens}`);
  console.log(`      Words Substituted   : ${brotliResult.dictionaryWordsSubstituted}`);
  console.log(`      Lossless Decoded    : ${decodedDoc.toLowerCase() === legalDoc.toLowerCase()}`);

  if (!brotliResult.wasCompressed || decodedDoc.toLowerCase() !== legalDoc.toLowerCase() || brotliResult.dictionaryWordsSubstituted < 6) {
    throw new Error('Brotli static dictionary tokenization failed');
  }
  console.log('      [PASS] BrotliDictionaryTokenBuffer: 100% verified shared dictionary tokenization.\n');

  // 2. Test BroccoliVariableByteIntVintBuffer
  console.log('[2/5] Testing BroccoliVariableByteIntVintBuffer (7-Bit Varint Compression)...');
  const integerList: number[] = [];
  for (let i = 0; i < 50; i++) {
    integerList.push(1724832000 + (i * 1000));
  }
  const vintResult = BroccoliVariableByteIntVintBuffer.compressIntegerArray(integerList);
  const decompressedInts = BroccoliVariableByteIntVintBuffer.decompressIntegerArray(vintResult.compactedVarintFrame);

  console.log(`      Original JSON Tokens : ${vintResult.originalTokens}`);
  console.log(`      Compacted Varint Toks: ${vintResult.compactedTokens}`);
  console.log(`      Tokens Saved         : ${vintResult.tokensSaved} (${vintResult.savingsPercentage}% spend cut)`);
  console.log(`      Reversibility Match  : ${JSON.stringify(decompressedInts) === JSON.stringify(integerList)}`);

  if (!vintResult.wasCompressed || JSON.stringify(decompressedInts) !== JSON.stringify(integerList)) {
    throw new Error('Varint integer compression failed');
  }
  console.log('      [PASS] VariableByteIntVintBuffer: 100% verified 7-bit Varint compression.\n');

  // 3. Test BroccoliRegexStateTrieCanonicalizerBuffer
  console.log('[3/5] Testing BroccoliRegexStateTrieCanonicalizerBuffer (DFA Regex Canonicalizer)...');
  const complianceAuditReport = 'All messages adhere to ISO 20022 Financial Services Message standards. ' +
    'Clinical encounters must conform to HL7 FHIR Release 4.0.1 Clinical Resource schemas and Payment Card Industry Data Security Standard.';

  const dfaResult = BroccoliRegexStateTrieCanonicalizerBuffer.canonicalizeText(complianceAuditReport);
  console.log(`      Original Report Tokens: ${dfaResult.originalTokens}`);
  console.log(`      Compacted Tokens      : ${dfaResult.compactedTokens}`);
  console.log(`      Standards Canonicalized: ${dfaResult.matchesFoundCount}`);
  console.log(`      Tokens Saved          : ${dfaResult.tokensSaved} (${dfaResult.savingsPercentage}% spend cut)`);

  if (!dfaResult.wasCanonicalized || dfaResult.matchesFoundCount !== 3) {
    throw new Error('DFA regex state trie canonicalization failed');
  }
  console.log('      [PASS] RegexStateTrieCanonicalizerBuffer: 100% verified DFA regulatory standard matching.\n');

  // 4. Test BroccoliBitPackedBooleanMaskBuffer
  console.log('[4/5] Testing BroccoliBitPackedBooleanMaskBuffer (64-Bit Bit-Packed Booleans)...');
  const userFlags = [];
  for (let i = 0; i < 30; i++) {
    userFlags.push({
      is_active: i % 2 === 0,
      has_mfa: i % 3 === 0,
      is_verified: i % 5 === 0,
      can_read: true,
      can_write: i % 2 === 0,
      can_delete: false,
      is_enterprise: true,
      has_api_access: i % 4 === 0,
    });
  }

  const bitResult = BroccoliBitPackedBooleanMaskBuffer.packBooleanRecords(userFlags);
  const unpackedFlags = BroccoliBitPackedBooleanMaskBuffer.unpackBooleanRecords(bitResult.compactedBitmaskText);

  console.log(`      Original Boolean Tokens: ${bitResult.originalTokens}`);
  console.log(`      Compacted Bitmask Tokens: ${bitResult.compactedTokens}`);
  console.log(`      Tokens Saved           : ${bitResult.tokensSaved} (${bitResult.savingsPercentage}% spend reduction)`);
  console.log(`      Unpacked Integrity Match: ${JSON.stringify(unpackedFlags) === JSON.stringify(userFlags)}`);

  if (!bitResult.wasPacked || JSON.stringify(unpackedFlags) !== JSON.stringify(userFlags) || bitResult.savingsPercentage < 75.0) {
    throw new Error('Bit-packed boolean compression failed');
  }
  console.log('      [PASS] BitPackedBooleanMaskBuffer: 100% verified 64-bit boolean bitmask packing.\n');

  // 5. Test BroccoliEntropyHuffmanFrequencyBuffer
  console.log('[5/5] Testing BroccoliEntropyHuffmanFrequencyBuffer (Shannon Entropy Evaluator)...');
  const highEntropyText = 'The cryptographic hash of the transaction block is 0x8f4920afbc819203da8912e756184910.';
  const lowEntropyBoilerplate = '--------------------------------------------------------------------------------';

  const highResult = BroccoliEntropyHuffmanFrequencyBuffer.analyzeAndCompact(highEntropyText);
  const lowResult = BroccoliEntropyHuffmanFrequencyBuffer.analyzeAndCompact(lowEntropyBoilerplate);

  console.log(`      High-Entropy Stream (Bits/Char): ${highResult.shannonEntropyBits} (Is Low Entropy: ${highResult.isLowEntropyBoilerplate})`);
  console.log(`      Low-Entropy Stream  (Bits/Char): ${lowResult.shannonEntropyBits} (Is Low Entropy: ${lowResult.isLowEntropyBoilerplate})`);
  console.log(`      Low-Entropy Tokens Saved       : ${lowResult.tokensSaved} (${lowResult.savingsPercentage}% spend cut)`);

  if (highResult.isLowEntropyBoilerplate || !lowResult.isLowEntropyBoilerplate || lowResult.tokensSaved === 0) {
    throw new Error('Shannon entropy evaluation failed');
  }
  console.log('      [PASS] EntropyHuffmanFrequencyBuffer: 100% verified streaming Shannon entropy analysis.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 6 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase6DedupSuite().catch(err => {
  console.error('Phase 6 dedup suite error:', err);
  process.exit(1);
});
