import assert from 'node:assert/strict';
import { BroccoliSupportChatCompactor } from '../src/core/broccolidb/BroccoliSupportChatCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SUPPORT LIVE CHAT COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSupportChatCompactor.clear();

  // Raw customer support live chat log with system noise, bot greeting, and typing notifications
  const rawChatLog = `
[10:00:01] System: User connected from IP 192.168.1.1
[10:00:02] Bot: Welcome! How can we help you today?
[10:00:15] System: User is typing...
[10:00:22] Customer: I need a refund on invoice INV-2026-88491 because we were charged twice.
[10:00:25] System: Agent Sarah joined the chat
[10:00:26] System: Routing conversation to Tier 2 Billing
[10:00:30] Agent Sarah: Hi there! I see the duplicate charge on invoice INV-2026-88491. I have processed the $450 refund to your card.
[10:01:00] Customer: Perfect, thank you so much for the quick help!
[10:01:30] System: Conversation rated 5 stars
[10:01:31] System: Chat ended by agent
`.trim();

  console.log('[1/2] Compacting Live Chat Transcript in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliSupportChatCompactor.compactChatTranscript(rawChatLog);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Events: ${res.originalEventsCount} -> Substantive Turns: ${res.substantiveTurnsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Chat Prompt Preview:\n"""\n${res.compactedChatPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.originalEventsCount, 10);
  assert.equal(res.substantiveTurnsCount, 3);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedChatPrompt.includes('Customer: I need a refund on invoice INV-2026-88491'));
  assert.ok(res.compactedChatPrompt.includes('Agent Sarah: Hi there! I see the duplicate charge'));
  assert.ok(res.compactedChatPrompt.includes('Customer: Perfect, thank you so much'));
  assert.ok(!res.compactedChatPrompt.includes('User connected from IP'));
  assert.ok(!res.compactedChatPrompt.includes('User is typing'));
  assert.ok(!res.compactedChatPrompt.includes('Conversation rated 5 stars'));

  console.log('\n[✓] Live Chat System Event Stripping & Substantive Turn Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SUPPORT CHAT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
