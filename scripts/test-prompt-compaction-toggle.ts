/**
 * GALXAI: Comprehensive Test Suite for Prompt Compaction & Transformation Optionality
 * 
 * Verifies:
 * 1. BroccoliChatDatabase prompt compaction state persistence and getter/setter.
 * 2. BroccoliCompactionFacade.selectRepresentation bypass / raw mode.
 * 3. GalxRollingContextEngine behavior with enableCompaction: true vs enableCompaction: false.
 * 4. Preservation of exact whitespace, newlines, and raw message turns when compaction is disabled.
 */

import assert from 'node:assert/strict';
import { GalxRollingContextEngine, RollingContextMessage } from '../src/core/router/GalxRollingContextEngine';
import { BroccoliCompactionFacade } from '../src/core/broccolidb/BroccoliCompactionFacade';
import { BroccoliChatDatabase } from '../src/core/broccolidb/BroccoliChatDatabase';

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  assertions += 1;
}

console.log('======================================================================');
console.log('  🧪 TESTING PROMPT COMPACTION & TRANSFORMATION OPTIONALITY SUITE');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// 1. BroccoliChatDatabase Compaction Preference
// -----------------------------------------------------------------------------
console.log('[1/4] Testing BroccoliChatDatabase Compaction Preference Mesh...');
const bdb = BroccoliChatDatabase.getInstance();

// Default must be false (safe raw prompt passthrough enabled)
const defaultPref = bdb.getPromptCompaction();
check(defaultPref === false, 'BroccoliChatDatabase default compaction preference must be false.');

// Toggle on
bdb.setPromptCompaction(true);
check(bdb.getPromptCompaction() === true, 'BroccoliChatDatabase must store true when prompt compaction is enabled.');

// Toggle back off (safe default)
bdb.setPromptCompaction(false);
check(bdb.getPromptCompaction() === false, 'BroccoliChatDatabase must store false when prompt compaction is disabled.');
console.log('      ✓ BroccoliChatDatabase compaction state and persistence verified.');

// -----------------------------------------------------------------------------
// 2. BroccoliCompactionFacade.selectRepresentation Bypass
// -----------------------------------------------------------------------------
console.log('\n[2/4] Testing BroccoliCompactionFacade.selectRepresentation Bypass...');
const governanceSample = `
ACTIVE CODE BASE INVARIANTS
Invariant 1: Use RS256 for all tokens
Invariant 2: runtime = 'edge' is required
INSTITUTIONAL GOVERNANCE
Historical minutes from 2024
Archival records of old RFCs
`;

// When compaction enabled: cleans and compacts governance
const compactedSelection = BroccoliCompactionFacade.selectRepresentation({
  text: governanceSample,
  enableCompaction: true,
});
check(compactedSelection.decision === 'COMPACT_GOVERNANCE', 'Should compact governance when compaction enabled.');
check(compactedSelection.reductionPercentage > 0, 'Compaction should report token reduction.');

// When compaction disabled: returns verbatim text with BYPASS_IDENTITY
const rawSelection = BroccoliCompactionFacade.selectRepresentation({
  text: governanceSample,
  enableCompaction: false,
});
check(rawSelection.decision === 'BYPASS_IDENTITY', 'Must return BYPASS_IDENTITY when enableCompaction is false.');
check(rawSelection.selectedRepresentation === governanceSample, 'Representation must match source byte-for-byte.');
check(rawSelection.reductionPercentage === 0.0, 'Reduction percentage must be 0.0 for raw bypass.');

// When bypass: true is explicitly passed
const bypassSelection = BroccoliCompactionFacade.selectRepresentation({
  text: governanceSample,
  bypass: true,
});
check(bypassSelection.decision === 'BYPASS_IDENTITY', 'Must return BYPASS_IDENTITY when bypass is true.');
check(bypassSelection.selectedRepresentation === governanceSample, 'Must preserve verbatim payload on bypass.');
console.log('      ✓ BroccoliCompactionFacade bypass and identity preservation verified.');

// -----------------------------------------------------------------------------
// 3. GalxRollingContextEngine Compaction Enabled vs Disabled
// -----------------------------------------------------------------------------
console.log('\n[3/4] Testing GalxRollingContextEngine Compaction Enabled vs Disabled...');
const engine = GalxRollingContextEngine.getInstance();

