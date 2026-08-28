import assert from 'node:assert/strict';
import { BroccoliSessionDiffCompactor, ChatTurn } from '../src/core/broccolidb/BroccoliSessionDiffCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CROSS-SESSION CHAT DIFF COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSessionDiffCompactor.clear();

  const sessionId = 'session_user_chat_8899';

  // 1. Initial 10-turn conversation snapshot
  const initialTurns: ChatTurn[] = Array.from({ length: 10 }, (_, i) => ({
    id: `turn_${i + 1}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}: Discussing database sharding architecture and failover SLAs.`,
    timestampMs: Date.now() - (10 - i) * 60000,
  }));

  console.log('[1/2] Creating Initial 10-Turn Session Snapshot in BroccoliDB...');
  const res1 = BroccoliSessionDiffCompactor.computeSessionDiff(sessionId, initialTurns);

  console.log(`      - Is Incremental Diff: ${res1.isIncrementalDiff}`);
  console.log(`      - Total Session Turns: ${res1.totalSessionTurns}`);
  console.log(`      - Initial History Tokens: ${res1.originalHistoryTokens}`);

  assert.equal(res1.isIncrementalDiff, false);
  assert.equal(res1.totalSessionTurns, 10);

  // 2. User sends 1 new message in an active session (Turns: 10 -> 11)
  const updatedTurns: ChatTurn[] = [
    ...initialTurns,
    {
      id: 'turn_11',
      role: 'user',
      content: 'Can you please confirm what the failover recovery SLA is for cold backups?',
      timestampMs: Date.now(),
    },
  ];

  console.log('\n[2/2] Ingesting Turn 11 and Computing Incremental Message Delta...');
  const res2 = BroccoliSessionDiffCompactor.computeSessionDiff(sessionId, updatedTurns);

  console.log(`      - Is Incremental Diff: ${res2.isIncrementalDiff}`);
  console.log(`      - Total Session Turns: ${res2.totalSessionTurns}`);
  console.log(`      - Full History Tokens: ${res2.originalHistoryTokens} -> Transmitted Delta: ${res2.deltaTokens}`);
  console.log(`      - Tokens Slashed: ${res2.tokensSaved} (-${res2.savingsPercentage}%)`);
  console.log(`      - Delta Message Content: "${res2.deltaTurns[0].content}"`);

  assert.equal(res2.isIncrementalDiff, true);
  assert.equal(res2.newTurnsCount, 1);
  assert.ok(res2.savingsPercentage >= 80);
  assert.equal(res2.deltaTurns[0].id, 'turn_11');

  console.log('\n[✓] Cross-Session Chat History Diff Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SESSION DIFF COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
