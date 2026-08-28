/**
 * GALXAI BroccoliDB Phase 3 Specialized DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 specialized deduplication buffers:
 * 1. BroccoliRunLengthByteRunDedupBuffer (Run-Length Character Compression)
 * 2. BroccoliLevenshteinTolerantDedupBuffer (Bit-Parallel Levenshtein Typo Canonicalizer)
 * 3. BroccoliDictionaryLZWStreamingBuffer (Dynamic Phrase Dictionary Substitution)
 * 4. BroccoliSlidingWindowNgramDedupBuffer (Sliding Window N-gram Shingle Pruner)
 * 5. BroccoliCodeAstSymbolicDedupBuffer (Code AST Import & License Consolidator)
 */

import { BroccoliRunLengthByteRunDedupBuffer } from '../src/core/broccolidb/BroccoliRunLengthByteRunDedupBuffer';
import { BroccoliLevenshteinTolerantDedupBuffer } from '../src/core/broccolidb/BroccoliLevenshteinTolerantDedupBuffer';
import { BroccoliDictionaryLZWStreamingBuffer } from '../src/core/broccolidb/BroccoliDictionaryLZWStreamingBuffer';
import { BroccoliSlidingWindowNgramDedupBuffer } from '../src/core/broccolidb/BroccoliSlidingWindowNgramDedupBuffer';
import { BroccoliCodeAstSymbolicDedupBuffer } from '../src/core/broccolidb/BroccoliCodeAstSymbolicDedupBuffer';

