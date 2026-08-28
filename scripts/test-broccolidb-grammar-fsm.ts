import assert from 'node:assert/strict';
import { BroccoliGrammarFSM } from '../src/core/broccolidb/BroccoliGrammarFSM';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB GRAMMAR FSM & REGEX OUTPUT CONSTRAINER');
  console.log('======================================================================\n');

  BroccoliGrammarFSM.clear();

  // 1. Evaluate Ceiling for UUID Extraction
  const promptUUID = 'Extract uuid from invoice payload #991823';
  console.log('[1/3] Evaluating Dynamic Token Ceiling for UUID Extraction...');
  const ceilingRes = BroccoliGrammarFSM.evaluateGrammarCeiling(promptUUID, 100);

  console.log(`      - Is Clamped: ${ceilingRes.isClamped}`);
  console.log(`      - Detected Pattern: ${ceilingRes.patternType}`);
  console.log(`      - Clamped Max Tokens: ${ceilingRes.clampedMaxTokens} tokens`);

  assert.equal(ceilingRes.isClamped, true);
  assert.equal(ceilingRes.patternType, 'UUID');
  assert.equal(ceilingRes.clampedMaxTokens, 12);

  // 2. Simulate raw conversational LLM output and extract strict regex match
  const rawModelOutput = 'Here is the extracted invoice identifier: 550e8400-e29b-41d4-a716-446655440000 (valid UUID v4).';
  console.log('\n[2/3] Extracting Exact Regex Slice in Sub-0.01ms Memory...');
  const extractRes = BroccoliGrammarFSM.extractPatternSlice('UUID', rawModelOutput, 50);

  console.log(`      - Was Constrained: ${extractRes.wasConstrained}`);
  console.log(`      - Extracted Value: "${extractRes.extractedValue}"`);
  console.log(`      - Tokens Saved: ${extractRes.tokensSaved} tokens`);

  assert.equal(extractRes.wasConstrained, true);
  assert.equal(extractRes.extractedValue, '550e8400-e29b-41d4-a716-446655440000');
  assert.ok(extractRes.tokensSaved > 30);

  // 3. Test ISO Date Extraction
  const dateOutput = 'Timestamp recorded at: 2026-08-28T03:45:00Z during sync.';
  console.log('\n[3/3] Extracting ISO-8601 Date Pattern...');
  const dateRes = BroccoliGrammarFSM.extractPatternSlice('ISO_DATE', dateOutput, 40);

  console.log(`      - Extracted ISO Date: "${dateRes.extractedValue}"`);
  assert.equal(dateRes.extractedValue, '2026-08-28T03:45:00Z');

  console.log('\n[✓] Grammar FSM & Strict Regex Token Constraining Verified.');

  console.log('\n======================================================================');
  console.log('   ALL GRAMMAR FSM TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
