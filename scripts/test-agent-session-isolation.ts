import assert from 'node:assert/strict';
import { AgentRuntime } from '../src/sdk/agent';
import { ConversationThread } from '../src/sdk/thread';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../src/core/contracts/GalxContracts';

const agentRequests: ChatCompletionRequest[] = [];
const completionFor = (request: ChatCompletionRequest): ChatCompletionResponse => {
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  const content = typeof lastUser?.content === 'string' ? `reply:${lastUser.content}` : 'reply';
  return {
    id: 'completion_test',
    object: 'chat.completion',
    created: 1,
    model: request.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    conversation_id: request.conversation_id,
    turn_id: request.turn_id,
  };
};

const completions = {
  async create(request: ChatCompletionRequest) {
    agentRequests.push(structuredClone(request));
    return completionFor(request);
  },
};

const runtime = new AgentRuntime(completions as any, { maxSteps: 2 });
const sessionA = runtime.startSession();
const sessionB = runtime.startSession();

assert.notEqual(sessionA.sessionId, sessionB.sessionId, 'One runtime must issue independent logical session IDs.');
await sessionA.run('alpha');
await sessionB.run('beta');
await sessionA.run('alpha-follow-up');

assert.equal(agentRequests[0].session_mode, 'new');
assert.equal(agentRequests[1].session_mode, 'new');
assert.equal(agentRequests[2].session_mode, 'continue');
assert.equal(agentRequests[0].conversation_id, sessionA.sessionId);
assert.equal(agentRequests[2].conversation_id, sessionA.sessionId);
assert.equal(agentRequests[1].conversation_id, sessionB.sessionId);
assert.ok(!JSON.stringify(agentRequests[1].messages).includes('alpha'), 'Session B must not receive session A history.');
assert.ok(!JSON.stringify(agentRequests[2].messages).includes('beta'), 'Session A must not receive session B history.');
const resumedA = runtime.resumeSession(sessionA.export());
assert.equal(resumedA.sessionId, sessionA.sessionId, 'Export/import must preserve the durable agent session identity.');
assert.deepEqual(resumedA.getHistory(), sessionA.getHistory(), 'Export/import must preserve only that session history.');

await runtime.run('one-off');
assert.equal(agentRequests[3].session_mode, 'stateless', 'Bare runtime calls remain zero-retention/stateless by default.');
assert.equal(agentRequests[3].conversation_id, undefined);

let releaseGatedCompletion!: () => void;
const gate = new Promise<void>((resolve) => { releaseGatedCompletion = resolve; });
const gatedRuntime = new AgentRuntime({
  async create(request: ChatCompletionRequest) {
    await gate;
    return completionFor(request);
  },
} as any);
const serializedSession = gatedRuntime.startSession();
const activeTurn = serializedSession.run('first');
await assert.rejects(
  () => serializedSession.run('overlap'),
  /already has an active turn/,
  'One logical session must reject overlapping mutation authority.'
);
releaseGatedCompletion();
await activeTurn;

const threadRequests: ChatCompletionRequest[] = [];
const fakeClient = {
  chat: {
    completions: {
      async create(request: ChatCompletionRequest) {
        threadRequests.push(structuredClone(request));
        return completionFor(request);
      },
    },
  },
};
const threadA = new ConversationThread(fakeClient as any);
const threadB = new ConversationThread(fakeClient as any);
await threadA.reply('thread-alpha');
await threadB.reply('thread-beta');
await threadA.reply('thread-alpha-follow-up');

assert.notEqual(threadA.sessionId, threadB.sessionId);
assert.equal(threadRequests[0].session_mode, 'new');
assert.equal(threadRequests[2].session_mode, 'continue');
assert.ok(!JSON.stringify(threadRequests[1].messages).includes('thread-alpha'));
assert.ok(!JSON.stringify(threadRequests[2].messages).includes('thread-beta'));

const previousThreadId = threadA.sessionId;
const threadSnapshot = threadA.export();
const importedThread = new ConversationThread(fakeClient as any).import(threadSnapshot);
assert.equal(importedThread.sessionId, threadA.sessionId, 'Thread snapshots must preserve logical identity.');
threadA.clear();
assert.notEqual(threadA.sessionId, previousThreadId, 'Clearing context must rotate durable identity.');

console.log('Agent session isolation tests passed (one client, multiple independent sessions).');
