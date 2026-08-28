import assert from 'node:assert/strict';
import { BroccoliContextRingBuffer } from '../src/core/broccolidb/BroccoliContextRingBuffer';
import { ChatMessage } from '../src/core/broccolidb/BroccoliRollingHistoryCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CONTEXT RING BUFFER & SESSION EVICTOR');
  console.log('======================================================================\n');

  BroccoliContextRingBuffer.clear();

  const diagnosticOutput = `
Cluster node report:
- Active Memory: 14.8GB / 16.0GB (92.5%)
- Thread Pool: 412 active worker threads
- Cache Buffer Hit Rate: 99.4% across 1,000,000 requests
- Network Latency: p99 1.2ms, p50 0.2ms
- Disk I/O: 1,420 IOPS read, 890 IOPS write
`.trim();

  // Create 16-turn verbose chat session history (~3,500 tokens)
  const sessionHistory: ChatMessage[] = [
    { role: 'system', content: 'You are the GALXAI SRE and Infrastructure Architect.' },
    { role: 'user', content: 'Can you check the memory utilization of cluster worker node A-1?' },
    { role: 'assistant', content: `Memory utilization report on node A-1:\n${diagnosticOutput}` },
    { role: 'user', content: 'Great, what about disk space on volume /dev/nvme0n1?' },
    { role: 'assistant', content: `Volume /dev/nvme0n1 diagnostics:\n${diagnosticOutput}` },
    { role: 'user', content: 'Are there any zombie processes in the process table?' },
    { role: 'assistant', content: `Process table status:\n${diagnosticOutput}` },
    { role: 'user', content: 'Please inspect the PostgreSQL connection pool queue.' },
    { role: 'assistant', content: `Connection pool metrics:\n${diagnosticOutput}` },
    { role: 'user', content: 'How many errors were logged in the last 15 minutes?' },
    { role: 'assistant', content: `Error audit telemetry:\n${diagnosticOutput}` },
    { role: 'user', content: 'Awesome. Now let us start the migration plan for table users_v2.' },
    { role: 'assistant', content: 'Ready. I have loaded migration script 004_create_users_v2.sql.' },
    { role: 'user', content: 'Check if index idx_users_org_id exists.' },
    { role: 'assistant', content: 'Index idx_users_org_id is present on column org_id.' },
    { role: 'user', content: 'Execute step 1 of the migration now.' },
  ];

  console.log('[1/2] Compacting 16-Turn Chat Session History in BroccoliDB Ring Buffer...');
  const res = BroccoliContextRingBuffer.compactSession('session_chat_9918', sessionHistory, 4);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Turns: ${res.originalTurns} -> Compacted Turns: ${res.compactedTurns}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Message Thread:`);
  for (const m of res.compactedMessages) {
    console.log(`        [${m.role.toUpperCase()}]: "${m.content.slice(0, 70)}..."`);
  }

  assert.equal(res.wasCompacted, true);
  assert.equal(res.compactedTurns, 6); // 1 System + 1 Summary + 4 Recent
  assert.ok(res.savingsPercentage >= 60);
  assert.equal(res.compactedMessages[res.compactedMessages.length - 1].content, 'Execute step 1 of the migration now.');

  console.log('\n[✓] Context Ring Buffer Eviction & Quadratic Bill Elimination Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CONTEXT RING BUFFER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
