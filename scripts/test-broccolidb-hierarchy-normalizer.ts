import assert from 'node:assert/strict';
import { BroccoliSystemHierarchyNormalizer, PromptHierarchyLayers } from '../src/core/broccolidb/BroccoliSystemHierarchyNormalizer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SYSTEM HIERARCHY NORMALIZER & LAYER DE-CONFLICTER');
  console.log('======================================================================\n');

  BroccoliSystemHierarchyNormalizer.clear();

  const layers: PromptHierarchyLayers = {
    globalSystemPrompt: `
# GLOBAL SAFETY & PROTOCOL
- Always maintain enterprise data privacy and confidentiality.
- Provide concise, fact-based answers with zero polite fluff.
- Respond in JSON when requested.
`,
    departmentSystemPrompt: `
# CUSTOMER SUPPORT DEPARTMENT GUIDELINES
- Always maintain enterprise data privacy and confidentiality.
- Provide concise, fact-based answers with zero polite fluff.
- Look up customer orders in the Stripe API before replying.
`,
    workspaceCustomInstructions: `
# WORKSPACE INSTRUCTIONS
- Provide concise, fact-based answers with zero polite fluff.
- Default tone should be professional and empathetic.
`,
    taskInstructions: `
# TICKET AUTO-RESPONDER TASK
- Answer the customer ticket based on context.
`,
  };

  console.log('[1/2] Normalizing 4 Hierarchical System Prompt Layers...');
  const result = BroccoliSystemHierarchyNormalizer.normalizeHierarchy(layers);

  console.log(`      - Was Normalized: ${result.wasNormalized}`);
  console.log(`      - Original Tokens: ${result.originalTokens} -> Normalized: ${result.normalizedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Canonical Merged Prompt:\n"""\n${result.canonicalMergedSystemPrompt}\n"""`);

  assert.equal(result.wasNormalized, true);
  assert.ok(result.savingsPercentage >= 20);

  // Assert duplicate directives only appear once
  const occurrences = (result.canonicalMergedSystemPrompt.match(/Provide concise, fact-based answers with zero polite fluff/g) || []).length;
  assert.equal(occurrences, 1);

  console.log('\n[✓] System Hierarchy Layer De-Conflicting & Normalization Verified.');

  console.log('\n======================================================================');
  console.log('   ALL HIERARCHY NORMALIZER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
