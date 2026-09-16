import assert from 'node:assert/strict';
import { test } from 'node:test';
import { billingReturnDestination, BILLING_PAGES } from '../src/lib/billing/navigation';
import { billingCompatibilityPath } from '../src/lib/billing/compatibility';
import { creditCheckoutAttempt, clearCreditCheckoutAttempt } from '../src/lib/billing/checkout-attempt';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test('billing has distinct task destinations and preserves existing checkout returns', () => {
  assert.equal(new Set(Object.values(BILLING_PAGES).map(page => page.href)).size, 6);
  for (const status of ['returned', 'canceled']) {
    assert.equal(billingReturnDestination(new URLSearchParams({ plan_checkout: status })), `/billing/plan?plan_checkout=${status}`);
    assert.equal(billingReturnDestination(new URLSearchParams({ checkout: status, session_id: 'cs_test_fixture' })), `/billing/credits?checkout=${status}&session_id=cs_test_fixture`);
  }
  for (const [hash, path] of [['#plan','plan'], ['#balance','credits'], ['#history','transactions'], ['#payments','payment-methods']]) assert.equal(billingReturnDestination(new URLSearchParams(), hash), '/billing/' + path);
  assert.equal(billingReturnDestination(new URLSearchParams('amount=37.25')), '/billing/credits?amount=37.25');
});

test('retired entries resolve to explicit tasks without retaining unsupported purchase plans', async () => {
  const cases = [
    ['/keys/top-up?amount=25&token=PRIVATE', '/billing/credits?amount=25'],
    ['/vault/deposit', '/billing/credits'], ['/checkout?amount=37.25', '/billing/credits?amount=37.25'],
    ['/checkout?plan=pro&amount=1', '/billing/plan'], ['/checkout?plan=lumi&amount=10', '/pricing'],
    ['/checkout?plan=pro&plan=lumi', '/pricing'], ['/lumi', '/pricing'],
    ['/checkout/success?session_id=cs_test_receipt&next=https://evil.test', '/billing/credits?checkout=returned&session_id=cs_test_receipt'],
    ['/billing/seats?tier=enterprise', '/teams/seats'], ['/billing/enterprise', '/pricing'],
  ];
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('../src/middleware');
  for (const [source, target] of cases) {
    const url = new URL(source, 'https://galx.ai');
    assert.equal(billingCompatibilityPath(url.pathname, url.searchParams), target);
    for (const method of ['GET', 'HEAD']) {
      const result = await middleware(new NextRequest(url, { method }));
      assert.equal(result.status, 307); assert.equal(result.headers.get('location'), 'https://galx.ai' + target);
      assert.equal(result.headers.get('cache-control'), 'private, no-store');
      assert.doesNotMatch(await result.text(), /PRIVATE/);
    }
  }
  for (const page of Object.values(BILLING_PAGES)) assert.equal(billingCompatibilityPath(page.href, new URLSearchParams()), null);
  const mutation = await middleware(new NextRequest('https://galx.ai/checkout?amount=25', { method: 'POST' }));
  assert.equal(mutation.headers.get('location'), null, 'Mutation requests never use bookmark redirects');
});

test('one credit form resumes account-scoped old retry records and clears both namespaces', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const id = '10000000-0000-4000-8000-000000000001', now = 10_000_000;
  data.set('galx_checkout:owner:keys:25', JSON.stringify({ id, created: now - 1000 }));
  assert.equal(creditCheckoutAttempt(storage, 'owner', 25, now), id);
  assert.equal(creditCheckoutAttempt(storage, 'owner', 25, now), id);
  assert.notEqual(creditCheckoutAttempt(storage, 'other', 25, now), id);
  assert.notEqual(creditCheckoutAttempt(storage, 'owner', 50, now), id);
  clearCreditCheckoutAttempt(storage, 'owner', 25);
  assert(!data.has('galx_checkout:owner:keys:25')); assert(!data.has('galx_checkout:owner:billing:25'));
  for (const saved of ['broken', JSON.stringify({ id, created: now - 91 * 60_000 }), JSON.stringify({ id, created: now + 1 }), JSON.stringify({ id: 'malformed', created: now })]) {
    data.set('galx_checkout:owner:billing:25', saved);
    assert.notEqual(creditCheckoutAttempt(storage, 'owner', 25, now), id);
  }
});

