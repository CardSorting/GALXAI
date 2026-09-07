import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CapabilityRegistry, classifyCapabilityFailure } from '../src/relay/capability-registry.js';
import { discoverOpenAIModels } from '../src/relay/capability-discovery.js';
import { RelayFederationLifecycle, type RelayDriver, type DesiredShard, type RelayHandle } from '../src/relay/federation-lifecycle.js';

function fixture() {
  let now = 1000000;
  const registry = new CapabilityRegistry(() => now);
  for (const [id, models] of [['a', ['A','B']], ['b', ['B','C']], ['c', ['A','C']]] as const) {
    registry.register(id, `relay-${id}`, `generation-${id}`, 'openai');
    registry.publishInventory(registry.beginRefresh(id)!, [...models]);
    registry.heartbeat(id, {});
  }
  return { registry, advance: (ms: number) => { now += ms; } };
}
test('heterogeneous pools lose a model and shard without affecting unrelated capabilities', () => {
  const { registry: r } = fixture();
  assert.deepEqual(r.eligible('B').map(s => s.shardId), ['a','b']);
  assert(r.observe(r.beginObservation('a', 'B')!, 'B', 'NOT_AUTHORIZED'));
  assert.deepEqual(r.eligible('B').map(s => s.shardId), ['b']);
  assert(r.get('a')); assert.equal(r.get('a')!.lifecycle, 'HEALTHY');
  r.remove('b'); assert.equal(r.select('B'), undefined);
  assert.equal(r.snapshot().models.find(m => m.model === 'B')!.state, 'UNAVAILABLE');
  assert(r.select('A')); assert(r.select('C'));
});
test('eligibility precedes capacity and model-specific saturation', () => {
  const { registry: r } = fixture();
  r.heartbeat('a', { activeStreams: 4 }); r.heartbeat('b', { activeStreams: 4 });
  assert.equal(r.select('B'), undefined); assert.equal(r.select('A')!.shardId, 'c');
  assert.equal(r.select('unknown'), undefined);
});
test('old discovery and older active successes cannot undo a denial', () => {
  const { registry: r, advance } = fixture();
  const refresh = r.beginRefresh('a')!; const success = r.beginObservation('a','B')!;
  r.observe(r.beginObservation('a','B')!, 'B', 'NOT_AUTHORIZED');
  assert.equal(r.publishInventory(refresh, ['A','B']), true);
  assert.equal(r.get('a')!.models.find(m => m.model === 'B')!.state, 'NOT_AUTHORIZED');
  assert.equal(r.observe(success, 'B', 'AVAILABLE'), false);
  r.publishInventory(r.beginRefresh('a')!, ['A','B']);
  assert.equal(r.get('a')!.models.find(m => m.model === 'B')!.state, 'NOT_AUTHORIZED');
  advance(5001); r.publishInventory(r.beginRefresh('a')!, ['A','B']);
  assert.equal(r.get('a')!.models.find(m => m.model === 'B')!.state, 'AVAILABLE');
});
test('different model observations do not suppress authoritative denials', () => {
  const { registry: r } = fixture(); const b = r.beginObservation('a','B')!;
  r.observe(r.beginObservation('a','A')!, 'A', 'AVAILABLE');
  assert(r.observe(b,'B','NOT_AUTHORIZED'));
});
test('empty capability recovery retains identity; stale and draining records never route', () => {
  const { registry: r, advance } = fixture();
  r.publishInventory(r.beginRefresh('a')!, []); assert.equal(r.get('a')!.lifecycle, 'CAPABILITY_EMPTY');
  advance(120001); assert(r.get('a')); assert.equal(r.select('A'), undefined);
  r.publishInventory(r.beginRefresh('a')!, ['A']); r.heartbeat('a', {});
  assert.equal(r.select('A')!.relayId, 'relay-a');
  r.drain('a'); r.publishInventory(r.beginRefresh('a')!, ['A']); assert.equal(r.select('A'), undefined);
});
test('replicated health and replaced generation reject stale snapshots', () => {
  const { registry: r } = fixture();
  const old = r.get('a')!; r.heartbeat('a', { health: 'unavailable' });
  assert.equal(r.receive(old), false); assert.equal(r.get('a')!.health, 'unavailable');
  r.remove('a'); r.register('a','relay-a','new-generation','openai');
  assert.equal(r.receive(old), false); assert.equal(r.publishInventory({shardId:'a',generation:'generation-a',revision:0},['A']), false);
  assert.throws(() => r.register('z','relay-a','new-generation','openai'));
});
test('generic HTTP, transient transport, and rate limiting never prove model loss', () => {
  for (const status of [403,404,408,429,500,502,503,504]) assert.equal(classifyCapabilityFailure({status,error:{message:'route'}}), undefined);
  assert.equal(classifyCapabilityFailure({status:429,error:{code:'model_not_allowed'}}), undefined);
  assert.equal(classifyCapabilityFailure({error:{code:'model_not_allowed'}})!.state, 'NOT_AUTHORIZED');
  assert.equal(classifyCapabilityFailure({status:404,error:{message:'This model is not available'}})!.state, 'NOT_AUTHORIZED');
});
test('authenticated inventory excludes inaccessible models and fails closed on schema drift', async () => {
  const shard = { id:'a', accountId:'a', accessToken:'fake' };
  const transport = async (_url: any, options: any) => { assert.equal(options.headers.Authorization, 'Bearer fake'); return Response.json({models:[{slug:'A',supported_in_api:true},{slug:'B',visibility:'hide'},{slug:'C',supported_in_api:false}]}); };
  assert.deepEqual(await discoverOpenAIModels(shard, AbortSignal.timeout(1000), transport as typeof fetch), ['A']);
  await assert.rejects(discoverOpenAIModels(shard, AbortSignal.timeout(1000), (async () => Response.json({unexpected:[]})) as typeof fetch));
  await assert.rejects(discoverOpenAIModels(shard, AbortSignal.timeout(1000), (async () => new Response('',{status:401})) as typeof fetch), /invalid_credential/);
});
test('lifecycle maintains one relay per shard and never restarts on capability loss', async () => {
  let desired: DesiredShard[] = ['a','b','c'].map(id => ({id,provider:'openai',credentialRevision:'v1',accessToken:'fake',accountId:id}));
  const workers = new Map<string, {handle:RelayHandle; registry:CapabilityRegistry}>(); const events: string[] = [];
  let generation = 0;
  const driver: RelayDriver = {
    async list() { return [...workers.values()].map(w => w.handle); },
    async start(s) { assert(!workers.has(s.id)); events.push(`start:${s.id}`); const handle = {id:`relay-${s.id}`,shardId:s.id,generation:String(++generation),credentialRevision:s.credentialRevision,endpoint:'http://127.0.0.1:1',inferenceKey:'fake',adminKey:'fake'}; const r = new CapabilityRegistry(); r.register(s.id,handle.id,handle.generation,'openai'); r.publishInventory(r.beginRefresh(s.id)!, s.id==='a'?['A','B']:s.id==='b'?['B','C']:['A','C']); r.heartbeat(s.id,{}); workers.set(s.id,{handle,registry:r}); return handle; },
    async inspect(h) { const w = workers.get(h.shardId)!; w.registry.heartbeat(h.shardId,{}); return {record:w.registry.get(h.shardId)}; },
    async remove(h) { events.push(`remove:${h.shardId}`); workers.delete(h.shardId); }
  };
  const lifecycle = new RelayFederationLifecycle(async () => desired, driver);
  await Promise.all([lifecycle.reconcile(),lifecycle.reconcile()]); assert.equal(workers.size,3); assert.equal(events.length,3);
  const a = workers.get('a')!.registry; a.publishInventory(a.beginRefresh('a')!,['A']); await lifecycle.reconcile();
  assert.deepEqual(lifecycle.capabilities.eligible('B').map(s=>s.shardId),['b']); assert.equal(events.length,3);
  desired = desired.filter(s=>s.id!=='b'); await lifecycle.reconcile(); assert.equal(lifecycle.capabilities.eligible('B').length,0); assert(lifecycle.capabilities.select('A'));
  a.publishInventory(a.beginRefresh('a')!,[]); await lifecycle.reconcile(); assert(workers.has('a'));
  a.publishInventory(a.beginRefresh('a')!,['X']); await lifecycle.reconcile(); assert(lifecycle.capabilities.select('X'));
  desired = desired.map(s=>s.id==='a'?{...s,credentialRevision:'v2'}:s); await lifecycle.reconcile(); await lifecycle.reconcile(); assert.deepEqual(events.slice(-2),['remove:a','start:a']);
  await lifecycle.stop(); assert.equal(workers.size,0);
});

