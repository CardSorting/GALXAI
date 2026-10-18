import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invokeNova } from '../src/lib/nova/inference';
import { NovaError, type NovaAccess } from '../src/lib/nova/contract';
const token = 'galx_connect_at_' + 'a'.repeat(43);
const request = (body: unknown = { messages: [{ role: 'user', content: 'Create something.' }] }, headers: Record<string,string> = {}, signal?: AbortSignal) => new Request('https://nova.test/v1/inference', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'request_0123456789', ...headers }, body: JSON.stringify(body), signal });
function access(deny?: NovaError) { const states: string[] = []; let admits = 0; const impl: NovaAccess = { admit: async () => { admits++; if (deny) throw deny; return { id: 'public-request', userId: 'owner', grantId: 'grant' }; }, finish: async (_id, state) => { states.push(state); } }; return { impl, states, admits: () => admits }; }
const completion = () => Response.json({ id: 'INTERNAL_JOB', model: 'PRIVATE_MODEL', pool: 'PRIVATE_POOL', usage: { secret: 'SECRET' }, choices: [{ index: 4, message: { role: 'assistant', content: 'A small project.', reasoning_content: 'PRIVATE_REASONING' }, finish_reason: 'stop', private: 'SECRET' }] }, { headers: { 'X-Upstream-Key': 'PRIVATE_KEY' } });
test('no identity, malformed input, account JWT, or unsupported operations can dispatch', async () => {
  let dispatches = 0; const a = access(); const run = async () => { dispatches++; return completion(); };
  for (const r of [request({}, { Authorization: '' }), request({}, { Authorization: 'Bearer eyJaccount.session.jwt' }), request({ messages: [], publish: true }), request({ messages: [{ role: 'tool', content: 'bad' }] }), request({ messages: [{ role: 'user', content: 'fine', user_id: 'other' }] }), request({ messages: [{ role: 'user', content: 'fine' }], max_tokens: 100_000 })]) assert([400,401].includes((await invokeNova(r, 'https://nova.test', a.impl, run)).status));
  assert.equal(dispatches, 0); assert.equal(a.admits(), 0);
});
test('permission, entitlement, capacity, storage failure and duplicate work are distinct and never dispatch', async () => {
  for (const e of [new NovaError('invalid_token', 401), new NovaError('inference_access_required', 403), new NovaError('service_busy', 503), new NovaError('request_already_submitted', 409, 'unknown')]) {
    const a = access(e); let dispatches = 0;
    const r = await invokeNova(request(), 'https://nova.test', a.impl, async () => { dispatches++; return completion(); });
    assert.equal(r.status, e.status); assert.equal((await r.json()).error.code, e.code); assert.equal(dispatches, 0);
  }
  const r = await invokeNova(request(), 'https://nova.test', { admit: async () => { throw new Error('DATABASE_SECRET'); }, finish: async () => {} }, async () => completion());
  assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /DATABASE_SECRET/);
});
test('nonstreaming response rebuilds the allowlist and records completion once', async () => {
  const a = access(); const r = await invokeNova(request(), 'https://nova.test', a.impl, async () => completion());
  assert.equal(r.status, 200); assert.equal(r.headers.get('x-upstream-key'), null);
  const text = await r.text(); assert.doesNotMatch(text, /PRIVATE|INTERNAL|SECRET|reasoning|usage/);
  assert.equal(JSON.parse(text).model, 'galx-nova'); assert.equal(JSON.parse(text).id, 'public-request'); assert.deepEqual(a.states, ['completed']);
});
test('unknown execution is retained and never automatically replayed', async () => {
  const a = access(); let calls = 0;
  const r = await invokeNova(request(), 'https://nova.test', a.impl, async () => { calls++; throw new Error('PRIVATE_UPSTREAM_FAILURE'); });
  assert.equal(r.status, 503); assert.equal((await r.json()).error.execution_state, 'unknown'); assert.equal(calls, 1); assert.deepEqual(a.states, ['unknown']);
});
test('known non-admission returns a capacity state without invalidating authorization', async () => {
  const a = access(); const r = await invokeNova(request(), 'https://nova.test', a.impl, async () => { throw new NovaError('service_busy', 503); });
  assert.equal(r.status, 503); assert.equal(r.headers.get('www-authenticate'), null); assert.equal((await r.json()).error.execution_state, 'not_accepted'); assert.deepEqual(a.states, ['not_accepted']);
});
function sse(frames: unknown[], done = true) { return new Response(frames.map(v => `data: ${JSON.stringify(v)}\n\n`).join('') + (done ? 'data: [DONE]\n\n' : ''), { headers: { 'Content-Type': 'text/event-stream', 'X-Private-Header': 'secret' } }); }
const chunk = { model: 'PRIVATE_MODEL', id: 'INTERNAL_JOB', choices: [{ delta: { role: 'assistant', content: 'Hello.', reasoning_content: 'PRIVATE_REASONING' }, finish_reason: 'stop', secret: 'SECRET' }], usage: { SECRET: 1 } };
test('SSE re-encodes allowlisted content and strips upstream identifiers, headers and extra fields', async () => {
  const a = access(); const r = await invokeNova(request({ messages: [{ role: 'user', content: 'Hi' }], stream: true }), 'https://nova.test', a.impl, async () => sse([chunk]));
  const text = await r.text(); assert.match(text, /Hello/); assert.match(text, /\[DONE\]/); assert.doesNotMatch(text, /PRIVATE|INTERNAL|SECRET|reasoning|usage/); assert.equal(r.headers.get('x-private-header'), null); assert.deepEqual(a.states, ['completed']);
});
test('truncated, erroneous and false-success SSE end honestly without a DONE marker', async () => {
  for (const response of [sse([chunk], false), sse([{ error: { message: 'PRIVATE_ERROR', execution_state: 'failed' } }]), sse([])]) {
    const a = access(); const r = await invokeNova(request({ messages: [{ role: 'user', content: 'Hi' }], stream: true }), 'https://nova.test', a.impl, async () => response);
    const text = await r.text(); assert.match(text, /outcome_unconfirmed/); assert.doesNotMatch(text, /PRIVATE|\[DONE\]/); assert.deepEqual(a.states, ['unknown']);
  }
});
test('JSON clients validate the original stream and cannot inherit a fabricated default finish reason', async () => {
  const good = access();
  const completed = await invokeNova(request(), 'https://nova.test', good.impl, async () => sse([chunk]));
  assert.equal(completed.status, 200); assert.equal(completed.headers.get('content-type'), 'application/json');
  const body = await completed.text(); assert.equal(JSON.parse(body).choices[0].message.content, 'Hello.');
  assert.doesNotMatch(body, /PRIVATE|INTERNAL|SECRET|reasoning|usage/); assert.deepEqual(good.states, ['completed']);
  for (const response of [sse([]), sse([{ choices: [{ delta: { content: 'Unconfirmed.' }, finish_reason: null }] }]), sse([chunk], false)]) {
    const a = access();
    const r = await invokeNova(request(), 'https://nova.test', a.impl, async () => response);
    assert.equal(r.status, 502); assert.equal((await r.json()).error.execution_state, 'unknown');
    assert.deepEqual(a.states, ['unknown']);
  }
});
test('cancellation propagates to execution and keeps an unknown outcome', async () => {
  const a = access(); let cancelled = false; let signal: AbortSignal;
  const source = new ReadableStream<Uint8Array>({ pull(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"part"},"finish_reason":null}]}\n\n')); }, cancel() { cancelled = true; } });
  const r = await invokeNova(request({ messages: [{ role: 'user', content: 'Hi' }], stream: true }), 'https://nova.test', a.impl, async (_i, _a, s) => { signal = s; return new Response(source, { headers: { 'Content-Type': 'text/event-stream' } }); });
  const reader = r.body!.getReader(); await reader.read(); await reader.cancel(); assert(cancelled); assert(signal!.aborted); assert.deepEqual(a.states, ['unknown']);
});

