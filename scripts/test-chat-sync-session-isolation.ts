import assert from 'node:assert/strict';
import {
  broccoliChatDb,
  ChatSessionSyncError,
} from '../src/core/broccolidb/BroccoliChatDatabase';
import type { ChatSession } from '../src/components/chat/ChatSidebar';
import type { ChatMessage } from '../src/components/chat/ChatMessageItem';

const now = Date.now();
const sessions: ChatSession[] = [
  { id: 'session_a', title: 'A', createdAt: now, updatedAt: now, modelId: 'gpt-5.6-sol' },
  { id: 'session_b', title: 'B', createdAt: now, updatedAt: now, modelId: 'gpt-5.6-sol' },
];
const messages = new Map<string, ChatMessage[]>([
  ['session_a', [{ id: 'msg_a', role: 'user', content: 'alpha', createdAt: now }]],
  ['session_b', [{ id: 'msg_b', role: 'user', content: 'beta', createdAt: now }]],
]);

for (const session of sessions) broccoliChatDb.saveSession(session, false);
const internals = broccoliChatDb as any;
for (const session of sessions) internals.pendingSyncSessions.set(session.id, session);
for (const [sessionId, sessionMessages] of messages) {
  internals.pendingSyncMessages.set(sessionId, sessionMessages);
}

const originalFetch = globalThis.fetch;
const originalWindow = (globalThis as any).window;
const writes: any[] = [];
const readHeaders: Array<Record<string, string>> = [];
let failNextSessionAWrite = false;

(globalThis as any).window = {};
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const method = init?.method || 'GET';
  if (method === 'POST') {
    const write = JSON.parse(String(init?.body || '{}'));
    writes.push(write);
    if (failNextSessionAWrite && write.session?.id === 'session_a') {
      failNextSessionAWrite = false;
      return new Response(null, { status: 503 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  readHeaders.push((init?.headers || {}) as Record<string, string>);
  const url = String(input);
  const activeSessionId = new URL(url, 'https://galx.test').searchParams.get('activeSessionId') || undefined;
  return new Response(JSON.stringify({
    success: true,
    sessions: [],
    activeSessionId,
    messages: [],
  }), {
    status: 200,
    headers: { ETag: `"etag-${activeSessionId}"` },
  });
}) as typeof fetch;

try {
  await broccoliChatDb.flushPendingSync();
  assert.equal(writes.length, 2, 'Dirty sessions must be flushed as separate bundles.');

  for (const write of writes) {
    assert.ok(write.session?.id, 'Every message bundle must carry its owning session.');
    assert.ok(
      write.messages.every((message: ChatMessage) => message.id.endsWith(write.session.id.slice(-1))),
      `Bundle ${write.session.id} contains a message from another session.`
    );
  }

  failNextSessionAWrite = true;
  internals.pendingSyncMessages.set('session_a', messages.get('session_a'));
  await assert.rejects(
    () => broccoliChatDb.ensureSessionSynced('session_a'),
    ChatSessionSyncError,
    'Inference must fail closed when its session cannot reach durable authority.'
  );
  assert.ok(internals.pendingSyncSessions.has('session_a'), 'A failed bundle must be requeued independently.');
  assert.ok(internals.pendingSyncMessages.has('session_a'), 'Failed messages must remain attached to their session.');
  await broccoliChatDb.flushPendingSync();
  assert.ok(!internals.pendingSyncSessions.has('session_a'), 'A successful retry must drain the session bundle.');

  await broccoliChatDb.syncWithCloud('session_a');
  await broccoliChatDb.syncWithCloud('session_b');
  assert.equal(readHeaders[0]['If-None-Match'], undefined);
  assert.equal(
    readHeaders[1]['If-None-Match'],
    undefined,
    'An ETag for session A must never suppress the session B projection.'
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
}

console.log('Chat sync session isolation tests passed.');
