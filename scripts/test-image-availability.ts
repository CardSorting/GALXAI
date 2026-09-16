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

test('image-only cutover uses Premium for both observation and dispatch and fails closed', async () => {
  const { isolatedImagesEnabled, isolatedRelaysEnabled, isolatedImage } = await import('../src/core/router/adapters/IsolatedRelayTransport');
  const { default: sharp } = await import('sharp');
  const names=['GALX_PREMIUM_IMAGES_ENABLED','GALX_ISOLATED_RELAYS_ENABLED','GALX_PREMIUM_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_STANDARD_RELAY_URL','GALX_STANDARD_RELAY_KEY','VM_RELAY_URL','VM_RELAY_API_KEY'];
  const saved=names.map(name=>process.env[name]); const original=globalThis.fetch;
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  try {
    Object.assign(process.env,{GALX_PREMIUM_IMAGES_ENABLED:'1',GALX_ISOLATED_RELAYS_ENABLED:'0',GALX_PREMIUM_RELAY_URL:'https://premium.invalid',GALX_PREMIUM_RELAY_KEY:'p'.repeat(64),VM_RELAY_URL:'https://legacy.invalid',VM_RELAY_API_KEY:'legacy'});
    delete process.env.GALX_STANDARD_RELAY_URL; delete process.env.GALX_STANDARD_RELAY_KEY;
    assert.equal(isolatedImagesEnabled(),true); assert.equal(isolatedRelaysEnabled(),false);
    let reads=0,posts=0;
    globalThis.fetch=async(url,init)=>{
      assert.equal(new URL(String(url)).origin,'https://premium.invalid');
      assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+'p'.repeat(64));
      if(init?.method==='POST') {posts++;assert.match(new Headers(init.headers).get('x-galx-tenant')!,/^[a-f0-9]{64}$/);assert.match(new Headers(init.headers).get('idempotency-key')!,/^[a-f0-9]{64}$/);return Response.json({private:'private-sentinel',data:[{b64_json:bytes.toString('base64'),private:'private-sentinel'}]});}
      reads++;return Response.json({available:reads===1?null:true,private:'private-sentinel'});
    };
    assert.equal(await readImageAvailability(),'unknown'); assert.equal(await readImageAvailability(),'available');assert.equal(posts,0);
    const output=await isolatedImage({model:'gpt-image-2',prompt:'test'},'owner','request'); assert.equal(posts,1);assert(!JSON.stringify(output).includes('private-sentinel'));await sharp(Buffer.from(output.data[0].b64_json,'base64')).raw().toBuffer();
    process.env.GALX_PREMIUM_RELAY_URL='https://premium.invalid/unsafe';
    assert.equal(await readImageAvailability(),'unknown');await assert.rejects(isolatedImage({prompt:'test'},'owner','request'));assert.equal(posts,1);assert.equal(reads,2);
  } finally {globalThis.fetch=original;names.forEach((name,i)=>{if(saved[i]===undefined)delete process.env[name];else process.env[name]=saved[i];});}
});
