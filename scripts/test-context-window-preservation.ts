/**
 * Test: Context Window Preservation & Attention Anchor Engine
 * Tests atomic turn-pair slicing, tool invariant preservation,
 * and lost-in-the-middle attention anchor hoisting.
 */

import { GalxContextWindowPreservationEngine, PreservedMessage } from '../src/core/router/GalxContextWindowPreservationEngine';

async function testContextWindowPreservation() {
  console.log('======================================================================');
  console.log('   🧪  TESTING CONTEXT WINDOW PRESERVATION & ATTENTION ANCHORS        ');
  console.log('======================================================================\n');

  const engine = GalxContextWindowPreservationEngine.getInstance();

  const mockMessages: PreservedMessage[] = [
    { role: 'system', content: 'You are an AI platform kernel with strict invariant enforcement.' },
    { role: 'user', content: 'Historical turn 1: Old request from 2 hours ago.' },
    { role: 'assistant', content: 'Historical turn 1 answer.' },
    { role: 'user', content: 'Turn 2: Run database schema verification.' },
    {
      role: 'assistant',
      content: 'Calling tool to verify schema...',
      tool_calls: [{ id: 'call_99', function: { name: 'verify_schema' } }]
    },
    {
      role: 'tool',
      tool_call_id: 'call_99',
      content: '{"status": "ok", "tables": 64}'
    },
    { role: 'assistant', content: 'Schema is fully verified across 64 tables.' },
    { role: 'user', content: 'Latest turn: Deploy the changes now.' }
  ];

  // 1. Test Atomic Turn-Pair Slicing Under Tight Budget
  console.log('1. Testing Atomic Turn-Pair Slicing (Preserving Tool Invariants)...');
  const budgetLimited = engine.preserveAtomicTurnPairs(mockMessages, 100);
  console.log(`   ✓ Sliced ${mockMessages.length} messages down to ${budgetLimited.length} messages within budget`);

  // Verify that if a tool message is included, its corresponding assistant tool_calls message is also included
  const hasTool = budgetLimited.some(m => m.role === 'tool');
  const hasToolCall = budgetLimited.some(m => m.role === 'assistant' && m.tool_calls);
  if (hasTool !== hasToolCall) {
    throw new Error('Atomic Turn-Pair Invariant Violated: tool response exists without tool_calls assistant message');
  }
  console.log('   ✓ Atomic Turn-Pair Invariant Verified (Tool Call & Result Paired)');

  // 2. Test Lost-in-the-Middle Attention Anchor Hoisting
  console.log('\n2. Testing Lost-in-the-Middle Attention Anchor Hoisting...');
  const assembly = engine.hoistAttentionAnchor(
    mockMessages,
    'Active migration 64 applied with 100% rollback parity',
    ['Cloudflare Edge Only', 'LUMI OpenAI Reasoning Models', '$10/mo flat pricing']
  );

  console.log('   ✓ Assembly Summary:', {
    totalTokens: assembly.totalTokens,
    messagesCount: assembly.messages.length,
    attentionAnchorHoisted: assembly.attentionAnchorHoisted
  });

  if (!assembly.attentionAnchorHoisted) {
    throw new Error('Expected attention anchor to be hoisted');
  }

  // The anchor must be right before the final user instruction
  const secondToLast = assembly.messages[assembly.messages.length - 2];
  if (!secondToLast.content.includes('[ACTIVE WORKING MEMORY & ATTENTION ANCHOR]')) {
    throw new Error('Attention Anchor was not hoisted to the prompt tail before final user message');
  }
  console.log('   ✓ Attention Anchor correctly hoisted to prompt tail (Lost-in-the-Middle bias mitigated)');

  console.log('\n======================================================================');
  console.log('   ✅ ALL CONTEXT WINDOW PRESERVATION INVARIANTS PASSED              ');
  console.log('======================================================================\n');
}

testContextWindowPreservation().catch(err => {
  console.error('\n❌ Context Preservation Test Failed:', err);
  process.exit(1);
});
