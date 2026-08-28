import assert from 'node:assert/strict';
import { BroccoliKVSuffixHoister } from '../src/core/broccolidb/BroccoliKVSuffixHoister';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB KV SUFFIX HOISTER & SEGMENT NORMALIZER');
  console.log('======================================================================\n');

  BroccoliKVSuffixHoister.clear();

  // Create a 1,000-token static system instruction prefix
  const staticPrefix = `
# ENTERPRISE DATA WAREHOUSE AI QUERY AGENT GUIDELINES
You are the primary analytics AI for GALXAI data warehouse.
Analyze the SQL tables and formulate structured data intelligence.
`.repeat(30); // ~1,000 tokens

  // Dynamic user prompt with invariant trailing formatting instructions at the very bottom
  const dynamicPromptWithTrailingRules = `
Query: Calculate total gross profit for Q3 2026 across all EMEA product lines.

Formatting Rules:
Format your response as a markdown table with columns: Region, ProductLine, GrossProfitUsd, MarginPct.
Strictly adhere to ISO-4217 financial currency standards.
Do not include any introductory or concluding remarks.
`;

  console.log('[1/2] Hoisting Trailing Invariant Formatting Suffix into Static System Prefix...');
  const result = BroccoliKVSuffixHoister.hoistSuffixDirectives(staticPrefix, dynamicPromptWithTrailingRules);

  console.log(`      - Was Hoisted: ${result.wasHoisted}`);
  console.log(`      - Original Static Prefix Tokens: ${result.originalPrefixTokens}`);
  console.log(`      - Hoisted Static Prefix Tokens: ${result.hoistedPrefixTokens}`);
  console.log(`      - Eligible for OpenAI 50% KV Cache: ${result.isEligibleForKVCache}`);
  console.log(`      - Cache Key Hash: ${result.cacheKeyHash}`);

  assert.equal(result.wasHoisted, true);
  assert.ok(result.hoistedPrefixTokens > result.originalPrefixTokens);
  assert.equal(result.isEligibleForKVCache, true);
  assert.ok(result.reconstructedPrompt.includes('[Hoisted Formatting Directives]'));

  console.log('\n[✓] Invariant Suffix Hoisting & KV Cache Alignment Verified.');

  console.log('\n======================================================================');
  console.log('   ALL KV SUFFIX HOISTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
