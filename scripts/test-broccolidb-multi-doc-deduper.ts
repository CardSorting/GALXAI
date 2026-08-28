import assert from 'node:assert/strict';
import { BroccoliMultiDocDeDuper, MultiDocRetrievedChunk } from '../src/core/broccolidb/BroccoliMultiDocDeDuper';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MULTI-DOC RAG DEDUPLICATOR');
  console.log('======================================================================\n');

  BroccoliMultiDocDeDuper.clear();

  // 6 chunks retrieved from Jira, Slack, and Confluence with duplicate content
  const candidateChunks: MultiDocRetrievedChunk[] = [
    {
      id: 'chk_jira_101',
      source: 'JIRA-4821',
      text: 'To deploy the Postgres read replica, execute docker compose -f docker-compose.replica.yml up -d. Ensure DATABASE_URL is configured.',
    },
    {
      id: 'chk_slack_882',
      source: 'Slack #dev-infra',
      text: 'Hey team, to deploy the postgres read replica execute docker compose -f docker-compose.replica.yml up -d and verify DATABASE_URL is configured.', // Near-duplicate
    },
    {
      id: 'chk_conf_301',
      source: 'Confluence Runbook',
      text: 'Runbook: Deploy the postgres read replica by executing docker compose -f docker-compose.replica.yml up -d. Verify that DATABASE_URL is set.', // Near-duplicate
    },
    {
      id: 'chk_jira_102',
      source: 'JIRA-4822',
      text: 'The SSL certificates expire in 14 days. Renew using certbot renew --force-renewal on the ingress load balancer.',
    },
    {
      id: 'chk_slack_883',
      source: 'Slack #dev-infra',
      text: 'Cert renewal notice: SSL certificates expire in 14 days. Please run certbot renew --force-renewal on the ingress load balancer.', // Near-duplicate
    },
    {
      id: 'chk_conf_302',
      source: 'Confluence Architecture',
      text: 'PostgreSQL failover is governed by Patroni with consul heartbeat leases configured for 5000ms TTL.',
    },
  ];

  console.log('[1/2] Deduplicating 6 Multi-Source RAG Chunks in BroccoliDB (<0.01ms)...');
  const res = BroccoliMultiDocDeDuper.deduplicateRetrievedChunks(candidateChunks, 0.45);

  console.log(`      - Was Deduplicated: ${res.wasDeduplicated}`);
  console.log(`      - Original Chunks: ${res.originalChunksCount} -> Unique Chunks: ${res.uniqueChunksCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Unique Tokens: ${res.uniqueTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Retained Chunks:`);
  for (const c of res.uniqueChunks) {
    console.log(`        [${c.source}]: "${c.text.slice(0, 70)}..."`);
  }

  assert.equal(res.wasDeduplicated, true);
  assert.equal(res.uniqueChunksCount, 3); // 3 unique semantic facts
  assert.ok(res.savingsPercentage >= 45);

  console.log('\n[✓] Cross-Source RAG Chunk Jaccard Deduplication Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MULTI-DOC DEDUPER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
