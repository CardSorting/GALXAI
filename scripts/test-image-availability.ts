import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
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
  const { clearRelayDiscoveryCache } = await import('../src/core/router/adapters/RelayEndpointDiscovery');
  const { default: sharp } = await import('sharp');
  const names=['GALX_PREMIUM_IMAGES_ENABLED','GALX_ISOLATED_RELAYS_ENABLED','GALX_PREMIUM_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_PREMIUM_RELAY_CONFIG_FILE','GALX_PREMIUM_RELAY_PORTS','GALX_PREMIUM_RELAY_PORT_RANGE','GALX_STANDARD_RELAY_URL','GALX_STANDARD_RELAY_KEY','VM_RELAY_URL','VM_RELAY_API_KEY'];
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
      if(new URL(String(url)).pathname==='/health/live') return Response.json({ok:true});
      reads++;return Response.json({available:reads===1?null:true,private:'private-sentinel'});
    };
    clearRelayDiscoveryCache(); assert.equal(await readImageAvailability(),'unknown');
    clearRelayDiscoveryCache(); assert.equal(await readImageAvailability(),'available'); assert.equal(posts,0);
    clearRelayDiscoveryCache(); const output=await isolatedImage({model:'gpt-image-2',prompt:'test'},'owner','request'); assert.equal(posts,1);assert.equal(reads,3);assert(!JSON.stringify(output).includes('private-sentinel'));await sharp(Buffer.from(output.data[0].b64_json,'base64')).raw().toBuffer();
    process.env.GALX_PREMIUM_RELAY_URL='https://premium.invalid/unsafe';
    assert.equal(await readImageAvailability(),'unknown');await assert.rejects(isolatedImage({prompt:'test'},'owner','request'));assert.equal(posts,1);assert.equal(reads,3);
  } finally {globalThis.fetch=original;names.forEach((name,i)=>{if(saved[i]===undefined)delete process.env[name];else process.env[name]=saved[i];});}
});

test('dynamic image discovery bypasses a healthy but wrong local port', async () => {
  const { resolveIsolatedRelay } = await import('../src/core/router/adapters/RelayEndpointDiscovery');
  const names = ['GALX_PREMIUM_RELAY_URL', 'GALX_PREMIUM_RELAY_KEY', 'GALX_PREMIUM_RELAY_PORTS', 'GALX_PREMIUM_RELAY_PORT_RANGE'];
  const saved = names.map(name => process.env[name]);
  const calls: string[] = [];
  try {
    Object.assign(process.env, {
      GALX_PREMIUM_RELAY_URL: 'http://127.0.0.1:3001',
      GALX_PREMIUM_RELAY_KEY: 'p'.repeat(64),
      GALX_PREMIUM_RELAY_PORTS: '13301,13311',
    });
    delete process.env.GALX_PREMIUM_RELAY_PORT_RANGE;
    const result = await resolveIsolatedRelay('images', {
      cache: false,
      fetcher: async (url) => {
        const target = new URL(String(url));
        calls.push(target.origin + target.pathname);
        if (target.port === '3001' && target.pathname === '/v1/images/availability') return Response.json({ available: false });
        if ((target.port === '13301' || target.port === '13311') && target.pathname === '/v1/images/availability') return Response.json({ available: null });
        if (target.pathname === '/health/live') return Response.json({ ok: true });
        return new Response(null, { status: 404 });
      },
    });
    assert.equal(result.url, 'http://127.0.0.1:13301');
    assert.equal(result.availability, 'unknown');
    assert(calls.includes('http://127.0.0.1:3001/v1/images/availability'));
    assert(calls.includes('http://127.0.0.1:13301/v1/images/availability'));
  } finally {
    names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index]; });
  }
});

