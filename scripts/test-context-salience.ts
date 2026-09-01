/**
 * Test: Context Salience & Working Memory Mesh
 * Tests information-theoretic salience scoring, conversational filler damping,
 * and stabilized KV-prefix context pyramid assembly.
 */

import { GalxContextSalienceEngine } from '../src/core/context/GalxContextSalienceEngine';

async function testContextSalience() {
  console.log('======================================================================');
  console.log('   🧪  TESTING CONTEXT SALIENCE & WORKING MEMORY PYRAMID             ');
  console.log('======================================================================\n');

  const engine = GalxContextSalienceEngine.getInstance();

  // 1. Test High-Salience Code & Directive Message Scoring
  console.log('1. Scoring High-Salience Directive & Code Message...');
  const highSalienceContent = 'We must enforce the Cloudflare Edge direct routing rule.\n```typescript\nexport const shard = "cloudflare-edge-iad";\n```';
  const score1 = engine.scoreMessage('msg_sal_1', 'user', highSalienceContent);
  console.log('   ✓ High-Salience Score:', score1.salienceScore, `(Entities: ${score1.entityCount})`);
  if (score1.salienceScore < 0.7) {
    throw new Error('Expected high salience score for imperative directive with code block');
  }

  // 2. Test Low-Salience Conversational Filler Damping
  console.log('\n2. Scoring Low-Salience Conversational Filler Message...');
  const lowSalienceContent = 'ok thanks!';
  const score2 = engine.scoreMessage('msg_sal_2', 'user', lowSalienceContent);
  console.log('   ✓ Low-Salience Score:', score2.salienceScore);
  if (score2.salienceScore > 0.3) {
    throw new Error('Expected low salience score for filler message');
  }

  // 3. Test Stabilized KV-Cache Prefix Pyramid Assembly
  console.log('\n3. Testing Stabilized Context Pyramid Assembly...');
  const pyramid = engine.assembleStabilizedPyramid(
    'System prompt for enterprise AI gateway.',
    ['Rule 1: Always fail-closed on unverified balances.', 'Rule 2: Cloudflare Edge exclusivity.'],
    [
      { id: 'h1', role: 'user', content: 'Turn 1: Initial question.' },
      { id: 'h2', role: 'assistant', content: 'Turn 1: Response.' },
      { id: 'h3', role: 'user', content: highSalienceContent },
      { id: 'h4', role: 'user', content: lowSalienceContent }
    ]
  );

  console.log('   ✓ Assembled Pyramid:', {
    totalTokens: pyramid.totalTokens,
    messagesCount: pyramid.messages.length,
    prefixHitGuaranteed: pyramid.prefixHitGuaranteed,
    salienceAverage: pyramid.salienceAverage
  });

  if (!pyramid.prefixHitGuaranteed || pyramid.messages[0].role !== 'system') {
    throw new Error('Failed to assemble stabilized KV-cache prefix pyramid');
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL CONTEXT SALIENCE & PYRAMID INVARIANTS PASSED               ');
  console.log('======================================================================\n');
}

testContextSalience().catch(err => {
  console.error('\n❌ Context Salience Test Failed:', err);
  process.exit(1);
});