async function runPhase3DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 3 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliRunLengthByteRunDedupBuffer
  console.log('[1/5] Testing BroccoliRunLengthByteRunDedupBuffer (Run-Length Compression)...');
  const paddedTable = '| Column A | Column B |\n' +
    '+' + '-'.repeat(80) + '+\n' +
    '| Value 1  | ' + ' '.repeat(40) + 'Data 1 |\n' +
    '+' + '-'.repeat(80) + '+\n';

  const rleResult = BroccoliRunLengthByteRunDedupBuffer.compressRuns(paddedTable, 4);
  const decompressed = BroccoliRunLengthByteRunDedupBuffer.decompressRuns(rleResult.compactedText);

  console.log(`      Original Tokens: ${rleResult.originalTokens} | Compacted Tokens: ${rleResult.compactedTokens}`);
  console.log(`      Tokens Saved   : ${rleResult.tokensSaved} (${rleResult.savingsPercentage}% spend cut)`);
  console.log(`      Runs Collapsed : ${rleResult.runsCollapsedCount}`);

  if (!rleResult.wasCompressed || decompressed !== paddedTable || rleResult.runsCollapsedCount !== 3) {
    throw new Error('Run-Length byte run compression failed');
  }
  console.log('      [PASS] RunLengthByteRunDedupBuffer: 100% verified reversible RLE compression.\n');

  // 2. Test BroccoliLevenshteinTolerantDedupBuffer
  console.log('[2/5] Testing BroccoliLevenshteinTolerantDedupBuffer (Levenshtein OCR Typo Matcher)...');
  const levBuffer = BroccoliLevenshteinTolerantDedupBuffer.getInstance(2);
  levBuffer.clear();

  const canonicalName = 'JPMorgan Chase Bank';
  const ocrTypo1 = 'JPMorgon Chase Bank'; // 1 substitution ('a' -> 'o')
  const ocrTypo2 = 'JPMorgan Chse Bank';  // 1 deletion ('a' missing)
  const unrelatedOrg = 'Citigroup Global Markets';

  const resLev1 = levBuffer.testAndCanonicalize(canonicalName);
  const resLev2 = levBuffer.testAndCanonicalize(ocrTypo1);
  const resLev3 = levBuffer.testAndCanonicalize(ocrTypo2);
  const resLev4 = levBuffer.testAndCanonicalize(unrelatedOrg);

  console.log(`      Canonical Registered: "${resLev1.canonicalTerm}"`);
  console.log(`      OCR Typo 1 Match    : isTypo=${resLev2.isTypoDuplicate}, Dist=${resLev2.editDistance}, Canonical="${resLev2.canonicalTerm}"`);
  console.log(`      OCR Typo 2 Match    : isTypo=${resLev3.isTypoDuplicate}, Dist=${resLev3.editDistance}, Canonical="${resLev3.canonicalTerm}"`);
  console.log(`      Unrelated Org Match : isTypo=${resLev4.isTypoDuplicate}`);

  if (!resLev2.isTypoDuplicate || !resLev3.isTypoDuplicate || resLev4.isTypoDuplicate || resLev2.canonicalTerm !== canonicalName) {
    throw new Error('Levenshtein typo deduplication failed');
  }
  console.log('      [PASS] LevenshteinTolerantDedupBuffer: 100% verified bit-parallel typo canonicalization.\n');

  // 3. Test BroccoliDictionaryLZWStreamingBuffer
  console.log('[3/5] Testing BroccoliDictionaryLZWStreamingBuffer (Phrase Dictionary Substitution)...');
  const contractExcerpt = 'The Buyer shall indemnify and hold harmless the Seller against all claims. ' +
    'Pursuant to Section 8.4, all covenants are governed in accordance with applicable law. ' +
    'Furthermore, Buyer agrees to indemnify and hold harmless all officers without prior written consent.';

  const lzwResult = BroccoliDictionaryLZWStreamingBuffer.compressPhrases(contractExcerpt);
  console.log(`      Original Tokens     : ${lzwResult.originalTokens}`);
  console.log(`      Compacted Tokens    : ${lzwResult.compactedTokens}`);
  console.log(`      Phrases Substituted : ${lzwResult.phrasesSubstituted}`);
  console.log(`      Tokens Saved        : ${lzwResult.tokensSaved} (${lzwResult.savingsPercentage}% spend cut)`);

  if (!lzwResult.wasCompressed || lzwResult.phrasesSubstituted < 3) {
    throw new Error('Dictionary LZW phrase substitution failed');
  }
  console.log('      [PASS] DictionaryLZWStreamingBuffer: 100% verified phrase dictionary substitution.\n');

  // 4. Test BroccoliSlidingWindowNgramDedupBuffer
  console.log('[4/5] Testing BroccoliSlidingWindowNgramDedupBuffer (Sliding Window N-gram Pruner)...');
  const para1 = 'Security Protocol 101: All external endpoints must enforce TLS 1.3 encryption with strict HSTS preloading headers enabled.';
  const para2 = 'Database Replication Guide: Primary nodes stream WAL records synchronously to secondary replicas with zero failover latency.';
  const para3 = 'Security Protocol 101: All external endpoints must enforce TLS 1.3 encryption with strict HSTS preloading headers enabled.'; // Exact echo

  const multiParaDoc = `${para1}\n\n${para2}\n\n${para3}`;
  const ngramResult = BroccoliSlidingWindowNgramDedupBuffer.deduplicateParagraphs(multiParaDoc, 0.7, 4);

  console.log(`      Total Paragraphs   : ${ngramResult.totalParagraphs}`);
  console.log(`      Retained Paragraphs: ${ngramResult.retainedParagraphs}`);
  console.log(`      Duplicate Pruned   : ${ngramResult.duplicateParagraphsPruned}`);
  console.log(`      Tokens Saved       : ${ngramResult.tokensSaved} (${ngramResult.savingsPercentage}% spend cut)`);

  if (!ngramResult.wasDeduplicated || ngramResult.duplicateParagraphsPruned !== 1 || ngramResult.retainedParagraphs !== 2) {
    throw new Error('Sliding-window N-gram paragraph deduplication failed');
  }
  console.log('      [PASS] SlidingWindowNgramDedupBuffer: 100% verified N-gram shingle paragraph deduplication.\n');

  // 5. Test BroccoliCodeAstSymbolicDedupBuffer
  console.log('[5/5] Testing BroccoliCodeAstSymbolicDedupBuffer (Code Imports & License Hoisting)...');
  const multiFileCodeBundle = `/* Copyright (c) 2026 Enterprise Corp. All Rights Reserved. Apache-2.0 License. */
import { BroccoliDbTable } from './broccolidb-table';
import { ModelCatalog } from '../router/ModelCatalog';

export class ServiceA {
  run() { return 1; }
}

/* Copyright (c) 2026 Enterprise Corp. All Rights Reserved. Apache-2.0 License. */
import { BroccoliDbTable } from './broccolidb-table';
import { ModelCatalog } from '../router/ModelCatalog';

export class ServiceB {
  run() { return 2; }
}`;

  const codeResult = BroccoliCodeAstSymbolicDedupBuffer.deduplicateCode(multiFileCodeBundle);
  console.log(`      Original Code Tokens    : ${codeResult.originalTokens}`);
  console.log(`      Compacted Code Tokens   : ${codeResult.compactedTokens}`);
  console.log(`      Duplicate Imports Saved : ${codeResult.duplicateImportsHoisted}`);
  console.log(`      Duplicate Licenses Saved: ${codeResult.licenseHeadersPruned}`);
  console.log(`      Tokens Saved            : ${codeResult.tokensSaved} (${codeResult.savingsPercentage}% spend cut)`);

  if (!codeResult.wasDeduplicated || codeResult.duplicateImportsHoisted !== 2 || codeResult.licenseHeadersPruned !== 1) {
    throw new Error('Code AST symbolic deduplication failed');
  }
  console.log('      [PASS] CodeAstSymbolicDedupBuffer: 100% verified code import hoisting and license pruning.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 3 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase3DedupSuite().catch(err => {
  console.error('Phase 3 dedup suite error:', err);
  process.exit(1);
});