test('text and Sites discovery require the authenticated inference model contract', async () => {
  const { resolveIsolatedRelay } = await import('../src/core/router/adapters/RelayEndpointDiscovery');
  const names = ['GALX_PREMIUM_RELAY_URL', 'GALX_PREMIUM_RELAY_KEY', 'GALX_PREMIUM_RELAY_PORTS', 'GALX_PREMIUM_RELAY_PORT_RANGE'];
  const saved = names.map(name => process.env[name]);
  try {
    Object.assign(process.env, {
      GALX_PREMIUM_RELAY_URL: 'http://127.0.0.1:3001',
      GALX_PREMIUM_RELAY_KEY: 'p'.repeat(64),
      GALX_PREMIUM_RELAY_PORTS: '3001,3002',
    });
    delete process.env.GALX_PREMIUM_RELAY_PORT_RANGE;
    const result = await resolveIsolatedRelay('text', {
      cache: false,
      fetcher: async (url, init) => {
        const target = new URL(String(url));
        if (target.pathname === '/health/live') return Response.json({ ok: true });
        if (target.pathname === '/v1/models') {
          assert.equal(new Headers(init?.headers).get('x-galx-tenant')?.length, 64);
          if (target.port === '3001') return new Response(null, { status: 401 });
          if (target.port === '3002') return Response.json({ object: 'list', data: [{ id: 'gpt-5.6-terra' }] });
        }
        return new Response(null, { status: 404 });
      },
    });
    assert.equal(result.url, 'http://127.0.0.1:3002');
  } finally {
    names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index]; });
  }
});

test('local Premium routing can read only the private runtime inference key', async () => {
  const { isolatedRelay } = await import('../src/core/router/adapters/IsolatedRelayTransport');
  const directory = await mkdtemp(path.join(tmpdir(), 'galx-premium-relay-'));
  const configFile = path.join(directory, 'runtime.json');
  const names = ['GALX_PREMIUM_RELAY_URL', 'GALX_PREMIUM_RELAY_KEY', 'GALX_PREMIUM_RELAY_CONFIG_FILE'];
  const saved = names.map(name => process.env[name]);
  const key = 'p'.repeat(64);
  try {
    await writeFile(configFile, JSON.stringify({ inferenceKey: key, databaseUrl: 'private-sentinel' }), { mode: 0o600 });
    process.env.GALX_PREMIUM_RELAY_URL = 'http://127.0.0.1:13301';
    delete process.env.GALX_PREMIUM_RELAY_KEY;
    process.env.GALX_PREMIUM_RELAY_CONFIG_FILE = configFile;
    const relay = isolatedRelay('images');
    assert.equal(relay.url, 'http://127.0.0.1:13301');
    assert.equal(relay.key, key);
  } finally {
    names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index]; });
    await rm(directory, { recursive: true, force: true });
  }
});

test('a valid not-accepted response does not poison endpoint discovery', async () => {
  const { isolatedImage } = await import('../src/core/router/adapters/IsolatedRelayTransport');
  const { clearRelayDiscoveryCache } = await import('../src/core/router/adapters/RelayEndpointDiscovery');
  const names = [
    'GALX_PREMIUM_RELAY_URL', 'GALX_PREMIUM_RELAY_KEY', 'GALX_PREMIUM_RELAY_CONFIG_FILE',
    'GALX_PREMIUM_RELAY_DISCOVERY_FILE', 'GALX_PREMIUM_RELAY_URLS', 'GALX_PREMIUM_RELAY_HOST',
    'GALX_PREMIUM_RELAY_PROTOCOL', 'GALX_PREMIUM_RELAY_PORTS', 'GALX_PREMIUM_RELAY_PORT',
    'GALX_PREMIUM_RELAY_PORT_RANGE',
  ];
  const saved = names.map((name) => process.env[name]);
  const original = globalThis.fetch;
  let posts = 0;
  try {
    Object.assign(process.env, {
      GALX_PREMIUM_RELAY_URL: 'https://relay-45991.invalid',
      GALX_PREMIUM_RELAY_KEY: 'p'.repeat(64),
    });
    for (const name of names.slice(2)) delete process.env[name];
    clearRelayDiscoveryCache();
    globalThis.fetch = async (url, init) => {
      const target = new URL(String(url));
      if (init?.method === 'POST') {
        posts += 1;
        return Response.json({ error: { code: 'service_busy', execution_state: 'not_accepted' } }, {
          status: 503,
          headers: { 'X-Should-Retry': 'true' },
        });
      }
      if (target.pathname === '/health/live') return Response.json({ ok: true });
      if (target.pathname === '/v1/images/availability') return Response.json({ available: true });
      return new Response(null, { status: 404 });
    };
    for (const suffix of ['one', 'two', 'three']) {
      await assert.rejects(
        isolatedImage({ model: 'gpt-image-2', prompt: 'bounded fixture' }, 'owner', `not-accepted-${suffix}`),
        (error: any) => error?.reason === 'image_unavailable',
      );
    }
    assert.equal(posts, 3, 'ordinary admission rejection must not become endpoint discovery failure');
  } finally {
    clearRelayDiscoveryCache();
    globalThis.fetch = original;
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
  }
});
