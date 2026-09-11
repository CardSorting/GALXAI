import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateBrief, parseBrief, renderBrief, WorkflowError } from './workflow';

const valid = { schema_version: 1, title: 'Studio portal', summary: 'Synthetic content', sections: [{ heading: 'Kickoff', body: 'Confirm the scope.' }] };
test('valid bounded content produces a static page', () => {
  assert.deepEqual(parseBrief(JSON.stringify(valid)), valid);
  const html = renderBrief(valid as any);
  assert(html.includes('<h1>Studio portal</h1>')); assert(!html.includes('<script'));
});
test('commands, credentials, operations, arbitrary paths and unknown fields cannot become actions', () => {
  for (const field of ['command', 'path', 'tools', 'operation', 'deploy', 'api_key', '__proto__']) {
    assert.throws(() => parseBrief(JSON.stringify({ ...valid, [field]: 'malicious' })), WorkflowError);
  }
});
test('HTML and script-like text remain inert text in every dynamic position', () => {
  const attack = '</title><script>alert(1)</script><img src=x onerror=alert(2)>';
  const html = renderBrief({ ...valid, title: attack, summary: attack, sections: [{ heading: attack, body: attack }] } as any);
  assert(!html.includes('<script')); assert(!html.includes('<img'));
  assert(html.includes('&lt;script&gt;')); assert(html.includes("default-src 'none'"));
});
test('malformed, oversized and out-of-contract outputs fail closed', () => {
  for (const raw of ['```json\n{}\n```', 'not json', 'null', '[]', JSON.stringify({ ...valid, schema_version: 2 }),
    JSON.stringify({ ...valid, sections: [] }), JSON.stringify({ ...valid, title: 'a'.repeat(91) }),
    JSON.stringify({ ...valid, summary: 'bad\ntext' }), JSON.stringify({ ...valid, sections: [{ heading: 'x', body: 'y', command: 'execute' }] }), ' '.repeat(12001)]) {
    assert.throws(() => parseBrief(raw), WorkflowError);
  }
});
test('one invalid reply permits one bounded repair without echoing untrusted output', async () => {
  let calls = 0;
  const result = await generateBrief(async messages => {
    calls++; assert(!JSON.stringify(messages).includes('RUN_EVIL'));
    return { text: calls === 1 ? 'RUN_EVIL' : JSON.stringify(valid), usage: { total_tokens: 7 } };
  });
  assert.equal(calls, 2); assert.equal(result.usage_tokens, 14);
});
test('repeated malformed output stops after two completed calls', async () => {
  let calls = 0;
  await assert.rejects(generateBrief(async () => { calls++; return { text: 'bad' }; }), WorkflowError);
  assert.equal(calls, 2);
});
test('ambiguous network failure is never retried automatically', async () => {
  let calls = 0;
  await assert.rejects(generateBrief(async () => { calls++; throw new Error('accepted but connection lost'); }));
  assert.equal(calls, 1);
});
test('cancelled work cannot start a model request or render a returned response', async () => {
  const before = new AbortController(); before.abort(); let calls = 0;
  await assert.rejects(generateBrief(async () => { calls++; return { text: JSON.stringify(valid) }; }, before.signal));
  assert.equal(calls, 0);
  const during = new AbortController();
  await assert.rejects(generateBrief(async () => { during.abort(); return { text: JSON.stringify(valid) }; }, during.signal));
});
test('missing token usage is unknown rather than free', async () => {
  const result = await generateBrief(async () => ({ text: JSON.stringify(valid) }));
  assert.equal(result.usage_tokens, null);
});
