import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { domainView, type DomainRow } from '../../../../../src/lib/sites/domains';
import { LiveSiteDomains } from './live-domains';

const hostname = 'my-product.alice.galx.ai';
const registration = { domainId: 'domain-1', hostname, cnameTarget: 'custom-domains.chatgpt.site.', validationRecords: [
  { name: `_openai-site-verification.${hostname}`, record_type: 'TXT', value: 'openai-site-verification=' + 'a'.repeat(40) },
  { name: `_cf-custom-hostname.${hostname}`, record_type: 'TXT', value: randomUUID() },
] };
const row = { id: randomUUID(), user_id: 'account-1', username: 'alice', project_id: 'project-1', app_slug: 'my-product',
  hostname, status: 'reserved', plan: null, lease_id: null, lease_until: null, attach_started: false, next_check_at: null,
  last_error: 'private-relay.example' } as DomainRow;
function companionFixture(options: { listed?: boolean; lostAdd?: boolean; firstAttach?: boolean } = {}) {
  const calls: string[] = [];
  const native = { id: registration.domainId, project_id: row.project_id, hostname, cname_target: registration.cnameTarget,
    validation_records: registration.validationRecords, status: 'pending' };
  const client = new LiveSiteDomains('https://galx.ai', 'customer-session', 'alice', async (tool, args) => {
    calls.push(tool); assert.equal(args.project_id, row.project_id);
    if (tool === 'sites.list_custom_domains') return { items: options.listed ? [native] : [] };
    if (tool === 'sites.add_custom_domain' && options.lostAdd) throw new Error('lost');
    return native;
  }, (async (url: any, init: any) => {
    assert.equal(new URL(url).origin, 'https://galx.ai'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer customer-session');
    const body = init.body ? JSON.parse(init.body) : null; calls.push(body?.action || 'get');
    if (body?.action === 'configure') assert.deepEqual(body.registration, registration);
    return Response.json(domainView(row), { status: body?.action === 'attach' && options.firstAttach !== false ? 201 : 200 });
  }) as typeof fetch);
  return { client, calls };
}
test('companion reserves then attaches and configures the exact hostname under repeated ownership checks', async () => {
  const f = companionFixture(); let checks = 0;
  assert.equal((await f.client.connect(row.project_id, 'My product', async () => { checks++; }, new AbortController().signal)).hostname, hostname);
  assert.deepEqual(f.calls, ['reserve', 'sites.list_custom_domains', 'attach', 'sites.add_custom_domain', 'configure', 'sites.refresh_custom_domain_status']);
  assert(checks >= 3);
});
test('companion never re-adds a missing attachment after an ambiguous attempt', async () => {
  const f = companionFixture({ firstAttach: false });
  await assert.rejects(f.client.connect(row.project_id, 'My product', async () => {}, new AbortController().signal), /domain_attachment_needs_reconciliation/);
  assert(!f.calls.includes('sites.add_custom_domain')); assert(!f.calls.includes('configure'));
});
test('companion recovers a listed custom domain without creating another attachment', async () => {
  const f = companionFixture({ listed: true });
  await f.client.connect(row.project_id, 'Renamed product', async () => {}, new AbortController().signal);
  assert(!f.calls.includes('attach')); assert(!f.calls.includes('sites.add_custom_domain')); assert(f.calls.includes('configure'));
});
test('companion requires ownership before touching address allocation or Sites', async () => {
  const f = companionFixture(); await assert.rejects(f.client.connect(row.project_id, 'App', async () => { throw new Error('not owner'); }, new AbortController().signal));
  assert.equal(f.calls.length, 0);
});
