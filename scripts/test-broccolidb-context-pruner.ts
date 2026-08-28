import assert from 'node:assert/strict';
import { BroccoliContextPruner, RetrievedDocumentChunk } from '../src/core/broccolidb/BroccoliContextPruner';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC RAG CONTEXT PRUNER & TOKEN WINDOW COMPACTOR');
  console.log('======================================================================\n');

  BroccoliContextPruner.clear();

  // Create 5 retrieved document chunks
  const chunks: RetrievedDocumentChunk[] = [
    {
      id: 'doc_1',
      rawContent: 'Enterprise SOC2 Compliance Guide: All API keys must be rotated every 90 days. Rate limits are 120 req/min.',
      relevanceScore: 0.95,
    },
    {
      id: 'doc_2',
      rawContent: '<div><nav><a href="/home">Home</a> | <a href="/legal">Privacy Policy</a></nav></div> 2026 Copyright All rights reserved. Irrelevant legal footer text here.',
      relevanceScore: 0.05, // Noise chunk
    },
    {
      id: 'doc_3',
      rawContent: 'Security Audit Protocol: Audit traces must be logged to Write-Ahead Log (WAL) with SHA-256 integrity checksums.',
      relevanceScore: 0.90,
    },
    {
      id: 'doc_4',
      rawContent: 'Historical changelog for deprecated SDK version 0.1.0 released in 2022. Not relevant to current architecture.',
      relevanceScore: 0.10, // Noise chunk
    },
    {
      id: 'doc_5',
      rawContent: 'Budget Lease Management: Compare-And-Swap (CAS) leases prevent concurrent double-spending across workers.',
      relevanceScore: 0.88,
    },
  ];

  console.log('[1/2] Pruning 5 Retrieved Chunks against Query: "How does WAL audit security work?"...');
  const result = BroccoliContextPruner.pruneRagContext('How does WAL audit security work?', chunks, {
    minRelevanceScore: 0.35,
    maxContextTokens: 500,
  });

  console.log(`      - Was Pruned: ${result.wasPruned}`);
  console.log(`      - Original Tokens: ${result.originalTokens}`);
  console.log(`      - Pruned Tokens: ${result.prunedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Retained Chunks: ${result.retainedChunksCount} / ${chunks.length}`);
  console.log(`      - Noise Chunks Pruned: ${result.prunedChunksCount}`);

  assert.equal(result.wasPruned, true);
  assert.equal(result.retainedChunksCount, 3);
  assert.equal(result.prunedChunksCount, 2);
  assert.ok(result.cleanContextText.includes('Enterprise SOC2 Compliance Guide'));
  assert.ok(result.cleanContextText.includes('Security Audit Protocol'));
  assert.ok(!result.cleanContextText.includes('Privacy Policy'));

  // 2. Check Stats Aggregation
  console.log('\n[2/2] Checking BroccoliDB Context Pruning Analytics Aggregations...');
  const stats = BroccoliContextPruner.getStats();

  console.log(`      - Total Operations: ${stats.totalPruningOperations}`);
  console.log(`      - Total Saved Tokens: ${stats.totalSavedTokens}`);
  console.log(`      - Total Dollars Avoided: $${stats.totalAvoidedDollarsUsd.toFixed(6)}`);

  assert.equal(stats.totalPruningOperations, 1);
  assert.ok(stats.totalSavedTokens > 0);

  console.log('\n[✓] Dynamic RAG Context Pruning & Token Window Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CONTEXT PRUNER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
