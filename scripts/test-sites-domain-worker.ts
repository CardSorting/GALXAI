import assert from 'node:assert/strict';
import test from 'node:test';
import { domainWorkerRoute } from '../src/lib/sites/domain-worker';
import { SiteDomainError } from '../src/lib/sites/domains';
import { tick } from '../workers/sites-domains';

const token = 'a'.repeat(64), url = 'https://galx.ai/api/internal/sites/domains/process';
test('managed publication discovery needs no native account enrollment',async()=>{
  let claimed=false;
  const handle=domainWorkerRoute({token:()=>token,enabled:()=>true,accounts:()=>undefined,includeManaged:()=>true,
    registry:()=>({claimDue:async(accounts:string[],limit:number,managed:boolean)=>{assert.deepEqual(accounts,[]);assert.equal(limit,4);assert.equal(managed,true);claimed=true;return[];}}) as any,
    dns:()=>({ensure:async()=>{}}),verifyHttps:async()=>false});
  const response=await handle(new Request(url,{method:'POST',headers:{Authorization:`Bearer ${token}`}}));assert.equal(response.status,204);assert(claimed);
});
const request = (authorization = `Bearer ${token}`, extra: RequestInit = {}, suffix = '') => new Request(url + suffix, {
  method: 'POST', ...extra, headers: { authorization, cookie: 'admin=true; session=customer', ...extra.headers },
});
function fixture() {
  let claims = 0, probes = 0, enabled = true, cohort = '["alice"]';
  const finishes: any[] = [], started: string[] = [];
  const handle = domainWorkerRoute({ token: () => token, enabled: () => enabled, accounts: () => cohort,
    registry: () => ({
      claimDue: async (accounts: string[], limit: number) => {
        claims++; assert.deepEqual(accounts, ['alice']); assert.equal(limit, 4);
        return ['ready', 'pending', 'conflict', 'network'].map(id => ({ id, hostname: 'app.alice.galx.ai', plan: { domainId: id } }));
      },
      finish: async (row: any, active: boolean, error: string | null) => { finishes.push({ id: row.id, active, error }); },
    }) as any,
    dns: () => ({ ensure: async (plan, _id, signal) => {
      assert(!signal.aborted); started.push(plan.domainId);
      if (plan.domainId === 'conflict') throw new SiteDomainError('dns_conflict');
      if (plan.domainId === 'network') throw new Error('credential-token private upstream diagnostics');
    } }),
    verifyHttps: async () => ++probes === 1,
  });
  return { handle, finishes, started, claims: () => claims, disable: () => { enabled = false; }, cohort: (s: string) => { cohort = s; } };
}
test('worker authority rejects anonymous, customer, forged admin and wrong machine tokens before database access', async () => {
  const f = fixture();
  for (const value of ['', 'Bearer customer-jwt', 'Bearer ' + 'b'.repeat(64), 'Bearer ' + 'a'.repeat(63), 'Basic ' + token]) {
    const response = await f.handle(request(value));
    assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error: { code: 'sign_in_required' } });
  }
  assert.equal(f.claims(), 0);
});
test('worker accepts no submitted scope, rejects wrong methods and fails closed on configuration', async () => {
  const f = fixture();
  for (const [req, status] of [[request(undefined, { method: 'GET' }), 405],
    [request(undefined, { body: '{"account":"attacker"}' }), 400], [request(undefined, {}, '?limit=100'), 400]] as const) {
    assert.equal((await f.handle(req)).status, status);
  }
  for (const raw of ['[]', '["alice","alice"]', '["alice",null]', '{"admin":true}', 'bad']) {
    f.cohort(raw); assert.equal((await f.handle(request())).status, 503);
  }
  f.cohort('["alice"]'); f.disable(); assert.equal((await f.handle(request())).status, 503); assert.equal(f.claims(), 0);
});
test('a batch settles every lease independently and emits no operational records', async () => {
  const f = fixture(), response = await f.handle(request());
  assert.equal(response.status, 204); assert.equal(await response.text(), ''); assert.equal(f.claims(), 1);
  assert.equal(f.started.length, 4); assert.equal(f.finishes.length, 4);
  assert(f.finishes.some(row => row.error === 'dns_conflict'));
  assert(f.finishes.some(row => row.error === 'domain_unavailable'));
  assert(f.finishes.some(row => row.error === 'https_pending' && row.active === false));
  assert.equal(f.finishes.filter(row => row.active).length, 1);
  assert(!JSON.stringify(f.finishes).includes('credential-token'));
});
test('an empty POST stream is accepted, including adapters that provide a zero-length request body', async () => {
  const f = fixture(); const response = await f.handle(request(undefined, { body: '' }));
  assert.equal(response.status, 204); assert.equal(f.claims(), 1);
});
test('expired completion or lost database acknowledgement remains recoverable without leaking failure details', async () => {
  const handle = domainWorkerRoute({ token: () => token, enabled: () => true, accounts: () => '["alice"]',
    registry: () => ({ claimDue: async () => [{ plan: {}, hostname: 'app.alice.galx.ai' }],
      finish: async () => { throw new Error('private database URL'); } }) as any,
    dns: () => ({ ensure: async () => {} }), verifyHttps: async () => false });
  const response = await handle(request()); assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: { code: 'domain_unavailable' } });
});
test('scheduler sends only machine authority to the fixed origin, refuses redirects and discards response bodies', async () => {
  let cancelled = false;
  await tick(token, (async (target, init) => {
    assert.equal(target, url); assert.equal(init?.method, 'POST'); assert.equal(init?.redirect, 'manual');
    assert.equal(init?.body, undefined); assert.deepEqual(init?.headers, { Authorization: `Bearer ${token}` });
    assert(init.signal); return new Response(null, { status: 204 });
  }) as typeof fetch);
  await assert.rejects(tick(token, (async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 503 })) as typeof fetch), /domain_worker_unavailable/);
  assert(cancelled);
  for (const location of [url, 'https://galx.ai/sign-in', 'https://vercel.com/sso-api?private=secret', 'https://attacker.example/']) {
    let calls = 0;
    await assert.rejects(tick(token, (async () => {
      calls++; return new Response('private upstream diagnostics', { status: 302, headers: { location } });
    }) as typeof fetch), error => {
      assert.equal((error as Error).message, 'domain_worker_unavailable');
      assert(!JSON.stringify(error).includes('secret')); assert(!JSON.stringify(error).includes('attacker'));
      return true;
    });
    assert.equal(calls, 1);
  }
  await assert.rejects(tick('bad', (async () => { throw new Error('must not call'); }) as typeof fetch), /domain_worker_unavailable/);
});
test('scheduler preserves the runtime fetch receiver', async t => {
  t.mock.method(globalThis, 'fetch', async function (this: unknown) {
    assert.equal(this, globalThis); return new Response(null, { status: 204 });
  });
  await tick(token);
});
test('managed publishing prepares the host before DNS and requires its own exact-content readiness probe', async () => {
  for (const mode of ['ready','pending','conflict','missing-adapter']) {
    const actions:string[]=[],finishes:any[]=[];
    const handle=domainWorkerRoute({token:()=>token,enabled:()=>true,accounts:()=>'["alice"]',
      registry:()=>({claimDue:async()=>[{id:'managed',hostname:'app.alice.galx.ai',plan:{kind:'managed'}}],finish:async(_:unknown,active:boolean,error:string)=>finishes.push({active,error})}) as any,
      dns:()=>({ensure:async()=>{actions.push('dns');}}),verifyHttps:async()=>{throw new Error('Native probe must not run');},
      ...(mode==='missing-adapter'?{}:{prepareManagedHost:async()=>{actions.push('host');if(mode==='conflict')throw new SiteDomainError('dns_conflict');},verifyManagedHttps:async()=>{actions.push('content');return mode==='ready';}})});
    const response=await handle(request());assert.equal(response.status,204);assert.equal(await response.text(),'');
    assert.deepEqual(actions,mode==='missing-adapter'?[]:mode==='conflict'?['host']:['host','dns','content']);
    assert.equal(finishes[0].active,mode==='ready');
  }
});