test('current UI has no retired billing route implementations or navigation targets', () => {
  const root = path.resolve(import.meta.dirname, '..');
  for (const route of ['keys/top-up','checkout','checkout/success','vault/deposit','lumi','billing/reports','billing/promo','billing/audit-logs','billing/auto-reload','billing/tax','billing/budget-alerts','billing/expenses','billing/webhooks','billing/enterprise','billing/seats','billing/teams','billing/teams/[id]','billing/invoices/[id]']) {
    assert.equal(existsSync(path.join(root, 'src/app', route, 'page.tsx')), false, route + ' must be middleware compatibility only');
  }
  const retired = /["'`](?:https:\/\/galx\.ai)?\/(?:keys\/top-up|checkout|lumi|vault\/deposit|billing\/(?:reports|promo|audit-logs|auto-reload|tax|budget-alerts|expenses|webhooks|enterprise|seats|teams))(?:[?/#"'`])/;
  for (const dir of ['src/app','src/components','src/cli','src/sdk','src/lib/data','src/lib/resilience']) {
    for (const name of readdirSync(path.join(root, dir), { recursive: true }) as string[]) {
      if (!/\.(ts|tsx)$/.test(name)) continue;
      assert.doesNotMatch(readFileSync(path.join(root, dir, name), 'utf8'), retired, dir + '/' + name);
    }
  }
});

test('search routes each billing intent to its task', async () => {
  const { BroccoliOmniSearch } = await import('../src/lib/resilience/BroccoliOmniSearch');
  for (const [query, target] of [['open billing','/billing'], ['manage my subscription','/billing/plan'], ['top up wallet','/billing/credits'], ['view transactions','/billing/transactions'], ['where is my invoice','/billing/invoices'], ['update my credit card','/billing/payment-methods'], ['$ invoice','/billing/invoices']]) {
    assert.equal(BroccoliOmniSearch.search(query)[0]?.href, target, query);
  }
});

test('legacy billing navigation cannot forward arbitrary destinations, secrets or malformed receipt parameters', () => {
  for (const query of ['next=https://evil.test', 'plan_checkout=https://evil.test', 'session_id=https://evil.test', 'amount=-1', 'amount=10001', 'amount=1.001', 'checkout=paid', 'session_id=a&session_id=b', 'plan_checkout=returned&plan_checkout=canceled']) assert.equal(billingReturnDestination(new URLSearchParams(query)), null);
  assert.equal(billingReturnDestination(new URLSearchParams('checkout=returned&token=PRIVATE_SENTINEL&next=https://evil.test')), '/billing/credits?checkout=returned');
  assert.equal(billingReturnDestination(new URLSearchParams('plan_checkout=returned&checkout=returned')), '/billing/plan?plan_checkout=returned');
  assert.equal(billingReturnDestination(new URLSearchParams(), '#https://evil.test'), null);
});

test('checkout returns redirect before rendering, with private headers and only supported query fields', async () => {
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('../src/middleware');
  for (const method of ['GET', 'HEAD']) {
    const response = await middleware(new NextRequest('https://galx.ai/billing?checkout=returned&session_id=cs_test_fixture&token=PRIVATE_SENTINEL', { method }));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://galx.ai/billing/credits?checkout=returned&session_id=cs_test_fixture');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(await response.text(), '');
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  for (const [source, destination] of [['/billing/reports','/billing/transactions'], ['/billing/invoices/any','/billing/invoices'], ['/billing/tax','/billing/payment-methods']]) {
    const response = await middleware(new NextRequest('https://galx.ai' + source));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://galx.ai' + destination);
  }
});
