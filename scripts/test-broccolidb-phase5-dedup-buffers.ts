/**
 * GALXAI BroccoliDB Phase 5 Network, Dialogue, SQL & Telemetry DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 5 deduplication buffers:
 * 1. BroccoliHttpHeaderCookieStripBuffer (HTTP Wire Headers, Cookies & JWT Masking)
 * 2. BroccoliMultiTurnDialogueCompactionBuffer (Stale Historical Tool Output Pruner)
 * 3. BroccoliSqlDdlSchemaHoistingBuffer (SQL DDL & Audit Column Hoisting)
 * 4. BroccoliDeltaEncodingNumericVectorBuffer (Delta-of-Delta Telemetry Compressor)
 * 5. BroccoliGraphEdgeAdjacencyDedupBuffer (Knowledge Graph Adjacency Matrix)
 */

import { BroccoliHttpHeaderCookieStripBuffer } from '../src/core/broccolidb/BroccoliHttpHeaderCookieStripBuffer';
import { BroccoliMultiTurnDialogueCompactionBuffer } from '../src/core/broccolidb/BroccoliMultiTurnDialogueCompactionBuffer';
import { BroccoliSqlDdlSchemaHoistingBuffer } from '../src/core/broccolidb/BroccoliSqlDdlSchemaHoistingBuffer';
import { BroccoliDeltaEncodingNumericVectorBuffer } from '../src/core/broccolidb/BroccoliDeltaEncodingNumericVectorBuffer';
import { BroccoliGraphEdgeAdjacencyDedupBuffer } from '../src/core/broccolidb/BroccoliGraphEdgeAdjacencyDedupBuffer';

