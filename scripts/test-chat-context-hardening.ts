import assert from 'node:assert/strict';
import {
  ChatRequestValidationError,
  resolveChatIdentity,
  normalizeChatMessages,
  normalizeChatResourceId,
} from '../src/core/chat/GalxChatRequestNormalizer';
import { normalizeStoredChatMessages } from '../src/core/chat/GalxChatPersistenceValidation';
import { GalxElasticContextGovernor } from '../src/core/governor/GalxElasticContextGovernor';
import {
  GalxRollingContextEngine,
  type ChatDocumentChunk,
  type RollingContextMessage,
} from '../src/core/router/GalxRollingContextEngine';
import type { SeatTierEntitlement } from '../src/core/subscription/GalxSeatTierEngine';

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  assertions += 1;
}

function expectValidationError(action: () => unknown, code: string): void {
  assert.throws(action, (error) => {
    assertions += 1;
    return error instanceof ChatRequestValidationError && error.code === code;
  });
}

const normalized = normalizeChatMessages({
  messages: [
    { role: 'user', content: 'Inspect the deployment.' },
    {
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'inspect', arguments: '{}' } }],
    },
    { role: 'tool', tool_call_id: 'call_1', content: '{"healthy":true}' },
    { role: 'assistant', content: 'Deployment is healthy.' },
  ],
});
check(normalized[1].tool_calls?.[0]?.id === 'call_1', 'Assistant tool calls must survive normalization.');
check(normalized[2].tool_call_id === 'call_1', 'Tool result correlation IDs must survive normalization.');
expectValidationError(
  () => normalizeChatMessages({ messages: [{ role: 'tool', tool_call_id: 'missing', content: 'orphan' }] }),
  'orphaned_tool_message'
);
expectValidationError(
  () => normalizeChatMessages({
    messages: [
      { role: 'user', content: 'run' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'call_2' }] },
    ],
  }),
  'incomplete_tool_sequence'
);
check(normalizeChatResourceId('conversation_1:a', 'session_id') === 'conversation_1:a', 'Safe resource IDs should pass.');
expectValidationError(() => normalizeChatResourceId('../escape', 'session_id'), 'invalid_session_id');

const statelessIdentity = resolveChatIdentity({ body: {} });
check(statelessIdentity.mode === 'stateless', 'Requests without identity must be explicitly stateless.');
check(!statelessIdentity.conversationId, 'Stateless requests must not inherit a client-level conversation.');
const newIdentity = resolveChatIdentity({ body: { session_mode: 'new' } });
check(newIdentity.mode === 'new' && newIdentity.conversationId?.startsWith('session_'), 'New mode must issue a secure session ID.');
const continuedIdentity = resolveChatIdentity({
  body: { conversation_id: 'conversation_1', session_mode: 'continue', turn_id: 'turn_1' },
});
check(continuedIdentity.conversationId === 'conversation_1', 'Continue mode must preserve explicit conversation identity.');
check(continuedIdentity.turnId === 'turn_1', 'Explicit turn identity must survive normalization.');
expectValidationError(
  () => resolveChatIdentity({ body: { session_mode: 'continue' } }),
  'missing_conversation_id'
);
expectValidationError(
  () => resolveChatIdentity({
    body: { conversation_id: 'conversation_a' },
    headers: new Headers({ 'X-Galx-Session-Id': 'conversation_b' }),
  }),
  'conflicting_conversation_id'
);
expectValidationError(
  () => resolveChatIdentity({
    body: { conversation_id: 'conversation_a', conversationId: 'conversation_b' },
  }),
  'conflicting_conversation_id'
);
expectValidationError(
  () => resolveChatIdentity({
    body: { session_mode: 'new', sessionMode: 'stateless' },
  }),
  'conflicting_session_mode'
);

const stored = normalizeStoredChatMessages([
  { id: 'msg_1', role: 'user', content: 'hello', createdAt: 1 },
]);
check(stored[0].alternativeContents?.[0] === 'hello', 'Stored message defaults must remain deterministic.');
expectValidationError(
  () => normalizeStoredChatMessages([{ id: 'msg_1', role: 'tool', content: 'bad' }]),
  'invalid_message_role'
);