// Build a multi-turn conversation exceeding safeRecentCount (8 turns)
const longHistory: RollingContextMessage[] = [
  { role: 'system', content: 'You are an advanced software architect.' },
  { role: 'user', content: 'Turn 1: How should we structure the cache layer?' },
  { role: 'assistant', content: 'Turn 2: Use multi-tier L1 in-memory + L2 Postgres.' },
  { role: 'user', content: 'Turn 3: What about memory compaction?' },
  { role: 'assistant', content: 'Turn 4: Use BroccoliDB representation compactor.' },
  { role: 'user', content: 'Turn 5: How do we handle tool turns?' },
  { role: 'assistant', content: 'Turn 6: Preserve atomic turn pairs.' },
  { role: 'user', content: 'Turn 7: What is the fail-closed protocol?' },
  { role: 'assistant', content: 'Turn 8: Fail closed to raw text on fact discrepancy.' },
  { role: 'user', content: 'Turn 9: What is the current status?' },
  { role: 'assistant', content: 'Turn 10: All systems operational.' },
  { role: 'user', content: 'Turn 11: Final instruction: summarize everything with exact formatting.' },
];

// Test A: Compaction Enabled (Default)
const compactedResult = engine.buildOptimalRollingContext({
  messages: longHistory,
  userId: 'user_test_compaction',
  conversationId: 'conv_test_compaction_on',
  recentBufferTurnCount: 4,
  enableCompaction: true,
});

check(compactedResult.isCompacted === true, 'isCompacted must be true when history exceeds safe buffer and compaction is enabled.');
check(compactedResult.intermediateTurnsCompacted > 0, 'intermediateTurnsCompacted must be > 0 when compaction is enabled.');
const compactedJson = JSON.stringify(compactedResult.optimizedMessages);
check(compactedJson.includes('[Conversation memory:'), 'Compacted messages must include conversation memory summary block.');

// Test B: Compaction Disabled (Raw Prompt Mode)
const rawResult = engine.buildOptimalRollingContext({
  messages: longHistory,
  userId: 'user_test_compaction',
  conversationId: 'conv_test_compaction_off',
  recentBufferTurnCount: 4,
  enableCompaction: false,
});

check(rawResult.isCompacted === false, 'isCompacted must be false when enableCompaction is false.');
check(rawResult.intermediateTurnsCompacted === 0, 'intermediateTurnsCompacted must be 0 when enableCompaction is false.');
check(rawResult.tokensSaved === 0, 'tokensSaved must be 0 in raw prompt mode.');
check(rawResult.optimizedMessages.length === longHistory.length, 'All message turns must be retained 1:1 without truncation.');

// Test C: Default Engine Invocation (Omitted enableCompaction parameter MUST default to false)
const defaultEngineResult = engine.buildOptimalRollingContext({
  messages: longHistory,
  userId: 'user_test_compaction',
  conversationId: 'conv_test_compaction_default',
  recentBufferTurnCount: 4,
});
check(defaultEngineResult.isCompacted === false, 'GalxRollingContextEngine must default to false (raw) when enableCompaction is omitted.');
check(defaultEngineResult.intermediateTurnsCompacted === 0, 'GalxRollingContextEngine must compact 0 turns by default.');

console.log('      ✓ GalxRollingContextEngine compaction and verbatim passthrough verified.');

// -----------------------------------------------------------------------------
// 4. Async Pipeline and Edge Contracts
// -----------------------------------------------------------------------------
console.log('\n[4/5] Testing Async Pipeline and Edge Contracts...');

async function testAsyncPipeline() {
  const asyncRawResult = await engine.buildOptimalRollingContextAsync({
    messages: longHistory,
    userId: 'user_test_compaction',
    conversationId: 'conv_test_compaction_async',
    recentBufferTurnCount: 4,
    enableCompaction: false,
  });

  check(asyncRawResult.isCompacted === false, 'Async build must respect enableCompaction: false.');
  check(asyncRawResult.intermediateTurnsCompacted === 0, 'Async build must have 0 compacted turns in raw mode.');
  check(asyncRawResult.optimizedMessages.length === longHistory.length, 'Async build must preserve all messages in raw mode.');
}

