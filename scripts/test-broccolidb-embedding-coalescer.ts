import assert from 'node:assert/strict';
import { BroccoliEmbeddingCoalescer } from '../src/core/broccolidb/BroccoliEmbeddingCoalescer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB EMBEDDING VECTOR COALESCER & DEDUPLICATOR');
  console.log('======================================================================\n');

  BroccoliEmbeddingCoalescer.clear();

  const boilerplateHeader = 'Copyright (c) 2026 GALXAI Enterprise Inc. All rights reserved. Licensed under Apache 2.0.';
  const codeChunk1 = 'export function calculateNetRevenue(gross: number, fees: number): number { return gross - fees; }';
  const codeChunk2 = 'export function verifySignature(hash: string, sig: string): boolean { return true; }';

  // 10-chunk ingestion batch with high boilerplate and function duplicates
  const rawBatchToEmbed = [
    boilerplateHeader,
    codeChunk1,
    boilerplateHeader, // Duplicate
    codeChunk2,
    boilerplateHeader, // Duplicate
    codeChunk1,        // Duplicate
    'export function computeTaxes(amount: number): number { return amount * 0.20; }',
    boilerplateHeader, // Duplicate
    codeChunk2,        // Duplicate
    boilerplateHeader, // Duplicate
  ];

  console.log('[1/2] Coalescing & Deduplicating 10-Chunk Ingestion Batch in BroccoliDB...');
  const res1 = BroccoliEmbeddingCoalescer.coalesceChunkBatch(rawBatchToEmbed);

  console.log(`      - Total Input Chunks: ${res1.totalInputChunks}`);
  console.log(`      - Unique Chunks to Embed: ${res1.uniqueChunksToEmbed}`);
  console.log(`      - Duplicate Chunks Skipped: ${res1.duplicateChunksSkipped}`);
  console.log(`      - Original Tokens: ${res1.originalTokens} -> Unique Tokens: ${res1.uniqueTokens}`);
  console.log(`      - Tokens Slashed: ${res1.tokensSaved} (-${res1.savingsPercentage}%)`);

  assert.equal(res1.totalInputChunks, 10);
  assert.equal(res1.uniqueChunksToEmbed, 4); // Only 4 unique texts
  assert.equal(res1.duplicateChunksSkipped, 6);
  assert.ok(res1.savingsPercentage >= 50);

  // Store computed embeddings
  console.log('\n[2/2] Storing Embeddings in In-Memory CAS Vault & Testing Subsequent Batch...');
  const mockEmbeddings = res1.uniqueBatchPayload.map(() => [0.12, -0.45, 0.88, 0.03]);
  BroccoliEmbeddingCoalescer.storeEmbeddings(res1.uniqueBatchPayload, mockEmbeddings);

  const res2 = BroccoliEmbeddingCoalescer.coalesceChunkBatch(rawBatchToEmbed);
  console.log(`      - Second Batch Unique Chunks to Embed: ${res2.uniqueChunksToEmbed} (100% Cache Hit)`);
  console.log(`      - Second Batch Duplicate Chunks Skipped: ${res2.duplicateChunksSkipped}`);
  console.log(`      - Second Batch Tokens Saved: ${res2.tokensSaved} (-${res2.savingsPercentage}%)`);

  assert.equal(res2.uniqueChunksToEmbed, 0);
  assert.equal(res2.duplicateChunksSkipped, 10);
  assert.equal(res2.savingsPercentage, 100);

  console.log('\n[✓] In-Memory Embedding CAS Deduplication & Batch Coalescing Verified.');

  console.log('\n======================================================================');
  console.log('   ALL EMBEDDING COALESCER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