function deferred<T = void>() { let resolve!: (value: T | PromiseLike<T>) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function within<T>(value:Promise<T>,milliseconds=200):Promise<T>{
  let timer:ReturnType<typeof setTimeout>;
  try{return await Promise.race([value,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Terminal response waited for upstream cancellation')),milliseconds);})]);}
  finally{clearTimeout(timer!);}
}
test('terminal error closes after persistence even if upstream cancellation never acknowledges',async()=>{
  const a=access(),cleanup=deferred();let cancelled=false,dispatches=0,hostWork!:Promise<void>;
  const source=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('data: {"error":{"message":"PRIVATE_DIAGNOSTIC"}}\n\n'));},cancel(){cancelled=true;return cleanup.promise;}});
  try{
    const response=await invokeNova(request({messages:[{role:'user',content:'Hello'}],stream:true}),'https://nova.test',a.impl,async()=>{dispatches++;return new Response(source,{headers:{'Content-Type':'text/event-stream'}});},work=>{hostWork=work;});
    const body=await within(response.text());await within(hostWork);
    assert.match(body,/outcome_unconfirmed/);assert.doesNotMatch(body,/PRIVATE|\[DONE\]/);assert.deepEqual(a.states,['unknown']);assert(cancelled);assert.equal(dispatches,1);
  }finally{cleanup.resolve();}
});
test('client cancellation persists unknown without waiting for upstream acknowledgement',async()=>{
  const a=access(),cleanup=deferred();let cancelled=false,hostWork!:Promise<void>;
  const source=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"part"},"finish_reason":null}]}\n\n'));},cancel(){cancelled=true;return cleanup.promise;}});
  try{
    const response=await invokeNova(request({messages:[{role:'user',content:'Hello'}],stream:true}),'https://nova.test',a.impl,async()=>new Response(source,{headers:{'Content-Type':'text/event-stream'}}),work=>{hostWork=work;});
    const reader=response.body!.getReader();await reader.read();await within(reader.cancel());await within(hostWork);assert(cancelled);assert.deepEqual(a.states,['unknown']);
  }finally{cleanup.resolve();}
});
const streamRequest = (signal?: AbortSignal) => request({ messages: [{ role: 'user', content: 'Hi' }], stream: true }, {}, signal);
const partialStream = () => new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"part"},"finish_reason":null}]}\n\n')); } }), { headers: { 'Content-Type': 'text/event-stream' } });