const entitlement: SeatTierEntitlement = {
  tier: 'developer',
  tierLabel: 'Developer',
  role: 'developer',
  isPriorityUser: false,
  priorityWeight: 1,
  concurrencyLimit: 20,
  maxTokensAllowed: 16_384,
  allowedModels: ['gpt-5.6-sol'],
  deepReasoningAllowed: true,
  spendCapUsd: 25,
  currentSpendUsd: 0,
  creditsIncludedUsd: 5,
  throttleMode: 'hard_stop',
  isCapped: false,
  zdrRequired: false,
  hipaaCompliant: false,
  promptCacheRebatePct: 75,
  cachedAtMs: Date.now(),
};
const governor = GalxElasticContextGovernor.getInstance();
const plan = governor.resolveElasticContext({
  modelId: 'gpt-5.6-sol',
  requestedMaxTokens: 128_000,
  messages: [{ role: 'user', content: 'hello' }],
  entitlement,
});
check(plan.allocatedMaxTokens <= 16_384, 'Output must be capped by the seat entitlement.');
check(
  plan.totalAllocatedTokens <= plan.contextWindowTokens,
  'Prompt, safety margin, and output allocation must fit the effective context window.'
);
check(plan.outputWasClamped, 'The governor should disclose output clamping.');

const oversizedPlan = governor.resolveElasticContext({
  modelId: 'gpt-5.6-sol',
  requestedMaxTokens: 1,
  messages: [{ role: 'user', content: 'x'.repeat(4_500_000) }],
  entitlement,
});
check(!oversizedPlan.fitsInContext, 'An oversized prompt must fail closed.');
check(oversizedPlan.allocatedMaxTokens === 0, 'No output may be allocated to an oversized prompt.');

const rolling = GalxRollingContextEngine.getInstance();
const empty = rolling.buildOptimalRollingContext({ messages: [] });
check(empty.optimizedMessages.length === 0, 'Empty input must not invent a greeting.');

const rollingMessages: RollingContextMessage[] = [
  { role: 'system', content: 'You are a deployment assistant.' },
  { role: 'user', content: 'Initial objective: harden the deployment.' },
  { role: 'assistant', content: 'I will inspect the system.' },
  { role: 'user', content: 'The database must remain tenant isolated.' },
  { role: 'assistant', content: 'Ownership checks are required.' },
  { role: 'user', content: 'Now produce the final verification.' },
];
const rollingResult = rolling.buildOptimalRollingContext({
  messages: rollingMessages,
  userId: 'user_test',
  maxTokenBudget: 2_000,
  recentBufferTurnCount: 2,
});
const rollingAgain = rolling.buildOptimalRollingContext({
  messages: rollingMessages,
  userId: 'user_test',
  maxTokenBudget: 2_000,
  recentBufferTurnCount: 2,
});
const serialized = JSON.stringify(rollingResult.optimizedMessages);
check(!serialized.includes('cache_control'), 'Unsupported cache_control fields must never be emitted.');
check(serialized.includes('prompt_cache_breakpoint'), 'The stable trusted prefix should carry an explicit cache breakpoint.');
check(rollingResult.stableCacheHash === rollingAgain.stableCacheHash, 'Stable cache hashes must be deterministic.');
check(
  !rollingResult.optimizedMessages.some((message) => message.role === 'system' && message.name === 'galx_conversation_memory'),
  'Historical memory must never be elevated to system authority.'
);
check(rollingResult.optimizedTokenEstimate <= 2_000, 'Rolling output must honor the supplied prompt budget.');

const docTable = (rolling as any).docChunksTable as {
  put(id: string, value: ChatDocumentChunk): void;
};
const now = Date.now();
docTable.put('rrf_title', {
  id: 'rrf_title',
  conversationId: 'conv_rrf',
  documentName: 'Atomic Lease Settlement',
  chunkIndex: 0,
  pageStart: 1,
  pageEnd: 1,
  content: 'A concise explanation of request lifecycle behavior.',
  tokenCount: 12,
  createdAt: now,
});
docTable.put('rrf_frequency', {
  id: 'rrf_frequency',
  conversationId: 'conv_rrf',
  documentName: 'Operations Notes',
  chunkIndex: 1,
  pageStart: 2,
  pageEnd: 2,
  content: 'Atomic atomic atomic lease lease settlement appears repeatedly but far apart.',
  tokenCount: 15,
  createdAt: now,
});
const fused = rolling.searchRelevantChunksRRF({
  conversationId: 'conv_rrf',
  query: 'atomic lease settlement',
  limit: 2,
});
check(fused.length === 2, 'RRF should return matching candidates from independent rankings.');
check(new Set(fused.map((chunk) => chunk.id)).size === 2, 'RRF results must be unique.');

console.log(`Chat/context hardening tests passed (${assertions} assertions).`);