test('busy model updates do not starve inventory and older inventories cannot overwrite newer discovery', () => {
  const {registry:r}=fixture(); const first=r.beginRefresh('a')!;
  r.observe(r.beginObservation('a','A')!,'A','AVAILABLE');
  assert(r.publishInventory(first,['A','D']));
  assert.equal(r.get('a')!.models.find(m=>m.model==='B')!.state,'NOT_AUTHORIZED');assert(r.eligible('D').length);
  const older=r.beginRefresh('a')!,newer=r.beginRefresh('a')!;
  assert(r.publishInventory(newer,['A','E']));assert.equal(r.publishInventory(older,['A','D']),false);
  assert(r.eligible('E').length);assert.equal(r.eligible('D').length,0);
});
test('malformed inventory does not turn schema drift into total capability loss', async()=>{
  await assert.rejects(discoverOpenAIModels({id:'a',accountId:'a',accessToken:'fake'},AbortSignal.timeout(1000),
    (async()=>Response.json({models:[{renamed_slug:'A'}]})) as typeof fetch),/invalid_inventory/);
});

test('registry cooldown blocks new admission without deleting otherwise useful workers', async()=>{
  let now=1000000;
  const shard:DesiredShard={id:'a',accountId:'a',provider:'openai',accessToken:'fake',credentialRevision:'v1',cooldownUntilMs:now+60000};
  const handle:RelayHandle={id:'relay-a',shardId:'a',generation:'g',credentialRevision:'v1',endpoint:'http://127.0.0.1:1',inferenceKey:'i',adminKey:'a'};
  const r=new CapabilityRegistry(()=>now);r.register('a','relay-a','g','openai');r.publishInventory(r.beginRefresh('a')!,['A']);
  const lifecycle=new RelayFederationLifecycle(async()=>[shard],{list:async()=>[handle],start:async()=>{throw Error('should not spawn')},remove:async()=>{throw Error('cooldown must not destroy')},inspect:async()=>{r.heartbeat('a',{});return {record:r.get('a')};}},()=>now);
  await lifecycle.reconcile();assert.equal(lifecycle.capabilities.select('A'),undefined);assert(lifecycle.handle('a'));
  now+=60001;await lifecycle.reconcile();assert(lifecycle.capabilities.select('A'));
});