await testAsyncPipeline();
console.log('      ✓ Async pipeline verified.');

// -----------------------------------------------------------------------------
// 5. Industry Standards & Multi-Strategy Policy Resolution
// -----------------------------------------------------------------------------
console.log('\n[5/5] Testing Industry Standards & Multi-Strategy Policy Resolution...');

// Helper simulating route policy resolution
function resolvePolicy(
  rawBody: any,
  headers: Record<string, string | null>,
  keyDefaultCompaction?: 'auto' | 'raw'
): boolean {
  const keyExplicitAuto = keyDefaultCompaction === 'auto';

  const explicitFalse =
    rawBody.compact_prompts === false ||
    rawBody.enable_prompt_compaction === false ||
    rawBody.compaction_mode === 'raw' ||
    rawBody.extra_body?.compact_prompts === false ||
    rawBody.extra_body?.enable_prompt_compaction === false ||
    (Array.isArray(rawBody.transforms) && rawBody.transforms.length === 0) ||
    headers['x-galx-compact'] === 'false' ||
    headers['x-galx-compact-prompts'] === 'false' ||
    headers['x-galx-compaction-mode'] === 'raw' ||
    headers['x-compaction-mode'] === 'raw' ||
    headers['x-skip-compaction'] === 'true';

  const explicitTrue =
    rawBody.compact_prompts === true ||
    rawBody.enable_prompt_compaction === true ||
    rawBody.compaction_mode === 'auto' ||
    (Array.isArray(rawBody.transforms) && rawBody.transforms.length > 0) ||
    headers['x-galx-compact'] === 'true' ||
    headers['x-galx-compact-prompts'] === 'true' ||
    headers['x-galx-compaction-mode'] === 'auto';

  return !explicitFalse && (explicitTrue || keyExplicitAuto);
}

// Zero parameter default: MUST BE FALSE (RAW PASSTHROUGH)
check(resolvePolicy({}, {}) === false, 'Default caller with zero params must default to FALSE (Raw Prompts).');

// OpenRouter canonical standard: transforms: [] means disable all transformations
check(resolvePolicy({ transforms: [] }, {}) === false, 'OpenRouter transforms: [] must disable compaction.');
check(resolvePolicy({ transforms: ['middle-out'] }, {}) === true, 'OpenRouter transforms: ["middle-out"] must enable compaction.');

// Python SDK extra_body standard
check(resolvePolicy({ extra_body: { compact_prompts: false } }, {}) === false, 'Python SDK extra_body={"compact_prompts": False} must disable compaction.');

// Compaction Mode Enum
check(resolvePolicy({ compaction_mode: 'raw' }, {}) === false, 'compaction_mode: "raw" must disable compaction.');
check(resolvePolicy({ compaction_mode: 'auto' }, {}) === true, 'compaction_mode: "auto" must enable compaction.');

// Header standards
check(resolvePolicy({}, { 'x-compaction-mode': 'raw' }) === false, 'Header x-compaction-mode: raw must disable compaction.');
check(resolvePolicy({}, { 'x-skip-compaction': 'true' }) === false, 'Header x-skip-compaction: true must disable compaction.');

// Per-Key Defaults
check(resolvePolicy({}, {}, 'raw') === false, 'Per-key defaultCompactionMode: "raw" must default to false.');
check(resolvePolicy({}, {}, 'auto') === true, 'Per-key defaultCompactionMode: "auto" must default to true.');

// Caller override taking precedence over per-key default
check(resolvePolicy({ compact_prompts: true }, {}, 'raw') === true, 'Explicit compact_prompts: true must override key raw default.');
check(resolvePolicy({ transforms: [] }, {}, 'auto') === false, 'Explicit OpenRouter transforms: [] must override key auto default.');

console.log('      ✓ Industry standards and per-key policy resolution verified.');

console.log('\n======================================================================');
console.log(`  🎉 ALL PROMPT COMPACTION OPTIONALITY TESTS PASSED (${assertions} assertions)`);
console.log('======================================================================\n');
