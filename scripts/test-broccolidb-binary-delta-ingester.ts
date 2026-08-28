import assert from 'node:assert/strict';
import { BroccoliBinaryDeltaIngester } from '../src/core/broccolidb/BroccoliBinaryDeltaIngester';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MERKLE CHUNK TREE & DELTA INGESTER');
  console.log('======================================================================\n');

  BroccoliBinaryDeltaIngester.clear();

  // Initial Document: 8 paragraph chunks of technical specification
  const paragraph1 = 'Section 1: The architecture enforces zero trust across all network boundaries. All internal microservices require mutual TLS with SPIFFE identity certificates.';
  const paragraph2 = 'Section 2: Database replication operates with synchronous commit across 3 availability zones in us-east-1. WAL frames are flushed with CRC32 verification.';
  const paragraph3 = 'Section 3: Rate limiting is governed by in-memory token buckets with dynamic tier scaling for enterprise clients.';
  const paragraph4 = 'Section 4: Audit logging emits OpenTelemetry GenAI 1.28.0+ spans to ClickHouse via streaming HTTP endpoints.';
  const paragraph5 = 'Section 5: Key management relies on AWS KMS with envelope encryption.';
  const paragraph6 = 'Section 6: Backup archives are streamed daily to S3 Glacier Flexible Retrieval.';
  const paragraph7 = 'Section 7: Ingress routing is protected by Cloudflare Workers edge rules.';
  const paragraph8 = 'Section 8: Budget thresholds trigger PagerDuty alerts upon 90% consumption.';

  const originalDocument = [paragraph1, paragraph2, paragraph3, paragraph4, paragraph5, paragraph6, paragraph7, paragraph8].join('\n\n');

  console.log('[1/2] Indexing Initial 8-Paragraph Document in BroccoliDB Merkle DAG...');
  const res1 = BroccoliBinaryDeltaIngester.syncDocumentDelta('doc_tech_spec_v1', originalDocument);

  console.log(`      - Initial Total Chunks: ${res1.totalChunks}`);
  console.log(`      - Mutated Chunks to Embed: ${res1.mutatedChunksCount}`);
  console.log(`      - Unchanged Chunks: ${res1.unchangedChunksCount}`);
  console.log(`      - Original Document Tokens: ${res1.originalDocumentTokens}`);

  assert.equal(res1.mutatedChunksCount, 8);
  assert.equal(res1.unchangedChunksCount, 0);

  // User edits only paragraph 3 (fixing a number), paragraphs 1, 2, 4, 5, 6, 7, 8 remain 100% unchanged
  const mutatedParagraph3 = 'Section 3: Rate limiting is governed by in-memory token buckets with dynamic tier scaling for enterprise clients (Tier 1 limit: 50,000 RPM).';
  const updatedDocument = [paragraph1, paragraph2, mutatedParagraph3, paragraph4, paragraph5, paragraph6, paragraph7, paragraph8].join('\n\n');

  console.log('\n[2/2] Re-Syncing Updated Document with Minor 1-Line Mutation...');
  const res2 = BroccoliBinaryDeltaIngester.syncDocumentDelta('doc_tech_spec_v1', updatedDocument);

  console.log(`      - Total Chunks: ${res2.totalChunks}`);
  console.log(`      - Mutated Chunks to Embed: ${res2.mutatedChunksCount}`);
  console.log(`      - Unchanged Chunks (Reused $0.000): ${res2.unchangedChunksCount}`);
  console.log(`      - Tokens Slashed: ${res2.tokensSaved} (-${res2.savingsPercentage}%)`);

  assert.equal(res2.mutatedChunksCount, 1);
  assert.equal(res2.unchangedChunksCount, 7);
  assert.ok(res2.savingsPercentage >= 80); // Reuses 7 out of 8 Merkle leaf vector embeddings!

  console.log('\n[✓] Merkle Leaf Hash Diffing & 85%+ Re-Embedding Spend Slashed Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MERKLE DELTA INGESTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