test('a concurrent success cannot hide a model denial, while rediscovery fences older failures',()=>{
  const {registry:r}=fixture();const denied=r.beginObservation('a','B')!;
  r.observe(r.beginObservation('a','B')!,'B','AVAILABLE');
  assert(r.observe(denied,'B','NOT_AUTHORIZED'));assert.equal(r.get('a')!.models.find(m=>m.model==='B')!.state,'NOT_AUTHORIZED');
  const old=r.beginObservation('a','A')!;r.publishInventory(r.beginRefresh('a')!,['A']);
  r.observe(r.beginObservation('a','A')!,'A','AVAILABLE');assert.equal(r.observe(old,'A','NOT_AUTHORIZED'),false);
});
test('replayed equal-revision health cannot clear a local failure observation',()=>{
  const {registry:r}=fixture();const old=r.get('a')!;r.heartbeat('a',{health:'unavailable'},0,false);
  assert.equal(r.receive(old),false);assert.equal(r.get('a')!.health,'unavailable');
});


test('invalid credential draining does not block healthy shard reconciliation; shutdown attempts every removal', async () => {
  const desired: DesiredShard[] = ['a', 'b', 'c'].map(id => ({ id, provider: 'openai', credentialRevision: 'v1', accessToken: 'fake', accountId: id }));
  const handles = desired.map(s => ({ id: `relay-${s.id}`, shardId: s.id, generation: s.id, credentialRevision: 'v1', endpoint: 'http://127.0.0.1:1', inferenceKey: 'fake', adminKey: 'fake' }));
  let release!: () => void;
  const drain = new Promise<void>(resolve => { release = resolve; });
  const removed: string[] = [];
  const lifecycle = new RelayFederationLifecycle(async () => desired, {
    list: async () => handles,
    start: async () => { throw Error('unexpected start'); },
    inspect: async h => {
      if (h.shardId === 'a') return { invalidCredential: true };
      const r = new CapabilityRegistry(); r.register(h.shardId, h.id, h.generation, 'openai');
      r.publishInventory(r.beginRefresh(h.shardId)!, ['A']); r.heartbeat(h.shardId, {});
      return { record: r.get(h.shardId) };
    },
    remove: async h => { removed.push(h.shardId); if (h.shardId === 'a') await drain; if (h.shardId === 'b') throw Error('fixture removal failure'); }
  });
  const timeout = setTimeout(release, 1000);
  try {
    await lifecycle.reconcile();
    assert.deepEqual(removed, ['a']);
    assert.deepEqual(lifecycle.capabilities.eligible('A').map(s => s.shardId).sort(), ['b', 'c']);
    // The first drain is still pending while useful shards are already routable.
    assert(lifecycle.handle('a'));
    release();
    const stop = lifecycle.stop(); assert.equal(lifecycle.stop(), stop);
    await assert.rejects(stop, /Failed to drain 1 owned relays/);
    assert.deepEqual(removed.sort(), ['a', 'b', 'c']);
    assert.equal(lifecycle.capabilities.eligible('A').length, 0);
  } finally { release(); clearTimeout(timeout); }
});