async function runPhase5DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 5 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliHttpHeaderCookieStripBuffer
  console.log('[1/5] Testing BroccoliHttpHeaderCookieStripBuffer (HTTP Headers & JWT Masking)...');
  const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const rawHttpLog = `POST /v1/settlements/execute HTTP/1.1
Host: api.enterprise-bank.com
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Sec-Ch-Ua: "Chromium";v="128", "Not;A=Brand";v="24"
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
X-Request-Id: req_84920_af920193
X-Correlation-Id: corr_948201_9182390
Cookie: session_id=sess_9482019381; _ga=GA1.2.84920193.1724832000; datr=d94820af
Authorization: Bearer ${fakeJwt}
Content-Type: application/json

{"amountUsd": 145000.00, "destinationBic": "CHASSGSGXXXX"}`;

  const httpResult = BroccoliHttpHeaderCookieStripBuffer.deduplicateHttpHeaders(rawHttpLog);
  console.log(`      Original HTTP Tokens : ${httpResult.originalTokens}`);
  console.log(`      Compacted HTTP Tokens: ${httpResult.compactedTokens}`);
  console.log(`      Headers Stripped     : ${httpResult.headersStrippedCount}`);
  console.log(`      Tokens Saved         : ${httpResult.tokensSaved} (${httpResult.savingsPercentage}% spend cut)`);

  if (!httpResult.wasDeduplicated || httpResult.headersStrippedCount < 6 || httpResult.tokensMaskedCount !== 1) {
    throw new Error('HTTP header deduplication failed');
  }
  console.log('      [PASS] HttpHeaderCookieStripBuffer: 100% verified wire header & JWT deduplication.\n');

  // 2. Test BroccoliMultiTurnDialogueCompactionBuffer
  console.log('[2/5] Testing BroccoliMultiTurnDialogueCompactionBuffer (Stale Historical Tool Stubs)...');
  const chatMessages = [
    { role: 'user' as const, turnIndex: 1, content: 'List files in repository root.' },
    { role: 'tool' as const, turnIndex: 1, toolName: 'list_dir', content: 'src/core/index.ts\nsrc/router/catalog.ts\n' + 'scripts/test_file.ts\n'.repeat(50) },
    { role: 'assistant' as const, turnIndex: 1, content: 'Found 52 files in repository root.' },
    { role: 'user' as const, turnIndex: 2, content: 'Check the spend optimization status.' },
    { role: 'tool' as const, turnIndex: 2, toolName: 'status_check', content: 'src/core/optimizer.ts (14kb)\n' + 'scripts/verify.ts (28kb)\n'.repeat(30) },
    { role: 'assistant' as const, turnIndex: 2, content: 'Optimization status is healthy.' },
    { role: 'user' as const, turnIndex: 3, content: 'Now run the final verification.' },
  ];

  const diagResult = BroccoliMultiTurnDialogueCompactionBuffer.compactDialogue(chatMessages, 3);
  console.log(`      Original Turn Tokens : ${diagResult.originalTokens}`);
  console.log(`      Compacted Turn Tokens: ${diagResult.compactedTokens}`);
  console.log(`      Stale Tool Stubs Cut : ${diagResult.staleToolOutputsPruned}`);
  console.log(`      Tokens Saved         : ${diagResult.tokensSaved} (${diagResult.savingsPercentage}% spend cut)`);

  if (!diagResult.wasCompacted || diagResult.staleToolOutputsPruned !== 1) {
    throw new Error('Multi-turn dialogue compaction failed');
  }
  console.log('      [PASS] MultiTurnDialogueCompactionBuffer: 100% verified historical tool compaction.\n');

  // 3. Test BroccoliSqlDdlSchemaHoistingBuffer
  console.log('[3/5] Testing BroccoliSqlDdlSchemaHoistingBuffer (SQL DDL Constraint Hoisting)...');
  const rawSqlSchema = `CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(64) NOT NULL,
  balance_usd NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  amount_usd NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

  const sqlResult = BroccoliSqlDdlSchemaHoistingBuffer.deduplicateSqlDdl(rawSqlSchema);
  console.log(`      Original SQL Tokens : ${sqlResult.originalTokens}`);
  console.log(`      Compacted SQL Tokens: ${sqlResult.compactedTokens}`);
  console.log(`      Tables Processed    : ${sqlResult.tablesProcessed}`);
  console.log(`      Tokens Saved        : ${sqlResult.tokensSaved} (${sqlResult.savingsPercentage}% spend cut)`);

  if (!sqlResult.wasDeduplicated || sqlResult.tablesProcessed !== 2) {
    throw new Error('SQL DDL schema deduplication failed');
  }
  console.log('      [PASS] SqlDdlSchemaHoistingBuffer: 100% verified SQL DDL constraint hoisting.\n');

  // 4. Test BroccoliDeltaEncodingNumericVectorBuffer
  console.log('[4/5] Testing BroccoliDeltaEncodingNumericVectorBuffer (Delta-of-Delta Compression)...');
  const timestamps = [1724832000, 1724833000, 1724834000, 1724835000, 1724836000, 1724837000, 1724838000, 1724839000];
  const deltaResult = BroccoliDeltaEncodingNumericVectorBuffer.compressNumericArray(timestamps);
  const decompressedNumbers = BroccoliDeltaEncodingNumericVectorBuffer.decompressNumericArray(deltaResult.compactedDeltaText);

  console.log(`      Original Array Tokens : ${deltaResult.originalTokens}`);
  console.log(`      Compacted Delta Tokens: ${deltaResult.compactedTokens}`);
  console.log(`      Tokens Saved          : ${deltaResult.tokensSaved} (${deltaResult.savingsPercentage}% spend cut)`);
  console.log(`      Decompression Match   : ${JSON.stringify(decompressedNumbers) === JSON.stringify(timestamps)}`);

  if (!deltaResult.wasCompressed || JSON.stringify(decompressedNumbers) !== JSON.stringify(timestamps)) {
    throw new Error('Delta-of-delta numeric compression failed');
  }
  console.log('      [PASS] DeltaEncodingNumericVectorBuffer: 100% verified reversible telemetry delta compression.\n');

  // 5. Test BroccoliGraphEdgeAdjacencyDedupBuffer
  console.log('[5/5] Testing BroccoliGraphEdgeAdjacencyDedupBuffer (Knowledge Graph Adjacency Matrix)...');
  const triples = [
    { subject: 'User_Admin', predicate: 'HAS_ROLE', object: 'SecOps_Lead' },
    { subject: 'User_Admin', predicate: 'HAS_ROLE', object: 'IAM_Manager' },
    { subject: 'User_Admin', predicate: 'CAN_ACCESS', object: 'Vault_Secrets' },
    { subject: 'User_Admin', predicate: 'CAN_ACCESS', object: 'Database_Prod' },
    { subject: 'Service_Payment', predicate: 'CAN_ACCESS', object: 'Database_Prod' },
  ];

  const graphResult = BroccoliGraphEdgeAdjacencyDedupBuffer.deduplicateGraphEdges(triples);
  console.log(`      Original Graph Tokens : ${graphResult.originalTokens}`);
  console.log(`      Compacted Graph Tokens: ${graphResult.compactedTokens}`);
  console.log(`      Distinct Subjects     : ${graphResult.distinctSubjectsCount}`);
  console.log(`      Tokens Saved          : ${graphResult.tokensSaved} (${graphResult.savingsPercentage}% spend cut)`);

  if (!graphResult.wasDeduplicated || graphResult.distinctSubjectsCount !== 2) {
    throw new Error('Knowledge graph edge adjacency deduplication failed');
  }
  console.log('      [PASS] GraphEdgeAdjacencyDedupBuffer: 100% verified graph adjacency consolidation.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 5 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase5DedupSuite().catch(err => {
  console.error('Phase 5 dedup suite error:', err);
  process.exit(1);
});
