import test from 'node:test';
import assert from 'node:assert/strict';
import { readImageAvailability } from '../src/lib/images/availability';
import { GET } from '../src/app/api/images/availability/route';
import { NextRequest } from 'next/server';

test('anonymous availability requests are denied before any upstream read', async () => {
  const original=globalThis.fetch; let reads=0;
  globalThis.fetch=async()=>{reads++;throw new Error('must not fetch');};
  try {
    const result=await GET(new NextRequest('https://galx.ai/api/images/availability'));
    assert.equal(result.status,401); assert.equal(result.headers.get('cache-control'),'private, no-store');
    assert.deepEqual(Object.keys(await result.json()).sort(),['error','valid']); assert.equal(reads,0);
  } finally {globalThis.fetch=original;}
});

test('image availability allows only a bounded boolean and never submits work', async () => {
  const saved = { url: process.env.VM_RELAY_URL, key: process.env.VM_RELAY_API_KEY };
  process.env.VM_RELAY_URL = 'https://fixture.invalid'; process.env.VM_RELAY_API_KEY = 'fixture';
  try {
    for (const [body, status, expected] of [
      [{available:true, internal:'private-sentinel'},200,'available'],
      [{available:false, internal:'private-sentinel'},200,'unavailable'],
      [{available:'true'},200,'unknown'], [{available:true},503,'unknown'],
      [{available:true, internal:'x'.repeat(1500)},200,'unknown'],
    ] as const) {
      let reads = 0;
      const result = await readImageAvailability(async (url, init) => {
        reads++; assert.equal(new URL(String(url)).pathname, '/v1/images/availability');
        assert.equal(init?.method, undefined); assert.equal(init?.redirect, 'error');
        return Response.json(body, {status});
      });
      assert.equal(result, expected); assert.equal(reads, 1);
    }
    assert.equal(await readImageAvailability(async()=>{throw new Error('private-sentinel');}), 'unknown');
  } finally {
    if (saved.url === undefined) delete process.env.VM_RELAY_URL; else process.env.VM_RELAY_URL=saved.url;
    if (saved.key === undefined) delete process.env.VM_RELAY_API_KEY; else process.env.VM_RELAY_API_KEY=saved.key;
  }
});