test('abort closes a pending public read after persistence even when execution ignores its signal',async()=>{
  const control=new AbortController(),a=access();let hostWork!:Promise<void>,calls=0;
  const response=await invokeNova(streamRequest(control.signal),'https://nova.test',a.impl,async()=>{calls++;return partialStream();},task=>{hostWork=task;});
  const reader=response.body!.getReader();await reader.read();
  const rest=(async()=>{let text='';for(;;){const part=await reader.read();if(part.done)return text;text+=new TextDecoder().decode(part.value);}})();
  try{control.abort();await within(hostWork);const terminal=await within(rest);assert.match(terminal,/outcome_unconfirmed/);assert.doesNotMatch(terminal,/\[DONE\]|PRIVATE/);assert.deepEqual(a.states,['unknown']);assert.equal(calls,1);}
  finally{await reader.cancel();}
});

test('host lifetime is registered before admission and remains pending through terminal persistence', async () => {
  const commit = deferred(), started = deferred(); let registered = false, released = false, writes = 0, hostWork!: Promise<void>;
  const impl: NovaAccess = {
    admit: async () => { assert(registered); return { id: 'original', userId: 'owner', grantId: 'grant' }; },
    finish: async (_id, state) => { writes++; assert.equal(state, 'completed'); started.resolve(); await commit.promise; },
  };
  const response = await invokeNova(streamRequest(), 'https://nova.test', impl, async () => { assert(registered); return sse([chunk]); }, task => { registered = true; hostWork = task; void task.then(() => { released = true; }); });
  assert.equal(released, false);
  const output = response.text(); await started.promise; assert.equal(released, false);
  commit.resolve(); assert.match(await output, /\[DONE\]/); await hostWork;
  assert.equal(released, true); assert.equal(writes, 1);
});

test('registration failure and non-admitted paths settle lifetime without dispatch', async () => {
  for (const kind of ['register', 'token', 'body', 'admission'] as const) {
    let hostWork!: Promise<void>, dispatches = 0, admissions = 0;
    const response = await invokeNova(kind === 'token' ? request({}, { Authorization: '' }) : kind === 'body' ? request({ messages: [] }) : request(), 'https://nova.test', {
      admit: async () => { admissions++; throw new NovaError('inference_access_required', 403); }, finish: async () => { assert.fail('No admission'); },
    }, async () => { dispatches++; return completion(); }, task => { hostWork = task; if (kind === 'register') throw new Error('PRIVATE_HOST_CONTEXT'); });
    assert(response.status >= 400); assert.doesNotMatch(await response.text(), /PRIVATE_HOST_CONTEXT/);
    await hostWork; assert.equal(dispatches, 0); assert.equal(admissions, kind === 'admission' ? 1 : 0);
  }
});

test('disconnect while execution is pending persists unknown before the executor returns', async () => {
  const control = new AbortController(), dispatched = deferred(), exit = deferred(); const a = access(); let hostWork!: Promise<void>, calls = 0;
  const result = invokeNova(streamRequest(control.signal), 'https://nova.test', a.impl, async (_i, _a, signal) => {
    calls++; dispatched.resolve(); await exit.promise; signal.throwIfAborted(); return sse([chunk]);
  }, task => { hostWork = task; });
  await dispatched.promise; control.abort(); await hostWork;
  assert.deepEqual(a.states, ['unknown']); exit.resolve();
  assert.equal((await (await result).json()).error.execution_state, 'unknown'); assert.equal(calls, 1); assert.deepEqual(a.states, ['unknown']);
});

