import assert from 'node:assert/strict';
import { BroccoliThinkingCompactor } from '../src/core/broccolidb/BroccoliThinkingCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB REASONING TOKEN COMPACTOR & COT STRIPPER');
  console.log('======================================================================\n');

  BroccoliThinkingCompactor.clear();

  // 1. Test Dynamic Reasoning Effort Resolution for Simple Task
  const simplePrompt = 'Convert this user profile JSON to CSV format: {"name": "Alice"}';
  console.log('[1/2] Resolving Reasoning Effort for Simple Data Formatting Task...');
  const effortRes = BroccoliThinkingCompactor.resolveReasoningEffort(simplePrompt);

  console.log(`      - Assigned reasoning_effort: "${effortRes.reasoningEffort}"`);
  console.log(`      - Estimated Thinking Tokens: ${effortRes.estimatedThinkingTokens} tokens`);
  console.log(`      - Thinking Tokens Saved vs High: ${effortRes.tokensSavedVsHigh} tokens`);

  assert.equal(effortRes.reasoningEffort, 'low');
  assert.equal(effortRes.tokensSavedVsHigh, 2200);

  // 2. Test Chain-of-Thought History Stripping
  const rawModelResponseWithThinking = `
<thinking>
First, let's analyze the customer account structure.
The customer has 3 active subscriptions: Sol, Terra, and Luna.
We need to calculate the sum of MRR = $500 + $200 + $50 = $750.
Let's double-check the billing cycle date... everything is consistent.
Now let's write out the response to the user.
</thinking>

The total active MRR across all 3 customer subscriptions is $750.00.
`;

  console.log('\n[2/2] Stripping Internal <thinking> Block Before Appending to History...');
  const cotRes = BroccoliThinkingCompactor.stripCoTForHistory(rawModelResponseWithThinking);

  console.log(`      - Was Stripped: ${cotRes.wasStripped}`);
  console.log(`      - Original Output Tokens: ${cotRes.originalOutputTokens} -> Clean History Tokens: ${cotRes.cleanHistoryTokens}`);
  console.log(`      - Tokens Saved for Subsequent Agent Turns: ${cotRes.tokensSavedForNextTurn} tokens`);
  console.log(`      - Clean History Text:\n"""\n${cotRes.cleanHistoryText}\n"""`);

  assert.equal(cotRes.wasStripped, true);
  assert.ok(!cotRes.cleanHistoryText.includes('<thinking>'));
  assert.equal(cotRes.cleanHistoryText, 'The total active MRR across all 3 customer subscriptions is $750.00.');
  assert.ok(cotRes.tokensSavedForNextTurn > 50);

  console.log('\n[✓] Reasoning Effort Routing & Chain-of-Thought History Stripping Verified.');

  console.log('\n======================================================================');
  console.log('   ALL THINKING COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
