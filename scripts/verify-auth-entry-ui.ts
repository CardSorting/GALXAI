/** Run against the isolated compiled server and its synthetic Auth-service fixture.
 * Localhost only; every browser Auth/API request is intercepted. No real email/account activity.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3427';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const output = path.resolve(process.env.GALX_AUTH_REVIEW_OUTPUT || '.impeccable/review/auth-entry');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const owner = '00000000-0000-4000-8000-000000000001';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', is_anonymous: false, email: 'fixture@example.test', email_confirmed_at: '2026-09-13T00:00:00Z', created_at: '2026-09-13T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { name: 'Fixture' }, identities: [] };
const token = (suffix: string) => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800, jti: crypto.randomUUID() })).toString('base64url')}.${suffix}`;
const session = (suffix: string) => ({ access_token: token(suffix), refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user });
const evidence: any[] = [];
async function setup(width = 1440, suffix?: string) {
  // Production CSP upgrades HTTP and excludes the fake .invalid Auth host. The
  // local interaction fixture bypasses it; raw HTTP tests check real headers separately.
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 900 : 1000 }, reducedMotion: 'reduce', bypassCSP: true });
  if (suffix) await context.addCookies([{ name: 'sb-supabase-auth-token', value: `base64-${Buffer.from(JSON.stringify(session(suffix))).toString('base64url')}`, url: base, sameSite: 'Lax' }]);
  const state = { passwordStatus: 400, otpStatus: 200, logoutStatus: 200, libraryStatus: 200, sitesStatus: 200, profileCalls: 0, profileOnHold: null as (() => void) | null, profileHold: null as Promise<void> | null, passwordCalls: 0, otp: [] as any[], posts: [] as string[], hold: null as Promise<void> | null };
  await context.route('**/*', async (route: any) => {
    const request = route.request(), url = new URL(request.url());
    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, body: JSON.stringify(value) });
    if (url.hostname === 'supabase.invalid' && url.pathname.startsWith('/auth/v1/')) {
      if (url.pathname.endsWith('/user')) return json(user);
      if (url.pathname.endsWith('/token')) { state.passwordCalls++; if (state.hold) await state.hold; return state.passwordStatus === 200 ? json(session('valid')) : json({ code: 'invalid_credentials', msg: 'PRIVATE_AUTH_SENTINEL' }, state.passwordStatus); }
      if (url.pathname.endsWith('/otp')) { state.otp.push({ body: request.postDataJSON(), redirectTo: url.searchParams.get('redirect_to') }); return state.otpStatus === 200 ? json({}) : json({ code: 'user_not_found', msg: 'PRIVATE_AUTH_SENTINEL' }, 400); }
      if (url.pathname.endsWith('/logout')) return json({});
      return route.abort();
    }
    if (url.origin !== new URL(base).origin) return route.abort();
    if (request.method() === 'POST') state.posts.push(url.pathname);
    if (url.pathname === '/api/auth/session') {
      if (request.method() === 'GET') {
        state.profileCalls++;
        if (state.profileHold) { const hold = state.profileHold; state.profileHold = null; state.profileOnHold?.(); await hold; try { return await json({ valid: true, user: { id: owner, email: user.email, name: 'Fixture' } }); } catch { return; } }
      }
      return request.method() === 'DELETE' && state.logoutStatus !== 200 ? json({ error: 'PRIVATE_AUTH_SENTINEL' }, state.logoutStatus) : route.continue();
    }
    if (url.pathname === '/api/images/library') return state.libraryStatus === 200 ? json({ success: true, records: [], total: 0, nextCursor: null }) : json({ error: 'PRIVATE_AUTH_SENTINEL' }, state.libraryStatus);
    if (url.pathname === '/api/sites/workspace') return state.sitesStatus === 200 ? json({ setup: { access: 'included', publishing: 'available', username: null }, sites: [], site: null }) : json({ error: 'PRIVATE_AUTH_SENTINEL' }, state.sitesStatus);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) return json({ success: true, data: [], balance: 0, balanceUsd: 0 });
    return route.continue();
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  return { context, page, state, errors };
}
async function inspect(page: any, label: string, scope = 'main') {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
  assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_AUTH_SENTINEL|SOC 2|Zero PHI/);
  const analysis = await new AxeBuilder({ page }).setLegacyMode(true).include(scope).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).options({ iframes: false }).analyze();
  const violations = analysis.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n: any) => n.target) }));
  if (!process.env.GALX_AUTH_NO_CAPTURE) await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true });
  evidence.push({ label, violations });
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(evidence, null, 2));
  assert.deepEqual(violations, [], `${label}: accessibility`);
}
try {
  if (!process.env.GALX_AUTH_LIFECYCLE_ONLY) {
  for (const width of [1440, 390]) {
    const { context, page, state } = await setup(width);
    state.passwordStatus = 200;
    await context.addCookies([{ name:'galx_session',value:'galx_sess_retired',url:base,httpOnly:true,sameSite:'Lax' }]);
    await page.goto(base+'/sites?starter=portfolio&refine=1');
    await page.getByText('For your security, sign in again with your GALX account.',{exact:false}).waitFor();
    await inspect(page,`replace-session-${width}`);
    await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');
    await page.getByLabel('Password',{exact:true}).fill('fixture-password');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL(base+'/sites?starter=portfolio&refine=1');
    await page.locator('.sites-workspace').waitFor();
    await page.waitForFunction(()=>!document.cookie.includes('galx_session='));
    assert(!(await context.cookies()).some((cookie:any)=>cookie.name==='galx_session'));
    await context.close();
  }
  for (const width of [1440, 390]) {
    const { context, page, state, errors } = await setup(width);
    await page.goto(base + '/sites?starter=product&refine=1&token=discard-me');
    await page.getByRole('heading', { name: 'Sign in to Sites', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('next'), '/sites?starter=product&refine=1');
    await inspect(page, `signin-${width}`);
    for (const field of ['Email', 'Password']) assert.equal(await page.getByLabel(field, { exact: true }).evaluate((el: HTMLElement) => getComputedStyle(el).fontSize), '16px');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.equal(await page.getByLabel('Email', { exact: true }).getAttribute('aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'signin-email');
    await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'signin-password');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text');
    let release!: () => void; state.hold = new Promise(resolve => { release = resolve; });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('form')?.getAttribute('aria-busy') === 'true');
    assert.equal(await page.getByRole('button', { name: 'Continue with Google', exact: true }).isDisabled(), true);
    await page.locator('form').evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
    release();
    await page.locator('main [role="alert"]').waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'alert');
    assert.equal(state.passwordCalls, 1, 'duplicate submission blocked');
    assert.equal(await page.locator('main [role="alert"]').evaluate((el: HTMLElement) => el === document.activeElement), true);
    await inspect(page, `password-error-${width}`);
    state.hold = null;
    await page.getByRole('button', { name: 'Use an email link instead', exact: true }).click();
    state.otpStatus = width === 390 ? 400 : 200;
    await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Check your email' || Boolean(document.querySelector('main [role="alert"]')));
    assert.equal(await page.getByRole('heading', { name: 'Check your email', exact: true }).count(), 1, `email-link ${width}: ${await page.locator('main').innerText()}; requests=${state.otp.length}`);
    await page.waitForFunction(() => document.activeElement?.textContent === 'Check your email');
    assert.equal(state.otp.length, 1);
    assert.equal(state.otp[0].body.create_user, false);
    assert.equal(new URL(state.otp[0].redirectTo).searchParams.get('next'), '/sites?starter=product&refine=1');
    assert.equal(await page.getByRole('button', { name: /Resend link in/ }).isDisabled(), true);
    assert.equal(await page.getByRole('heading', { name: 'Check your email' }).evaluate((el: HTMLElement) => el === document.activeElement), true);
    await inspect(page, `email-link-${width}`);
    await page.getByRole('button', { name: 'Use your password instead', exact: true }).click();
    state.passwordStatus = 200;
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/sites?starter=product&refine=1');
    await page.locator('.sites-workspace').waitFor();
    assert.deepEqual(errors, []); await context.close();
  }
  // Existing sessions are decided by the server; old browser-only identity cannot bypass it.
  {
    const { context, page } = await setup(1440, 'valid');
    await page.goto(base + '/auth/signin?next=%2Fimages%3Fview%3Dlibrary');
    await page.waitForURL('**/images?view=library'); await page.locator('.studio').waitFor();
    await context.close();
    const stale = await setup();
    await stale.context.addInitScript(() => localStorage.setItem('galx_custom_auth_user', JSON.stringify({ id: 'stale', token: 'forged', provider: 'fixture' })));
    await stale.page.goto(base + '/auth/signin?next=https%3A%2F%2Fevil.example&error=PRIVATE_AUTH_SENTINEL');
    await stale.page.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    assert.doesNotMatch(await stale.page.locator('body').innerText(), /PRIVATE_AUTH_SENTINEL|You’re Signed In/);
    await stale.context.close();
  }
  for (const width of [1440, 390]) {
    const { context, page, state } = await setup(width, 'valid');
    await page.goto(base + '/images'); await page.locator('.studio').waitFor();
    await page.getByLabel('Prompt', { exact: true }).fill('Keep this draft through sign-in');
    state.libraryStatus = 401;
    await page.getByRole('button', { name: 'My images', exact: true }).click();
    await page.getByRole('heading', { name: 'Sign in to continue', exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'workspace-signin-heading');
    assert.equal(await page.locator('.studio').count(), 0, 'private editor unmounted');
    assert.equal(await page.getByRole('heading', { name: 'Sign in to continue' }).evaluate((el: HTMLElement) => el === document.activeElement), true);
    assert.equal(new URL(await page.getByRole('link', { name: 'Sign in again' }).getAttribute('href'), base).searchParams.get('next'), '/images?view=library');
    assert.equal(await page.evaluate(() => Object.values(sessionStorage).some(value => value.includes('Keep this draft through sign-in'))), true);
    assert.deepEqual(state.posts, [], 'no generation/replay');
    await inspect(page, `expired-${width}`, 'section[aria-labelledby="workspace-signin-heading"]');
    await context.close();
    const outage = await setup(width, 'unavailable');
    const response = await outage.page.goto(base + '/images?view=library&token=discard-me');
    assert.equal(response.status(), 503);
    await outage.page.getByRole('heading', { name: 'We couldn’t check your session', exact: true }).waitFor();
    assert.equal(await outage.page.getByRole('link', { name: 'Try again' }).getAttribute('href'), '/images?view=library');
    await inspect(outage.page, `unavailable-${width}`);
    await outage.context.close();
  }
  {
    const denied = await setup(390, 'valid'); denied.state.sitesStatus = 401;
    await denied.page.goto(base + '/sites'); await denied.page.getByRole('heading', { name: 'Sign in to continue' }).waitFor();
    assert.equal(await denied.page.locator('.sites-workspace').count(), 0);
    await denied.context.close();
    const allowed = await setup(390, 'valid'); allowed.state.libraryStatus = 403;
    await allowed.page.goto(base + '/images?view=library');
    await allowed.page.getByRole('heading', { name: 'Your images couldn’t be loaded' }).waitFor();
    assert.equal(await allowed.page.getByRole('heading', { name: 'Sign in to continue' }).count(), 0);
    await allowed.context.close();
    const signedOut = await setup(1440, 'valid');
    await signedOut.page.goto(base + '/images'); await signedOut.page.locator('.studio').waitFor();
    const otherTab = await signedOut.context.newPage(); await otherTab.goto(base + '/');
    await otherTab.getByRole('button', { name: 'Sign out', exact: true }).click();
    await signedOut.page.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    assert.equal(await signedOut.page.locator('.studio').count(), 0, 'cross-tab sign-out removes private editor');
    await signedOut.context.close();
    const narrow = await setup(320);
    await narrow.page.goto(base + '/auth/signin'); await narrow.page.getByRole('heading', { name: 'Sign in to Images' }).waitFor();
    await narrow.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await inspect(narrow.page, 'signin-reflow-320'); await narrow.context.close();
  }
  for (const width of [1440, 390]) {
    const { context, page, state, errors } = await setup(width, 'valid');
    await page.goto(base + '/images');
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('galx_custom_auth_user') || '{}')), { id: owner });
    const other = await context.newPage(); await other.goto(base + '/images');
    await other.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    state.logoutStatus = 503;
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('heading', { name: 'Finish signing out', exact: true }).waitFor();
    await other.getByRole('heading', { name: 'Finish signing out', exact: true }).waitFor();
    assert.equal(await page.locator('.studio').count(), 0);
    assert.equal(await other.locator('.studio').count(), 0);
    await page.reload();
    await page.getByRole('heading', { name: 'Finish signing out', exact: true }).waitFor();
    assert.equal(await page.locator('.studio').count(), 0);
    await inspect(page, `signout-retry-${width}`);
    state.logoutStatus = 200;
    await page.getByRole('button', { name: 'Retry sign-out', exact: true }).click();
    await page.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    await other.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    const cookies = await context.cookies();
    assert.equal(cookies.some((cookie: any) => cookie.value && (cookie.name === 'galx_session' || cookie.name.startsWith('sb-'))), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('galx_auth_logout_state')), 'complete');
    assert.equal(await page.evaluate(() => localStorage.getItem('galx_custom_auth_user')), null);
    await page.goto(base + '/images');
    await page.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    assert.equal(await page.locator('.studio').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  }
  {
    const { context, page, state } = await setup(1440, 'valid');
    await page.goto(base + '/images'); await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    const before = state.profileCalls; let release!: () => void;
    state.profileHold = new Promise(resolve => { release = resolve; });
    const held = new Promise<void>(resolve => { state.profileOnHold = resolve; });
    const resumed = page.waitForRequest((request: any) => new URL(request.url()).pathname === '/api/auth/session' && request.method() === 'GET');
    await page.evaluate(() => { const now = Date.now; Date.now = () => now() + 31000; window.dispatchEvent(new Event('focus')); });
    await resumed; await held;
    assert(state.profileCalls > before, 'resume starts verification');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('heading', { name: 'Sign in to Images', exact: true }).waitFor();
    release();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.studio').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('galx_custom_auth_user')), null);
    await context.close();
  }
  console.log(JSON.stringify({ passed: true, visualStates: evidence.length, coverage: ['server entry', 'password success/error/deduplication', 'email-link nonenumeration and callback', 'existing/stale identity', '401 unmount and draft retention', '403 stays in workspace', '503 recovery', 'reflow and accessibility', 'current-browser sign-out across reload/tabs', 'failed sign-out retry', 'late verification after logout'] }));
} finally { await browser.close(); }