test('disconnect during admission waits for the admission result before releasing the host', async () => {
  const control = new AbortController(), entering = deferred(), admitted = deferred(); let hostWork!: Promise<void>, released = false, calls = 0; const states: string[] = [];
  const result = invokeNova(streamRequest(control.signal), 'https://nova.test', {
    admit: async () => { entering.resolve(); await admitted.promise; return { id: 'original', userId: 'owner', grantId: 'grant' }; },
    finish: async (_id, state) => { states.push(state); },
  }, async () => { calls++; return sse([chunk]); }, task => { hostWork = task; void task.then(() => { released = true; }); });
  await entering.promise; control.abort(); await Promise.resolve(); assert.equal(released, false);
  admitted.resolve(); const response = await result; await hostWork;
  assert.equal(response.status, 503); assert.deepEqual(states, ['unknown']); assert.equal(calls, 0);
});

test('abort after response handoff finalizes without relying on a response cancel callback', async () => {
  const control = new AbortController(), a = access(); let hostWork!: Promise<void>, calls = 0;
  const response = await invokeNova(streamRequest(control.signal), 'https://nova.test', a.impl, async () => { calls++; return partialStream(); }, task => { hostWork = task; });
  control.abort(); await hostWork;
  assert.deepEqual(a.states, ['unknown']); assert.equal(calls, 1);
  await response.body!.cancel(); assert.deepEqual(a.states, ['unknown']);
});

test('disconnect and response cancellation share one protected terminal write', async () => {
  const control = new AbortController(), commit = deferred(), started = deferred(); let hostWork!: Promise<void>, released = false, writes = 0, calls = 0;
  const response = await invokeNova(streamRequest(control.signal), 'https://nova.test', {
    admit: async () => ({ id: 'original', userId: 'owner', grantId: 'grant' }),
    finish: async (_id, state) => { writes++; assert.equal(state, 'unknown'); started.resolve(); await commit.promise; },
  }, async () => { calls++; return partialStream(); }, task => { hostWork = task; void task.then(() => { released = true; }); });
  const reader = response.body!.getReader(); await reader.read(); control.abort(); const cancellation = reader.cancel();
  await started.promise; assert.equal(released, false); assert.equal(writes, 1);
  commit.resolve(); await cancellation; await hostWork;
  assert.equal(released, true); assert.equal(writes, 1); assert.equal(calls, 1);
});

test('an ambiguous terminal write releases host work without another write or execution', async () => {
  let hostWork!: Promise<void>, writes = 0, calls = 0;
  const response = await invokeNova(streamRequest(), 'https://nova.test', {
    admit: async () => ({ id: 'original', userId: 'owner', grantId: 'grant' }),
    finish: async () => { writes++; throw new Error('PRIVATE_AMBIGUOUS_DATABASE_WRITE'); },
  }, async () => { calls++; return sse([chunk]); }, task => { hostWork = task; });
  const output = await response.text(); await hostWork;
  assert.match(output, /outcome_unconfirmed/); assert.doesNotMatch(output, /PRIVATE_|\[DONE\]/);
  assert.equal(writes, 1); assert.equal(calls, 1);
});

test('the unchanged 300-second deadline protects neutral finalization after response handoff', async t => {
  const deadline = new AbortController(), a = access(); let hostWork!: Promise<void>;
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => { assert.equal(milliseconds, 300_000); return deadline.signal; });
  const response = await invokeNova(streamRequest(), 'https://nova.test', a.impl, async () => partialStream(), task => { hostWork = task; });
  deadline.abort(new DOMException('Deadline', 'TimeoutError')); await hostWork;
  assert.deepEqual(a.states, ['unknown']); await response.body!.cancel(); assert.deepEqual(a.states, ['unknown']);
});

test('buffered completion cannot report success after the deadline claimed unknown', async t => {
  const deadline = new AbortController(), a = access(); let hostWork!: Promise<void>;
  t.mock.method(AbortSignal, 'timeout', () => deadline.signal);
  const response = await invokeNova(streamRequest(), 'https://nova.test', a.impl, async () => sse([chunk]), task => { hostWork = task; });
  deadline.abort(new DOMException('Deadline', 'TimeoutError')); await hostWork;
  const output = await response.text();
  assert.match(output, /outcome_unconfirmed/); assert.doesNotMatch(output, /\[DONE\]/);
  assert.deepEqual(a.states, ['unknown']);
});
