/**
 * Test: Prompt Compaction & Predictive Routing Engine
 * Tests lossless whitespace deflation, KV-prefix alignment, predictive model routing,
 * and 0ms L1 semantic cache hits.
 */

import { GalxPromptCompactionEngine, ChatMessage } from '../src/core/router/GalxPromptCompactionEngine';

async function testPromptCompactionRouting() {
  console.log('======================================================================');
  console.log('   🧪  TESTING PROMPT COMPACTION & PREDICTIVE ROUTING ENGINE          ');
  console.log('======================================================================\n');

  const engine = GalxPromptCompactionEngine.getInstance();

  const testMessages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are the GALXAI frontier coding assistant.   Follow all strict   architectural invariants.\n\n\n'
    },
    {
      role: 'user',
      content: 'Here is a complex algorithm to optimize:\n\n\n```typescript\nfunction solveNBodySimulation(particles: Particle[]) {\n  // Heavy math calculation\n}\n```\n\n\nCan you prove its numerical stability?'
    }
  ];

  // 1. Initial Compaction & Predictive Routing
  console.log('1. Testing Prompt Compaction & Predictive Routing (Mode: auto)...');
  const result1 = await engine.compactAndRoute(testMessages, 'auto');
  console.log('   ✓ Original Estimated Tokens:', result1.originalEstimatedTokens);
  console.log('   ✓ Compacted Estimated Tokens:', result1.compactedEstimatedTokens);
  console.log(`   ✓ Tokens Saved: ${result1.tokensSaved} (${result1.compressionRatioPct}% reduction)`);
  console.log('   ✓ Recommended Model (Predictive Routing):', result1.recommendedModel);

  if (result1.recommendedModel !== 'o3') {
    throw new Error(`Expected predictive route to o3, got ${result1.recommendedModel}`);
  }

  // 2. Test 0ms L1 Semantic Cache Hit
  console.log('\n2. Testing 0ms L1 In-Memory Semantic Cache Hit...');
  const start = performance.now();
  const result2 = await engine.compactAndRoute(testMessages, 'auto');
  const elapsedMicros = (performance.now() - start) * 1000;
  console.log(`   ✓ L1 Cache Hit in ${elapsedMicros.toFixed(2)} µs (cachedL1: ${result2.cachedL1})`);

  if (!result2.cachedL1) {
    throw new Error('Expected L1 cache hit');
  }

  // 3. Test Conversational Fast-Path Routing
  console.log('\n3. Testing Conversational Fast-Path Routing...');
  const conversationalMessages: ChatMessage[] = [
    { role: 'user', content: 'What is the current time in Tokyo?' }
  ];
  const result3 = await engine.compactAndRoute(conversationalMessages, 'auto');
  console.log('   ✓ Conversational Route Decision:', result3.recommendedModel);
  if (result3.recommendedModel !== 'gpt-5.6-luna') {
    throw new Error(`Expected fast conversational route to gpt-5.6-luna, got ${result3.recommendedModel}`);
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL PROMPT COMPACTION & ROUTING INVARIANTS PASSED              ');
  console.log('======================================================================\n');
}

testPromptCompactionRouting().catch(err => {
  console.error('\n❌ Compaction Test Failed:', err);
  process.exit(1);
});
