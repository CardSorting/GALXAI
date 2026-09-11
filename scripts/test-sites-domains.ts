import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { domainPlan, domainView, siteHostname, siteSlug, siteUsername, type DomainRow } from '../src/lib/sites/domains';
import { SitesCloudflareDns, boundedDomainJson, verifySitesHttps } from '../src/lib/sites/cloudflare-dns';
import { sitesDomainRoute } from '../src/lib/sites/domain-route';

const hostname = 'my-product.alice.galx.ai';
const registration = { domainId: 'domain-1', hostname, cnameTarget: 'custom-domains.chatgpt.site.', validationRecords: [
  { name: `_openai-site-verification.${hostname}`, record_type: 'TXT', value: 'openai-site-verification=' + 'a'.repeat(40) },
  { name: `_cf-custom-hostname.${hostname}`, record_type: 'TXT', value: randomUUID() },
] };
const row = { id: randomUUID(), user_id: 'account-1', username: 'alice', project_id: 'project-1', app_slug: 'my-product',
  hostname, status: 'reserved', plan: null, lease_id: null, lease_until: null, attach_started: false, next_check_at: null,
  last_error: 'private-relay.example' } as DomainRow;
const request = (body: any, authorization = 'Bearer session') => new Request('https://galx.ai/api/sites/domains', {
  method: 'POST', headers: { authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('address labels normalize app titles while usernames require an explicit safe choice', () => {
  assert.equal(siteSlug('Café & Field Notes'), 'cafe-field-notes');
  assert.equal(siteUsername('alice-123'), 'alice-123');
  for (const bad of ['admin', 'api', 'relay', 'www', 'Alice', 'ab', 'a'.repeat(21), 'alice.galx.ai', 'xn--alice', 'alice_1']) assert.throws(() => siteUsername(bad));
  for (const bad of ['https://my-product.alice.galx.ai', 'my-product.alice.galx.ai.evil.test', 'galx.ai', '*.alice.galx.ai', 'my-product.api.galx.ai']) assert.throws(() => siteHostname(bad));
  assert.throws(() => siteSlug('你好')); assert.throws(() => siteSlug('hello\nworld'));
});
test('DNS instructions accept only the native target and validation records under the reserved hostname', () => {
  assert.equal(domainPlan(registration, hostname).records.length, 3);
  assert.deepEqual(domainPlan({ ...registration, validationRecords: [...registration.validationRecords,
    { name: null, record_type: null, value: null }] }, hostname), domainPlan(registration, hostname));
  const bad = [
    { ...registration, cnameTarget: 'attacker.example' }, { ...registration, hostname: 'other.alice.galx.ai' },
    { ...registration, provider_status: 'active' }, { ...registration, validationRecords: [] },
    { ...registration, validationRecords: [{ ...registration.validationRecords[0], name: '_openai-site-verification.galx.ai' }] },
    { ...registration, validationRecords: [{ ...registration.validationRecords[0], value: 'token\nwith-control' }] },
    { ...registration, validationRecords: [...registration.validationRecords, registration.validationRecords[0]] },
    { ...registration, validationRecords: [...registration.validationRecords, { name: null, record_type: 'TXT', value: 'partial' }] },
  ];
  for (const input of bad) assert.throws(() => domainPlan(input, hostname));
});
test('public address projection cannot reveal native identity, provider state, credentials or raw failures', () => {
  assert.deepEqual(domainView({ ...row, status: 'active', plan: domainPlan(registration, hostname) }), {
    hostname, status: 'active', url: `https://${hostname}`,
  });
  assert.deepEqual(domainView(row), { hostname, status: 'reserved', url: null });
});
test('streaming JSON intake enforces byte limits and releases a stalled reader on cancellation', async () => {
  await assert.rejects(boundedDomainJson(new Response('a'.repeat(8193)), 8192));
  const controller = new AbortController(); let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const pending = boundedDomainJson(new Response(stream), 8192, controller.signal);
  controller.abort(); await assert.rejects(pending); assert(cancelled);
});

function dnsFixture(initial: any[] = []) {
  const records = [...initial], calls: any[] = []; let loseWrite = false;
  const fetcher = async (url: any, init: any) => {
    const parsed = new URL(String(url)); calls.push({ url: parsed, init });
    assert.equal(parsed.origin, 'https://api.cloudflare.com');
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Authorization, 'Bearer private-test-token');
    if (init.method === 'POST') {
      const body = JSON.parse(init.body); records.push({ id: randomUUID(), ...body });
      if (loseWrite) { loseWrite = false; throw new Error('lost acknowledgement'); }
      return Response.json({ success: true, result: body });
    }
    return Response.json({ success: true, result: records.filter(r => r.name === parsed.searchParams.get('name')), result_info: { total_pages: 1 } });
  };
  return { records, calls, loseNextWrite: () => { loseWrite = true; }, dns: new SitesCloudflareDns('a'.repeat(32), 'private-test-token', fetcher as typeof fetch) };
}
test('DNS recovery adopts only its exact managed records after a lost write acknowledgement', async () => {
  const f = dnsFixture(), plan = domainPlan(registration, hostname), signal = new AbortController().signal;
  f.loseNextWrite(); await assert.rejects(f.dns.ensure(plan, row.id, signal));
  await f.dns.ensure(plan, row.id, signal); await f.dns.ensure(plan, row.id, signal);
  assert.equal(f.records.length, 3);
  assert(f.records.every(r => r.proxied === false && r.ttl === 300 && r.comment === `galx-sites-domain-v1:${row.id}`));
  assert.equal(f.calls.filter(c => c.init.method === 'POST').length, 3);
});
test('DNS rejects an unrelated record before writing anything and never overwrites it', async () => {
  const existing = { type: 'A', name: hostname, content: '192.0.2.4', proxied: false, comment: 'unrelated' };
  const f = dnsFixture([existing]);
  await assert.rejects(f.dns.ensure(domainPlan(registration, hostname), row.id, new AbortController().signal), /dns_conflict/);
  assert.equal(f.calls.filter(c => c.init.method === 'POST').length, 0); assert.deepEqual(f.records, [existing]);
});
test('DNS rejects truncated, oversized and failed provider responses without forwarding diagnostics', async () => {
  for (const response of [Response.json({ success: false, errors: [{ message: 'private secret' }] }, { status: 403 }),
    new Response('a'.repeat(131073)), Response.json({ success: true, result: [], result_info: { total_pages: 2 } })]) {
    const dns = new SitesCloudflareDns('a'.repeat(32), 'private-test-token', (async () => response) as typeof fetch);
    await assert.rejects(dns.ensure(domainPlan(registration, hostname), row.id, new AbortController().signal), e => !String(e).includes('private secret'));
  }
});

test('HTTPS readiness permits private authentication without forwarding credentials or following redirects', async () => {
  for (const status of [200, 302, 401, 403, 404, 500]) {
    const ready = await verifySitesHttps(hostname, new AbortController().signal, (async (url, init) => {
      assert.equal(url, `https://${hostname}/`); assert.equal(init?.method, 'HEAD');
      assert.equal(init?.redirect, 'manual'); assert.equal(init?.headers, undefined);
      return new Response(null, { status });
    }) as typeof fetch);
    assert.equal(ready, [200, 302, 401].includes(status));
  }
  assert.equal(await verifySitesHttps(hostname, new AbortController().signal, (async () => { throw new Error('certificate invalid'); }) as typeof fetch), false);
});

test('anonymous, cookie-only and invalid sessions cannot reach the registry or DNS', async () => {
  let touched = 0;
  const handle = sitesDomainRoute({ authenticate: async () => { throw new Error('private auth detail'); }, registry: () => { touched++; throw new Error(); },
    authorizeMutation() { touched++; }, dns() { touched++; throw new Error(); }, verifyHttps: async () => { touched++; return true; } });
  for (const auth of ['', 'Basic session', 'Bearer bad']) {
    const response = await handle(request({ action: 'reserve' }, auth));
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: { code: 'sign_in_required' } });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal(touched, 0);
});
test('route binds all operations to verified identity and ignores client claims of readiness', async () => {
  let dnsCalls = 0, httpsCalls = 0; let current = { ...row };
  const registry = {
    get: async (owner: string, id: string) => { assert.equal(owner, row.user_id); assert.equal(id, row.project_id); return current; },
    claim: async (owner: string, id: string, plan: any) => { assert.equal(owner, row.user_id); current = { ...current, plan }; return current; },
    finish: async (_row: any, active: boolean) => current = { ...current, status: active ? 'active' : 'pending' },
  };
  const handle = sitesDomainRoute({ authenticate: async () => ({ id: row.user_id }), registry: () => registry as any, authorizeMutation() {},
    dns: () => ({ ensure: async () => { dnsCalls++; } }), verifyHttps: async () => { httpsCalls++; return false; } });
  for (const extra of [{ userId: 'other' }, { status: 'active' }, { registration: { ...registration, status: 'active' } }]) {
    const response = await handle(request({ action: 'configure', projectId: row.project_id, registration, ...extra }));
    assert.equal(response.status, 400);
  }
  assert.equal(dnsCalls, 0);
  const response = await handle(request({ action: 'configure', projectId: row.project_id, registration }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { hostname, status: 'pending', url: null });
  assert.equal(dnsCalls, 1); assert.equal(httpsCalls, 1);
});
test('paused admission still permits owner status reads without DNS configuration', async () => {
  const handle = sitesDomainRoute({ authenticate: async () => ({ id: row.user_id }), registry: () => ({ get: async () => row }) as any,
    authorizeMutation() { throw new Error('disabled'); }, dns() { throw new Error('secret'); }, verifyHttps: async () => false });
  const get = await handle(new Request(`https://galx.ai/api/sites/domains?projectId=${row.project_id}`, { headers: { Authorization: 'Bearer session' } }));
  assert.deepEqual(await get.json(), domainView(row));
  const post = await handle(request({ action: 'reserve', projectId: row.project_id, username: 'alice', appName: 'App' }));
  assert.equal(post.status, 503); assert.deepEqual(await post.json(), { error: { code: 'domain_unavailable' } });
});
