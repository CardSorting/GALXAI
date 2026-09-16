/** Synthetic production-browser billing checks. No external service or account writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const build = process.argv[2];
assert(build?.startsWith('/private/tmp/galx-billing-audit-'), 'Use the isolated billing validation build.');
const base = 'http://localhost:3427';
const output = path.resolve(process.env.GALX_BILLING_REVIEW_OUTPUT || '.impeccable/review/billing-pages');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['scripts/verify-auth-entry-server.cjs', build], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', browser;
server.stdout.on('data', data => { log += data; }); server.stderr.on('data', data => { log += data; });
const results = { complete: false, http: [], layouts: [], interactions: [], externalRequests: [] };
const owner = '00000000-0000-4000-8000-000000000001';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture' }, identities: [], created_at: '2026-09-13T00:00:00Z' };
const session = { access_token: `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800 })).toString('base64url')}.valid`, refresh_token: 'fixture', expires_at: 4102444800, token_type: 'bearer', user };
const noPlan = () => ({ access: 'paid_plan_required', checkoutAvailable: true, hasPaymentProfile: true, subscription: { state: 'none', periodEnd: null, endsAt: null } });
const billing = { summary: { balanceUsd: 12.3456, paymentDebtUsd: 0, depositedTotalUsd: 25, lifetimeSpentUsd: 12.6544, currentMonthSpendUsd: 3.125, proofOfDepositVerified: true, autoReloadEnabled: false }, transactions: [{ id: 'tx_fixture', type: 'deposit', description: 'Account credit added.', amountUsd: 25, balanceAfterUsd: 25, createdAt: '2026-09-15T12:00:00Z' }], nextCursor: null, invoices: [{ id: 'in_fixture', amountDueUsd: 20, amountPaidUsd: 20, status: 'paid', url: 'https://invoice.stripe.com/i/fixture', createdAt: '2026-09-15T12:00:00Z' }], hasCustomer: true, paymentsAvailable: true };
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/pricing', { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Fixture server failed: ' + log.slice(-2000));
  for (const route of ['/api/billing/plan', '/api/billing', '/api/stripe/portal']) {
    for (const auth of ['', 'Bearer forged']) {
      const post = route.endsWith('/portal');
      const response = await fetch(base + route, { method: post ? 'POST' : 'GET', headers: { ...(auth ? { authorization: auth } : {}), origin: base, ...(post ? { 'content-type': 'application/json' } : {}) }, ...(post ? { body: '{}' } : {}) });
      assert([401, 403].includes(response.status), `${route}: ${response.status}`);
      const body = await response.text(); assert.doesNotMatch(body, /PRIVATE_|DATABASE_URL|stripe_customer_id|secret/);
      results.http.push({ route, auth: auth ? 'forged' : 'absent', status: response.status });
    }
  }
  for (const route of ['/billing', '/billing/plan', '/billing/credits', '/billing/transactions', '/billing/invoices', '/billing/payment-methods']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') || '', /private.*no-store/);
    assert.doesNotMatch(await response.text(), /PRIVATE_|tx_fixture|in_fixture|fixture@example/);
    results.http.push({ route, auth: 'absent', status: response.status, privateCache: true });
  }
  for (const [route, expected] of [['/billing?plan_checkout=returned','/billing/plan?plan_checkout=returned'], ['/billing?checkout=returned&session_id=cs_test_fixture','/billing/credits?checkout=returned&session_id=cs_test_fixture'], ['/billing/reports','/billing/transactions'], ['/billing/invoices/old','/billing/invoices'], ['/keys/top-up?amount=37.25&token=PRIVATE_SENTINEL','/billing/credits?amount=37.25'], ['/checkout?amount=50','/billing/credits?amount=50'], ['/checkout?plan=pro','/billing/plan'], ['/checkout?plan=lumi','/pricing'], ['/checkout/success?session_id=cs_test_fixture','/billing/credits?checkout=returned&session_id=cs_test_fixture'], ['/lumi','/pricing'], ['/vault/deposit?amount=25&token=PRIVATE_SENTINEL','/billing/credits?amount=25']]) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 307, route);
    assert.equal(new URL(response.headers.get('location'), base).pathname + new URL(response.headers.get('location'), base).search, expected);
    const body = await response.text();
    assert(body === '' || body === response.headers.get('location'), 'redirect response contains only its public destination');
    results.http.push({ route, status: response.status, destination: expected });
  }
  const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
  const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const width of [390, 320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, bypassCSP: true, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'sb-supabase-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: base, sameSite: 'Lax' }]);
    const state = { billing: structuredClone(billing), session: { verified: false, status: 'open' }, reads: [], plan: noPlan(), planError: false, billingError: false, posts: [], holdNext: false, release: null };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.hostname === 'supabase.invalid') return json(url.pathname.endsWith('/user') ? user : session);
      if (url.origin !== base) { results.externalRequests.push(url.origin); return route.abort(); }
      if (url.pathname === '/api/auth/session') return json({ valid: true, user: { id: owner, name: 'Fixture', email: user.email } });
      if (url.pathname === '/api/billing/plan') {
        if (request.method() === 'POST') { state.posts.push(request.postDataJSON()); return json({ error: 'Could not open billing. Please try again.' }, 503); }
        const value = structuredClone(state.plan);
        if (state.holdNext) { state.holdNext = false; await new Promise(resolve => { state.release = resolve; }); }
        try { return await json(state.planError ? { error: 'PRIVATE_PROVIDER_SENTINEL' } : value, state.planError ? 503 : 200); } catch { return; }
      }
      if (url.pathname === '/api/billing') { state.reads.push(url.search); return json(state.billingError ? { error: 'PRIVATE_BILLING_SENTINEL' } : state.billing, state.billingError ? 503 : 200); }
      if (url.pathname === '/api/billing/quote') { const amount = Number(url.searchParams.get('amount')); return json({ amountUsd: amount, creditUsd: amount + 5, bonusUsd: 5 }); }
      if (url.pathname === '/api/stripe/checkout') { state.posts.push(request.postDataJSON()); return json({ error: 'Could not open checkout. Try again.' }, 503); }
      if (url.pathname === '/api/stripe/portal') { state.posts.push({ action: 'payment-settings' }); return json({ error: 'Could not open payment settings. Try again.' }, 503); }
      if (url.pathname === '/api/stripe/session') return json({ session: state.session });
      if (url.pathname === '/api/billing/generation-quota') return json({ plan: 'free', quota: { sites: 1, images: 5, siteTurns: 3 }, availability: { sites: 'available', images: 'available' } });
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) return json({ success: true, data: [], balance: 0, balanceUsd: 0 });
      return route.continue();
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const inspect = async name => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + ' overflow');
      assert.doesNotMatch(await page.locator('main').innerText(), /PRIVATE_PROVIDER_SENTINEL|PRIVATE_BILLING_SENTINEL|stripe_customer_id|galxPlan|paid_price_ids/);
      const audit = await new AxeBuilder({ page }).include('main').include('aside').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(audit.violations.map(v => ({ id: v.id, impact: v.impact })), [], name + ' accessibility');
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      results.layouts.push({ state: name, width, overflow: false, axeViolations: 0 });
    };
    const nav = page.getByRole('navigation', { name: 'Billing', exact: true });
    const destinations = [['Overview', '/billing', 'Billing overview'], ['Plan', '/billing/plan', 'Your plan'], ['Credits', '/billing/credits', 'Credits'], ['Transactions', '/billing/transactions', 'Transactions'], ['Invoices', '/billing/invoices', 'Invoices'], ['Payment settings', '/billing/payment-methods', 'Payment settings']];
    for (const [label, route, title] of destinations) {
      await page.goto(base + route);
      await page.getByRole('heading', { name: title, level: 1, exact: true }).waitFor();
      if (route === '/billing/plan') await page.getByRole('button', { name: 'Choose Pro · $20/month', exact: true }).waitFor();
      else await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Refresh' && !button.disabled));
      assert.equal(await nav.getByRole('link', { name: label, exact: true }).getAttribute('aria-current'), 'page');
      assert.equal(await nav.locator('[aria-current="page"]').count(), 1);
      await inspect(label.toLowerCase().replaceAll(' ', '-'));
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      await page.screenshot({ path: path.join(output, `reflow-${label.toLowerCase().replaceAll(' ', '-')}-${width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label + ' 200% reflow');
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
    // Overview refresh must update both visible account summaries.
    await nav.getByRole('link', { name: 'Overview', exact: true }).click();
    await page.getByText('Choose Pro for continuing Sites creation and publishing.', { exact: true }).waitFor();
    const priorReads = state.reads.length;
    state.plan = { access: 'included', checkoutAvailable: false, hasPaymentProfile: true, subscription: { state: 'ending', periodEnd: '2026-10-15T12:00:00Z', endsAt: '2026-10-15T12:00:00Z' } };
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByText('Your subscription is set to end. Pro access is still active.', { exact: true }).waitFor();
    assert(state.reads.length > priorReads, 'Overview refresh also reloads credit');
    await inspect('overview-refreshed');
    state.plan = noPlan();
    // A previous API-key checkout resumes its identity after the route migration.
    const legacyAttempt = '10000000-0000-4000-8000-000000000001';
    await page.evaluate(({ owner, legacyAttempt }) => sessionStorage.setItem(`galx_checkout:${owner}:keys:37.25`, JSON.stringify({ id: legacyAttempt, created: Date.now() })), { owner, legacyAttempt });
    // Focused pages do not repeat unrelated forms or history.
    await nav.getByRole('link', { name: 'Credits', exact: true }).click();
    await page.getByLabel('Custom amount', { exact: true }).fill('37.25');
    await page.getByText('$42.25', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Transaction type').count(), 0);
    await page.getByRole('button', { name: 'Continue to checkout', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not open checkout' }).waitFor();
    const firstAttempt = state.posts.at(-1).requestId;
    assert.equal(firstAttempt, legacyAttempt, 'Retired keys checkout identity survives consolidation');
    assert.equal(state.posts.at(-1).surface, undefined, 'Modern checkout has no surface selector');
    await nav.getByRole('link', { name: 'Transactions', exact: true }).click();
    await page.getByLabel('Transaction type').selectOption('deposit');
    await page.getByRole('button', { name: 'Export loaded rows' }).waitFor();
    await nav.getByRole('link', { name: 'Credits', exact: true }).click();
    assert.equal(await page.getByLabel('Custom amount', { exact: true }).inputValue(), '37.25');
    await page.getByRole('button', { name: 'Continue to checkout', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not open checkout' }).waitFor();
    assert.equal(state.posts.at(-1).requestId, firstAttempt, 'cross-page draft and retry identity');
    await page.goBack(); await page.getByLabel('Transaction type').waitFor();
    await page.goForward();
    assert.equal(await page.getByLabel('Custom amount', { exact: true }).inputValue(), '37.25');
    state.billingError = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Showing your last checked billing details' }).waitFor();
    assert.equal(await page.getByLabel('Custom amount', { exact: true }).inputValue(), '37.25');
    assert.equal(await page.getByRole('button', { name: 'Continue to checkout', exact: true }).isDisabled(), true);
    await nav.getByRole('link', { name: 'Payment settings', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open payment settings', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Open payment settings', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not open payment settings' }).waitFor();
    state.billingError = false;
    state.plan = { access: 'included', checkoutAvailable: false, hasPaymentProfile: true, subscription: { state: 'ending', periodEnd: '2026-10-15T12:00:00Z', endsAt: '2026-10-15T12:00:00Z' } };
    await nav.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.getByText('Subscription ends', { exact: true }).waitFor();
    await inspect('ending');
    state.planError = true;
    await page.getByRole('button', { name: 'Refresh plan', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Showing your last checked plan.' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Manage subscription', exact: true }).isEnabled(), true);
    state.planError = false;
    state.plan = { ...noPlan(), checkoutAvailable: false, subscription: { state: 'payment_required', periodEnd: null, endsAt: null } };
    await page.getByRole('button', { name: 'Refresh plan', exact: true }).click();
    await page.getByRole('button', { name: 'Review payment', exact: true }).waitFor();
    await inspect('payment-required');
    await page.getByRole('button', { name: 'Review payment', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not open billing.' }).waitFor();
    assert.equal(state.posts.at(-1).action, 'portal');
    state.plan = noPlan();
    await page.goto(base + '/billing?plan_checkout=returned#plan');
    await page.getByText('Confirming your subscription… This can take a moment.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/billing/plan');
    assert.equal(await page.getByRole('button', { name: 'Choose Pro · $20/month', exact: true }).isDisabled(), true);
    state.plan = { ...noPlan(), access: 'included', checkoutAvailable: false, hasPaymentProfile: false };
    await page.getByRole('button', { name: 'Refresh plan', exact: true }).click();
    await page.getByRole('link', { name: 'Open Sites', exact: true }).waitFor();
    assert.equal(await page.getByText('Current billing period ends', { exact: true }).count(), 0);
    await page.goto(base + '/billing?plan_checkout=canceled#plan');
    await page.getByText('Checkout was closed. You can resume when you’re ready.', { exact: true }).waitFor();
    state.plan = noPlan(); state.holdNext = true;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    for (let i = 0; i < 50 && !state.release; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert(state.release);
    state.plan = { ...noPlan(), access: 'included', checkoutAvailable: false, subscription: { state: 'active', periodEnd: '2026-10-15T12:00:00Z', endsAt: null } };
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByText('Current billing period ends', { exact: true }).waitFor();
    state.release();
    await page.waitForTimeout(100);
    assert.equal(await page.getByRole('link', { name: 'Open Sites', exact: true }).count(), 1);
    // A pending receipt survives moving through the billing navigation.
    await page.goto(base + '/billing?checkout=returned&session_id=cs_test_fixture');
    await page.getByText('Confirming your payment…', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/billing/credits');
    assert.equal(await page.getByRole('button', { name: 'Continue to checkout', exact: true }).count(), 0);
    await nav.getByRole('link', { name: 'Invoices', exact: true }).click();
    await page.getByRole('heading', { name: 'Invoices', level: 1, exact: true }).waitFor();
    assert.match(await nav.getByRole('link', { name: 'Credits', exact: true }).getAttribute('href'), /session_id=cs_test_fixture/);
    await nav.getByRole('link', { name: 'Credits', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/billing/credits');
    assert.equal(new URL(page.url()).searchParams.get('session_id'), 'cs_test_fixture');
    await page.getByText('Confirming your payment…', { exact: true }).waitFor();
    await nav.getByRole('link', { name: 'Overview', exact: true }).click();
    await page.getByRole('link', { name: 'Add credit', exact: true }).click();
    await page.getByText('Confirming your payment…', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Continue to checkout', exact: true }).count(), 0);
    state.session = { verified: true, status: 'complete', amountTotalUsd: 37.25, creditUsd: 42.25 };
    await page.getByText('Payment confirmed. $42.25 credit added.', { exact: true }).waitFor();
    // Empty history and a missing payment profile have useful, distinct recovery paths.
    state.billing = { ...structuredClone(billing), transactions: [], invoices: [], hasCustomer: false };
    await page.goto(base + '/billing/transactions');
    await page.getByRole('heading', { name: 'No transactions yet', exact: true }).waitFor();
    await inspect('empty-transactions');
    await nav.getByRole('link', { name: 'Invoices', exact: true }).click();
    await page.getByRole('heading', { name: 'No invoices yet', exact: true }).waitFor();
    await nav.getByRole('link', { name: 'Payment settings', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open payment settings', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('link', { name: 'Explore Pro', exact: true }).count(), 1);
    for (const [hash, route] of [['#plan','/billing/plan'], ['#balance','/billing/credits'], ['#history','/billing/transactions'], ['#payments','/billing/payment-methods']]) {
      await page.goto(base + '/billing' + hash);
      await page.waitForURL('**' + route);
    }
    assert.deepEqual(errors, [], 'browser errors');
    results.interactions.push({ width, separateDestinations: true, overviewRefreshesPlanAndCredit: true, draftAndRetryAcrossPages: true, retiredKeyRetryPreserved: true, lastKnownBilling: true, managementAfterFailure: true, returnDoesNotGrantAccess: true, complimentaryDateAbsent: true, staleReadIgnored: true, pendingReceiptNavigation: true, emptyStates: true, legacyAnchors: true, textReflow200: true });
    await context.close();
  }
  results.complete = true;
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  await browser?.close();
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else { server.once('exit', resolve); setTimeout(resolve, 4000).unref(); } });
}
