import assert from 'node:assert/strict';
import { BroccoliTemplateOptimizer } from '../src/core/broccolidb/BroccoliTemplateOptimizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PROMPT TEMPLATE AST OPTIMIZER & DEAD BRANCH PRUNER');
  console.log('======================================================================\n');

  BroccoliTemplateOptimizer.clear();

  const rawTemplate = `
You are the enterprise system assistant for {{companyName}}.

{{#if isEnterprise}}
[Enterprise SLA Enabled]
Priority Tier: Tier 1
Dedicated Compute Shard: {{shardId}}
{{else}}
[Standard Tier]
Rate Limits: 60 req/min
{{/if}}

Customer Context:
{{customerPayload}}

Please assist the user.
`;

  console.log('[1/2] Compiling and Rendering Template with Dead-Branch Pruning...');
  const result = BroccoliTemplateOptimizer.renderTemplate('customer_support_template', rawTemplate, {
    companyName: 'GALXAI Technologies',
    isEnterprise: true,
    shardId: 'shard_us_east_44',
    customerPayload: { id: 'cust_8819', plan: 'enterprise', mrr: 12000 },
  });

  console.log(`      - Was Optimized: ${result.wasOptimized}`);
  console.log(`      - Rendered Output:\n"""\n${result.renderedText}\n"""`);
  console.log(`      - Original Tokens: ${result.originalTokens} -> Optimized: ${result.optimizedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasOptimized, true);
  assert.ok(result.renderedText.includes('[Enterprise SLA Enabled]'));
  assert.ok(!result.renderedText.includes('[Standard Tier]')); // Dead branch pruned!
  assert.ok(result.renderedText.includes('{"id":"cust_8819","plan":"enterprise","mrr":12000}')); // Compact JSON!

  console.log('\n[✓] Prompt Template AST Optimization & Dead Branch Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TEMPLATE OPTIMIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
