/** Synthetic production-browser billing checks. No external service or account writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { IMAGE_PLAN_OFFERS } from '../src/lib/data/pricingSummary.ts';

const build = process.argv[2];
assert(build?.startsWith('/private/tmp/galx-billing-audit-'), 'Use the isolated billing validation build.');
const base = 'http://localhost:3427';
const output = path.resolve(process.env.GALX_BILLING_REVIEW_OUTPUT || '.impeccable/review/billing-pages');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['scripts/verify-auth-entry-server.cjs', build], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', data => { log += data; });
server.stderr.on('data', data => { log += data; });
const results = { complete: false, publicPages: [], billingPages: [], externalRequests: [], errors: [] };
const owner = '00000000-0000-4000-8000-000000000001';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', is_anonymous: false };
const session = {
  access_token: `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800 })).toString('base64url')}.valid`,
  refresh_token: 'fixture', expires_at: 4102444800, token_type: 'bearer', user,
};
const billing = {
  summary: { balanceUsd: 12.3456, paymentDebtUsd: 0, depositedTotalUsd: 25, lifetimeSpentUsd: 12.6544, currentMonthSpendUsd: 3.125, proofOfDepositVerified: true, autoReloadEnabled: false },
  transactions: [{ id: 'tx_fixture', type: 'deposit', description: 'Account credit added.', amountUsd: 25, balanceAfterUsd: 25, createdAt: '2026-09-15T12:00:00Z' }],
  nextCursor: null, invoices: [], hasCustomer: true, paymentsAvailable: true,
};
const plan = {
  access: 'paid_plan_required', checkoutAvailable: true, hasPaymentProfile: true,
  offers: [
    { id: 'pro', name: 'GALX Pro', audience: 'For the GALX Sites workspace.', monthlyPriceUsd: 10, checkoutAvailable: true },
    ...IMAGE_PLAN_OFFERS.map(offer => ({ id: offer.id, name: offer.name, audience: offer.audience,
      monthlyPriceUsd: offer.monthlyPrice, checkoutAvailable: true, allowance: offer.allowance })),
  ],
  subscription: { state: 'none', periodEnd: null, endsAt: null },
  imageSubscription: { state: 'none', plan: null, planName: null, allowanceConfigured: false, periodEnd: null, endsAt: null },
};

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/pricing', { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; }
    } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Fixture server failed: ' + log.slice(-2000));

  for (const route of ['/', '/pricing', '/faq']) {
    const response = await fetch(base + route);
    const html = await response.text();
    assert.equal(response.status, 200, route);
    assert.doesNotMatch(html, /Developer Tier|Prepaid Compute|Match Grant|Instant Developer|priority GPU|unlimited high-resolution|price_(?:developer|starter|growth|fleet|sovereign|hyperscale)/i, route);
    results.publicPages.push({ route, status: response.status });
  }

  for (const route of ['/alternatives', '/alternatives/openrouter', '/calculator', '/grants']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 308, route);
    assert.equal(response.headers.get('location'), '/', route);
    results.publicPages.push({ route, status: response.status, redirect: '/' });
  }

  for (const route of ['/billing', '/billing/plan', '/billing/credits', '/billing/transactions', '/billing/invoices', '/billing/payment-methods']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('cache-control') || '', /private.*no-store/);
  }

  const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 390, height: 1000 }, bypassCSP: true, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'sb-supabase-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: base, sameSite: 'Lax' }]);
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.hostname !== new URL(base).hostname) { results.externalRequests.push(url.origin); return route.abort(); }
      if (url.pathname === '/api/auth/session') return json({ valid: true, user: { id: owner, name: 'Fixture', email: user.email } });
      if (url.pathname === '/api/billing') return json(billing);
      if (url.pathname === '/api/billing/plan') return json(plan);
      if (url.pathname === '/api/developer-access') return json({ status: 'not_requested', application: null, expires_at: null, requested_at: null });
      if (url.pathname === '/api/stripe/portal') return json({ error: 'Portal unavailable in the isolated fixture.' }, 503);
      if (url.pathname.startsWith('/api/')) return json({ success: true, data: [] });
      if (url.pathname.startsWith('/v1/')) return json({ data: [] });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => results.errors.push(error.message));
    const destinations = [
      ['/billing', 'Billing overview'],
      ['/billing/plan', 'Your plan'],
      ['/billing/credits', 'Account credit'],
      ['/billing/transactions', 'Transactions'],
      ['/billing/invoices', 'Invoices'],
      ['/billing/payment-methods', 'Payment settings'],
    ];
    for (const [route, heading] of destinations) {
      await page.goto(base + route);
      await page.getByRole('heading', { name: heading, level: 1, exact: true }).waitFor();
      const main = await page.getByRole('main').first().innerText();
      assert.doesNotMatch(main, /Developer Tier|Prepaid Compute|Match Grant|Continue to checkout|Top Up Wallet|\$20\/month/i, route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' overflow');
      results.billingPages.push({ route, status: 200, overflow: false });
    }
    await page.goto(base + '/billing/plan');
    const proButton = page.getByRole('button', { name: /Choose GALX Pro · \$10\/month/ });
    assert(await proButton.isVisible());
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.textContent?.includes('Choose GALX Pro · $10/month') && !button.disabled));
    assert.equal(await proButton.isDisabled(), false);
    for (const label of ['Workshop', 'Studio', 'MAX']) {
      assert.equal(await page.getByText(label, { exact: true }).count(), 1, label);
    }
    plan.imageSubscription = { state: 'active', plan: 'workshop', planName: 'Workshop', allowanceConfigured: true,
      periodEnd: '2026-10-24T00:00:00.000Z', endsAt: null };
    await page.goto(base + '/billing/plan');
    await page.getByRole('heading', { name: 'Your Image Studio plan', exact: true }).waitFor();
    assert.match(await page.getByRole('main').first().innerText(), /100 units per month · Standard 1 unit · HD 2 units/);
    const privateCreation = page.getByRole('link', { name: 'Open private creation', exact: true });
    assert.equal(await privateCreation.getAttribute('href'), '/images/create');
    assert.match(await page.getByRole('main').first().innerText(), /Workshop · private creation only/);
    assert.doesNotMatch(await page.getByRole('main').first().innerText(), /\bcreator\b/i);
    await page.goto(base + '/billing/credits');
    assert.equal(await page.getByRole('textbox', { name: 'Custom amount' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /Continue to checkout/i }).count(), 0);
    const removed = await page.request.get(base + '/developers');
    assert.equal(removed.status(), 404);
  } finally {
    await context?.close();
    await browser.close();
  }
  assert.deepEqual(results.externalRequests, []);
  assert.deepEqual(results.errors, []);
  results.complete = true;
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  server.kill('SIGTERM');
}
