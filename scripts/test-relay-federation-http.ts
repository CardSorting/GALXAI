import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import sharp from 'sharp';
import { CODEX_IMAGE_TOOL_ENDPOINT } from '../src/relay/codex-image-tool.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { RelayFederationLifecycle, type DesiredShard, type RelayDriver, type RelayHandle } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';
import { executeRelayChat, readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('durable receipts survive worker and front-door replacement without weakening stream or tenant ownership', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-federation-receipt-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({ server: upstream }); let attempts = 0;
  ws.on('connection', socket => socket.on('message', () => {
    attempts++;
    socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'retained' }));
    socket.send(JSON.stringify({ type: 'response.completed', response: { status: 'completed', usage: {
      input_tokens: 10, output_tokens: 5, total_tokens: 15, secret: 'must-not-escape' } } }));
  }));
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  let revision = 'v1'; let worker: GalxaiRelayServer | undefined; let handle: RelayHandle | undefined;
  const driver: RelayDriver = {
    async list() { return handle ? [handle] : []; },
    async start(s) {
      worker = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: s, assignedShardId: s.id, relayId: 'worker', generation: s.credentialRevision,
        apiKeys: ['internal'], adminApiKeys: ['admin'], registryEnabled: false, discoverHostCredentials: false,
        stateSnapshotPath: path.join(directory, 'state.json'), shardsJsonPath: path.join(directory, 'absent'), drainTimeoutMs: 20,
        capabilityDiscovery: async () => ['test-model'], wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
      await worker.start();
      handle = { id: 'worker', shardId: s.id, generation: s.credentialRevision, credentialRevision: s.credentialRevision,
        endpoint: `http://127.0.0.1:${(worker as any).server.address().port}`, inferenceKey: 'internal', adminKey: 'admin' };
      return handle;
    },
    async inspect() { return { record: (worker as any).capabilitySnapshot().shards[0] }; },
    async remove() { await worker?.stop(); worker = undefined; handle = undefined; },
  };
  const lifecycle = new RelayFederationLifecycle(async () => [{ id: 'a', provider: 'openai', credentialRevision: revision, accessToken: 'fixture', accountId: 'a' }], driver);
  const config = { apiKeys: ['one', 'two'], adminKeys: ['operator'], secret: 'receipt-test-secret-with-at-least-32-characters', port: 0 };
  let front = new RelayFederationServer(lifecycle, config);
  try {
    await lifecycle.reconcile(); await front.start();
    const base = `http://127.0.0.1:${(front.server.address() as any).port}`;
    const availabilityUrl = base + '/v1/images/availability?model=gpt-image-2';
    assert.equal((await fetch(availabilityUrl)).status, 401);
    const unavailable = await fetch(availabilityUrl, { headers: { Authorization: 'Bearer one' } });
    assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await unavailable.json(), { available: false });
    const missingModel = await fetch(base + '/v1/images/availability', { headers: { Authorization: 'Bearer one' } });
    assert.equal(missingModel.status, 400);
    assert.equal((await missingModel.json()).error.code, 'invalid_request');
    assert.equal((await fetch(base + '/v1/images/availability?model=bad%20model', { headers: { Authorization: 'Bearer one' } })).status, 400);
    const imageTicket = lifecycle.capabilities.beginObservation('a', 'image:gpt-image-2')!;
    lifecycle.capabilities.observe(imageTicket, 'image:gpt-image-2', 'AVAILABLE');
    assert.deepEqual(await (await fetch(availabilityUrl, { headers: { Authorization: 'Bearer one' } })).json(), { available: true });
    assert.equal(attempts, 0, 'availability reads must never dispatch generation');
    const result = await (await executeRelayChat({ url: base, key: 'one', payload: { model: 'test-model', messages: [{ role: 'user', content: 'test' }],
      durable_receipt: true, stream: false }, ttftTimeoutMs: 5000 })).response.json();
    const receipt = await readRelayReceipt({ url: base, key: 'one', jobId: result.id, signal: AbortSignal.timeout(5000) });
    assert.equal(receipt.output, 'retained'); assert.equal(receipt.usage?.total_tokens, 15);
    assert(!JSON.stringify(receipt).includes('must-not-escape'));
    const affinity = JSON.parse(Buffer.from(result.id.split('.')[0], 'base64url').toString());
    assert(affinity.expires - Date.now() > 29*86400000);
    revision = 'v2'; await lifecycle.reconcile(); await until(() => handle === undefined);
    await lifecycle.reconcile(); assert.equal(handle?.generation, 'v2');
    await front.stop(); front = new RelayFederationServer(lifecycle, config); await front.start();
    const restarted = `http://127.0.0.1:${(front.server.address() as any).port}`;
    assert.deepEqual(await readRelayReceipt({ url: restarted, key: 'one', jobId: result.id, signal: AbortSignal.timeout(5000) }), receipt);
    assert.equal((await fetch(`${restarted}/v1/jobs/${result.id}/stream`, { headers: { Authorization: 'Bearer one' } })).status, 410);
    assert.equal((await fetch(`${restarted}/v1/jobs/${result.id}/receipt`, { headers: { Authorization: 'Bearer two', 'X-Galx-Tenant': affinity.tenant } })).status, 404);
    assert.equal((await fetch(`${restarted}/v1/jobs/${result.id}/receipt`)).status, 401);
    assert.equal(attempts, 1);
  } finally {
    await front.stop(); await lifecycle.stop(); await worker?.stop();
    for (const socket of ws.clients) socket.terminate(); await new Promise<void>(r => ws.close(() => r())); await new Promise<void>(r => upstream.close(() => r()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
async function until(fn: () => boolean) { for(let i=0;i<400;i++) { if(fn()) return; await delay(5); } throw new Error('State did not converge'); }
test('real HTTP federation preserves exact models, tenant ownership and active stream affinity across capability loss', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'galx-federation-http-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({server:upstream});
  const attempts: {account:string; model:string}[] = []; let held: WebSocket | undefined;
  ws.on('connection',(socket,req)=>socket.on('message',raw=>{
    const request = JSON.parse(raw.toString()); attempts.push({account:String(req.headers['chatgpt-account-id']),model:request.model});
    socket.send(JSON.stringify({type:'response.output_text.delta',delta:'first'}));
    if(JSON.stringify(request).includes('hold-stream')) held=socket;
    else socket.send(JSON.stringify({type:'response.completed'}));
  }));
  await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  let desired: DesiredShard[] = ['a','b','c'].map(id=>({id,provider:'openai',credentialRevision:'v1',accessToken:`fake-${id}`,accountId:id}));
  const inventories = new Map([['a',['A','B']],['b',['B','C']],['c',['A','C']]]);
  const workers = new Map<string,{relay:GalxaiRelayServer;handle:RelayHandle}>();
  const starts: string[]=[]; const removals:string[]=[];
  const driver: RelayDriver = {
    async list(){return [...workers.values()].map(w=>w.handle);},
    async start(s){
      starts.push(s.id); const generation=`generation-${s.id}`;
      const relay=new GalxaiRelayServer({port:0,host:'127.0.0.1',assignedShard:s,assignedShardId:s.id,relayId:`relay-${s.id}`,generation,
        apiKeys:['internal-inference'],adminApiKeys:['internal-admin'],registryEnabled:false,discoverHostCredentials:false,
        stateSnapshotPath:path.join(directory,`${s.id}.json`),shardsJsonPath:path.join(directory,'absent'),drainTimeoutMs:20,
        capabilityDiscovery:async()=>inventories.get(s.id)!,wsEndpoint:`ws://127.0.0.1:${(upstream.address() as any).port}`});
      await relay.start();
      const handle={id:`relay-${s.id}`,shardId:s.id,generation,credentialRevision:s.credentialRevision,endpoint:`http://127.0.0.1:${(relay as any).server.address().port}`,inferenceKey:'internal-inference',adminKey:'internal-admin'};
      workers.set(s.id,{relay,handle});return handle;
    },
    async inspect(h){const relay=workers.get(h.shardId)!.relay as any; await relay.refreshCapabilities(); return {record:relay.capabilitySnapshot().shards[0]};},
    async remove(h){removals.push(h.shardId);await workers.get(h.shardId)!.relay.stop();workers.delete(h.shardId);}
  };
  const lifecycle=new RelayFederationLifecycle(async()=>desired,driver);
  const front=new RelayFederationServer(lifecycle,{apiKeys:['tenant-one','tenant-two'],adminKeys:['admin'],secret:'federation-test-signing-secret-32-characters',port:0});
  try {
    await lifecycle.reconcile(); await front.start();const base=`http://127.0.0.1:${(front.server.address() as any).port}`;
    const headers=(key='tenant-one')=>({Authorization:`Bearer ${key}`,'Content-Type':'application/json'});
    const submit=(model:string,prompt:string,key?:string)=>fetch(base+'/v1/chat/completions',{method:'POST',headers:headers(key),body:JSON.stringify({model,messages:[{role:'user',content:prompt}]})});
    assert.equal((await fetch(base+'/api/capabilities',{headers:headers()})).status,401);
    assert.equal((await fetch(base+'/api/capabilities',{headers:headers('admin')})).status,200);
    const missing=await submit('missing','unknown');assert.equal(missing.status,503);assert.equal(attempts.length,0);
    const image=await fetch(base+'/v1/images/generations',{method:'POST',headers:headers(),body:JSON.stringify({model:'A',prompt:'unverified image operation'})});assert.equal(image.status,503);assert.equal(attempts.length,0);
    const response=await submit('B','hold-stream');assert.equal(response.status,202);const job=await response.json();assert(job.id);assert.equal(job.streamUrl,`/v1/jobs/${job.id}/stream`);
    await until(()=>!!held);assert.deepEqual(attempts[0],{account:'a',model:'B'});
    assert.equal((await fetch(base+job.statusUrl,{headers:headers('tenant-two')})).status,404);
    inventories.set('a',['A']);await lifecycle.reconcile();assert.equal(starts.length,3);assert.equal(removals.length,0);
    assert.deepEqual(lifecycle.capabilities.eligible('B').map(s=>s.shardId),['b']);
    held!.send(JSON.stringify({type:'response.output_text.delta',delta:' second'}));held!.send(JSON.stringify({type:'response.completed'}));
    const stream=await fetch(base+job.streamUrl,{headers:headers()});assert.equal(stream.status,200);const transcript=await stream.text();assert(transcript.includes('first'));assert(transcript.includes('second'));
    const next=await submit('B','only-b');assert.equal(next.status,202);await until(()=>attempts.length===2);assert.deepEqual(attempts[1],{account:'b',model:'B'});
    desired=desired.filter(s=>s.id!=='b');await lifecycle.reconcile();
    const denied=await submit('B','now-unavailable');assert.equal(denied.status,503);assert.equal((await denied.json()).error.code,'model_temporarily_unavailable');
    assert.equal((await submit('A','A-still-works')).status,202);assert.equal((await submit('C','C-still-works')).status,202);
    inventories.set('a',['A','B']);await lifecycle.reconcile();assert.equal((await submit('B','recovered')).status,202);assert.equal(starts.length,3);
    assert.equal((await fetch(base+'/federation')).status,200);
  } finally { await front.stop();await lifecycle.stop();for(const socket of ws.clients)socket.terminate();await new Promise<void>(resolve=>ws.close(()=>resolve()));await new Promise<void>(resolve=>upstream.close(()=>resolve()));fs.rmSync(directory,{recursive:true,force:true}); }
});

test('image alias is verified through the Codex image backend before admission', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'galx-image-alias-'));
  const frames: any[] = [];
  const png = await sharp({create:{width:16,height:16,channels:3,background:'#abcdef'}}).png().withMetadata().toBuffer();
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const frame = JSON.parse(body); frames.push(frame);
    assert.equal(frame.model,'gpt-image-2'); assert.equal(frame.tools,undefined);
    assert.equal(req.headers.authorization,'Bearer oauth-fixture');
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({data:[{b64_json:png.toString('base64'),generation_id:'private-generation'}]}));
  });
  await new Promise<void>(r=>upstream.listen(0,'127.0.0.1',r));
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', ((url, options) => originalFetch(
    url === CODEX_IMAGE_TOOL_ENDPOINT ? `http://127.0.0.1:${(upstream.address() as any).port}` : url, options)) as typeof fetch);
  const relay = new GalxaiRelayServer({port:0,host:'127.0.0.1',assignedShard:{id:'a',accountId:'a',accessToken:'oauth-fixture'},assignedShardId:'a',relayId:'relay-a',generation:'one',
    apiKeys:['client'],adminApiKeys:['admin'],registryEnabled:false,discoverHostCredentials:false,codexImageToolAlias:true,
    stateSnapshotPath:path.join(directory,'state.json'),shardsJsonPath:path.join(directory,'absent'),drainTimeoutMs:20,
    capabilityDiscovery:async()=>['test-chat-model']});
  try {
    await relay.start(); const internals=relay as any;
    await until(()=>!!internals.capabilities.select('image:gpt-image-2'));
    assert.equal(frames.length,1);
    await internals.refreshCapabilities(); assert.equal(frames.length,1);
    const base=`http://127.0.0.1:${internals.server.address().port}`;
    const deniedProbe=await fetch(base+'/api/capabilities/probe-image',{method:'POST',headers:{Authorization:'Bearer client','Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-2',prompt:'test'})});
    assert.equal(deniedProbe.status,403); assert.equal(frames.length,1);
    const response=await fetch(base+'/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer client','Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-2',prompt:'test'})});
    assert.equal(response.status,200); assert.equal(response.headers.get('x-galx-routing-mode'),'codex_image_tool_alias');
    const result=await response.json(); const metadata=await sharp(Buffer.from(result.data[0].b64_json,'base64')).metadata();
    assert.equal(metadata.width,16); assert.equal(metadata.exif,undefined); assert.equal(metadata.icc,undefined);
    assert.equal(result.execution.executionModel,'gpt-image-2'); assert.equal(result.execution.tool,'image_gen.imagegen');
    assert.equal(result.execution.imageModelSelection,'provider_managed');
    assert(!JSON.stringify(result).includes('private-generation'));
    assert.equal(frames.length,2);
    const denied=await fetch(base+'/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer client','Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-1',prompt:'test'})});
    assert.equal(denied.status,503); assert.equal(frames.length,2);
  } finally { await relay.stop(); await new Promise<void>(r=>upstream.close(()=>r())); fs.rmSync(directory,{recursive:true,force:true}); }
});
