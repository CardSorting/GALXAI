import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DomainDiscoveryStore, type DiscoveryIdentity } from './domain-discovery-store';
import { SiteAddressDiscovery } from './domain-discovery';
import type { SitesCall } from './live-sites';
import { LiveSiteDomains } from './live-domains';
import { sitesDomainRoute } from '../../../../../src/lib/sites/domain-route';
import { domainWorkerRoute } from '../../../../../src/lib/sites/domain-worker';
import { SitesCloudflareDns } from '../../../../../src/lib/sites/cloudflare-dns';
import type { DomainRow } from '../../../../../src/lib/sites/domains';
import { randomUUID } from 'node:crypto';

const identity: DiscoveryIdentity = { origin: 'https://galx.ai', username: 'alice', connectionId: 'connection-1', accountUserId: 'owner-1', includeExisting: false };
const signal = new AbortController().signal;
const owner = (id: string) => ({ id, title: 'My product', status: 'active', current_user_role: 'owner', access_policy: {
  project_id: id, access_mode: 'custom', allowed_account_user_ids: ['owner-1'], external_visitor_count: 0,
  allowed_workspace_group_ids: [], allowed_tenant_group_ids: [], allowed_groups: [],
} });
function temporary() { return fs.mkdtempSync(path.join(os.tmpdir(), 'galx-address-test-')); }
test('one enrollment discovers later creations, resumes after restart and never needs a per-Site bind', async () => {
  const directory = temporary(); let store: DomainDiscoveryStore | undefined; let now = 1000;
  try {
    store = new DomainDiscoveryStore(directory, identity, () => now);
    let ids = ['existing'], ready = false; const connected: string[] = [];
    const call: SitesCall = async (tool, args) => {
      if (tool === 'sites.list_sites') { assert.equal(args.role, 'owner'); return { items: ids.map(id => ({ id })), cursor: null }; }
      assert.equal(tool, 'sites.get_site'); return owner(String(args.project_id));
    };
    const domains = { connect: async (id: string, title: string, verify: () => Promise<unknown>) => {
      await verify(); assert.equal(title, 'My product'); connected.push(id);
      return { hostname: 'my-product.alice.galx.ai', status: ready ? 'active' as const : 'pending' as const, url: null };
    } };
    let worker = new SiteAddressDiscovery(store, domains, 'owner-1', call);
    assert.equal((await worker.tick(signal)).checked, 0); // Explicit new-Sites-only baseline.
    ids = ['new-site', 'existing']; assert.equal((await worker.tick(signal)).checked, 1);
    assert.deepEqual(connected, ['new-site']);
    assert.equal((await worker.tick(signal)).checked, 0); // Persisted backoff.
    store.close(); store = new DomainDiscoveryStore(directory, identity, () => now);
    worker = new SiteAddressDiscovery(store, domains, 'owner-1', call);
    ids = ['created-while-offline', ...ids]; now += 31000; ready = true;
    assert.equal((await worker.tick(signal)).active, 2);
    assert.equal((await worker.tick(signal)).checked, 0);
    assert(!connected.includes('existing'));
  } finally { store?.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('discovery copies opaque cursors, completes pagination and retries queued work after inventory failure', async () => {
  const directory = temporary(); const store = new DomainDiscoveryStore(directory, { ...identity, includeExisting: true });
  try {
    let fail = false; const connected: string[] = [];
    const call: SitesCall = async (tool, args) => {
      if (tool !== 'sites.list_sites') return owner(String(args.project_id));
      if (fail) throw new Error('private upstream detail');
      if (!args.cursor) return { items: [{ id: 'p~1' }], cursor: 'opaque+/=cursor' };
      assert.equal(args.cursor, 'opaque+/=cursor'); return { items: [{ id: 'p~2' }, { id: 'p~1' }], cursor: null };
    };
    const domains = { connect: async (id: string) => { connected.push(id); return { hostname: 'app.alice.galx.ai', status: 'active' as const, url: 'https://app.alice.galx.ai' }; } };
    const worker = new SiteAddressDiscovery(store, domains, 'owner-1', call);
    assert.equal((await worker.tick(signal)).active, 2); assert.deepEqual(connected, ['p~1', 'p~2']);
    store.discover(['p~3']); fail = true;
    assert.deepEqual(await worker.tick(signal), { discoveryAvailable: false, checked: 1, active: 1 });
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('incomplete or cycling inventory never commits a baseline; editor and changed audience cannot allocate', async () => {
  const directory = temporary(); const store = new DomainDiscoveryStore(directory, { ...identity, includeExisting: true });
  try {
    let valid = false, calls = 0;
    const call: SitesCall = async (tool, args) => {
      if (tool === 'sites.list_sites') return { items: [{ id: 'p' }], cursor: valid ? null : 'loop' };
      return { ...owner(String(args.project_id)), current_user_role: 'editor' };
    };
    const worker = new SiteAddressDiscovery(store, { connect: async () => { calls++; throw new Error(); } }, 'owner-1', call);
    assert.deepEqual(await worker.tick(signal), { discoveryAvailable: false, checked: 0, active: 0 });
    valid = true; assert.equal((await worker.tick(signal)).checked, 1); assert.equal(calls, 0);
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('two processes cannot claim the same Site, expired leases recover and stale completions fail', () => {
  const directory = temporary(); let now = 1000;
  const one = new DomainDiscoveryStore(directory, { ...identity, includeExisting: true }, () => now);
  const two = new DomainDiscoveryStore(directory, { ...identity, includeExisting: true }, () => now);
  try {
    one.discover(['new-site']); const old = one.claim()!; assert(old); assert.equal(two.claim(), null);
    now += 300001; const recovered = two.claim()!; assert(recovered); assert.notEqual(recovered.leaseId, old.leaseId);
    assert.throws(() => one.finish(old, true), /lease_lost/); two.finish(recovered, true); assert.equal(one.claim(), null);
  } finally { one.close(); two.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('state rejects account switching and foreign databases without changing the original enrollment', () => {
  const directory = temporary(); const one = new DomainDiscoveryStore(directory, identity); one.close();
  try {
    assert.throws(() => new DomainDiscoveryStore(directory, { ...identity, accountUserId: 'different-owner' }), /sites_connection_mismatch/);
    const reopened = new DomainDiscoveryStore(directory, identity); reopened.close();
    const file = path.join(directory, 'site-addresses.sqlite'); fs.unlinkSync(file); fs.symlinkSync('/dev/null', file);
    assert.throws(() => new DomainDiscoveryStore(directory, identity), /unsafe_state_file/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('new Site flows through real discovery, attachment, enqueue, DNS retry and activation adapters without manual linking', async () => {
  const directory = temporary(); let now = 1000;
  const store = new DomainDiscoveryStore(directory, identity, () => now);
  try {
    const hostname = 'my-product.alice.galx.ai', projectId = 'created-site';
    let created = false, nativeActive = false, attached = false, adds = 0, lostWrite = true;
    const records: any[] = [];
    let row: DomainRow = { id: randomUUID(), user_id: 'account-1', username: 'alice', project_id: projectId, app_slug: 'my-product', hostname,
      status: 'reserved', plan: null, attach_started: false, lease_id: null, lease_until: null, next_check_at: null, last_error: null,
      retry_count: 0, automation_stopped: false };
    const registry = {
      reserve: async (account: string, id: string, username: string, title: string) => {
        assert.equal(account, row.user_id); assert.equal(id, projectId); assert.equal(username, 'alice'); assert.equal(title, 'My product'); return row;
      },
      get: async (account: string, id: string) => { assert.equal(account, row.user_id); assert.equal(id, projectId); return row; },
      startAttachment: async () => { if(row.attach_started)return false; row.attach_started = true; return true; },
      enqueue: async (_account: string, _id: string, plan: DomainRow['plan']) => { row = { ...row, plan, status: 'pending' }; return row; },
      claimDue: async () => row.plan && row.status === 'pending' ? [{ ...row, lease_id: randomUUID() }] : [],
      finish: async (_lease: DomainRow, active: boolean, error: string | null) => { row = { ...row, status: active ? 'active' : 'pending', last_error: error }; return row; },
    };
    const route = sitesDomainRoute({ authenticate: async request => {
      assert.equal(request.headers.get('authorization'), 'Bearer customer-session'); return { id: row.user_id };
    }, registry: () => registry as any, authorizeMutation() {} });
    const nativeDomain = { id: 'native-domain', project_id: projectId, hostname, cname_target: 'custom-domains.chatgpt.site', validation_records: [
      { name: `_openai-site-verification.${hostname}`, record_type: 'TXT', value: 'openai-site-verification=' + 'a'.repeat(40) },
    ] };
    const call: SitesCall = async (tool, args) => {
      if (tool === 'sites.list_sites') return { items: created ? [{ id: projectId }] : [], cursor: null };
      assert.equal(args.project_id, projectId);
      if (tool === 'sites.get_site') return owner(projectId);
      if (tool === 'sites.list_custom_domains') return { items: attached ? [nativeDomain] : [] };
      if (tool === 'sites.add_custom_domain') { adds++; attached = true; }
      if (tool === 'sites.refresh_custom_domain_status') nativeActive = records.length === 2;
      return nativeDomain;
    };
    const domains = new LiveSiteDomains(identity.origin, 'customer-session', identity.username, call,
      (async (url, init) => route(new Request(url, init))) as typeof fetch);
    const discovery = new SiteAddressDiscovery(store, domains, identity.accountUserId, call);
    const dns = new SitesCloudflareDns('a'.repeat(32), 'private-dns-token', (async (url, init) => {
      if (init?.method === 'POST') {
        records.push({ ...JSON.parse(String(init.body)), id: randomUUID() });
        if(lostWrite){ lostWrite = false; throw new Error('lost acknowledgement'); }
      }
      const name = new URL(String(url)).searchParams.get('name');
      return Response.json({ success: true, result: name ? records.filter(record => record.name === name) : {}, result_info: { total_pages: 1 } });
    }) as typeof fetch);
    const token = 'b'.repeat(64);
    const backend = domainWorkerRoute({ token: () => token, enabled: () => true, accounts: () => '["account-1"]',
      registry: () => registry as any, dns: () => dns, verifyHttps: async () => nativeActive });
    const process = () => backend(new Request('https://galx.ai/api/internal/sites/domains/process', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
    assert.equal((await discovery.tick(signal)).checked, 0);
    created = true; assert.equal((await discovery.tick(signal)).checked, 1); assert(row.plan); assert.equal(records.length, 0);
    assert.equal((await process()).status, 204); assert.equal(row.status, 'pending'); assert.equal(records.length, 1);
    assert.equal((await process()).status, 204); assert.equal(records.length, 2); assert.equal(row.status, 'pending');
    now += 31000; await discovery.tick(signal); assert(nativeActive);
    assert.equal((await process()).status, 204); assert.equal(row.status, 'active');
    now += 61000; assert.equal((await discovery.tick(signal)).active, 1);
    assert.equal(adds, 1); assert.equal(records.length, 2);
    assert.deepEqual(await domains.get(projectId, signal), { hostname, status: 'active', url: `https://${hostname}` });
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
