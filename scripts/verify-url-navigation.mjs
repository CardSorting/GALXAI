/** Local production fixture; synthetic account/data, external traffic blocked. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const base = process.argv[2] || 'http://localhost:3427';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const out = path.resolve('.impeccable/review/url-navigation');
await fs.mkdir(out, { recursive: true });
const picture = await fs.readFile('public/images/studio/desert.webp');
const owner = '00000000-0000-4000-8000-000000000001';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', email_confirmed_at: '2026-09-13T00:00:00Z', is_anonymous: false, app_metadata: {}, user_metadata: {} };
const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: owner, exp: 4102444800, jti: crypto.randomUUID() })).toString('base64url')}.valid`;
const session = { access_token: token, refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results = [];
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', bypassCSP: true });
    await context.addCookies([{ name: 'sb-supabase-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: base, sameSite: 'Lax' }]);
    const state = { generations: 0, library: [], errors: [], status: 200 };
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.hostname === 'supabase.invalid') return json(url.pathname.endsWith('/user') ? user : session);
      if (url.origin !== base) return route.abort();
      if (url.pathname === '/api/auth/session') return route.continue();
      if (url.pathname === '/v1/images/generations') { state.generations++; return json({ data: [{ b64_json: picture.toString('base64') }] }); }
      if (url.pathname === '/api/images/library') {
        state.library.push(url.searchParams.get('isFavorite') === 'true');
        return state.status === 200 ? json({ success: true, records: [{ id: 'image-one', promptPreview: 'A quiet landscape', status: 'completed', aspectRatio: '3:2', quality: 'standard', publicUrl: '/v1/images/assets/fixture', createdAt: '2026-09-13T00:00:00Z', isFavorite: true }], total: null, stats: null, nextCursor: null, previousCursor: null }) : json({ error: 'PRIVATE_CANARY' }, state.status);
      }
      if (url.pathname.startsWith('/v1/images/assets/')) return route.fulfill({ status: 200, contentType: 'image/webp', body: picture });
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) return json({ success: true, data: [], balance: 0 });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => state.errors.push(error.message));
    await page.goto(base + '/images');
    await page.locator('.studio').waitFor();
    const nav = page.getByRole('navigation', { name: 'Studio views', exact: true });
    const composer = page.locator('#studio-prompt');
    await composer.fill('Retain this draft while browsing');
    await page.getByRole('button', { name: 'Generate image', exact: true }).click();
    await page.getByText('1 recent image', { exact: true }).waitFor();
    await page.evaluate(() => { window.fixtureStudio = document.querySelector('.studio'); window.fixtureHeader = document.querySelector('header'); });
    for (const [label, route, favorite] of [['My images', '/images/library', false], ['Favorites', '/images/favorites', true], ['Create', '/images', null]]) {
      const link = nav.getByRole('link', { name: label, exact: true });
      assert.equal(await link.getAttribute('href'), route);
      await link.click(); await page.waitForURL(base + route);
      assert.equal(await link.getAttribute('aria-current'), 'page');
      assert(await page.evaluate(() => window.fixtureStudio === document.querySelector('.studio') && window.fixtureHeader === document.querySelector('header')), 'view changes preserve workspace and header');
      if (favorite !== null) { await page.locator('.studio-result').waitFor(); assert.equal(state.library.at(-1), favorite); }
    }
    assert.equal(await composer.inputValue(), 'Retain this draft while browsing');
    assert.equal(await page.getByText('1 recent image', { exact: true }).count(), 1);
    await page.goBack(); await page.waitForURL(base + '/images/favorites');
    assert.equal(await nav.getByRole('link', { name: 'Favorites', exact: true }).getAttribute('aria-current'), 'page');
    await page.goBack(); await page.waitForURL(base + '/images/library');
    assert.equal(await nav.getByRole('link', { name: 'My images', exact: true }).getAttribute('aria-current'), 'page');
    await page.goForward(); await page.waitForURL(base + '/images/favorites');
    await page.reload(); await page.getByRole('heading', { name: 'Your favorites', exact: true }).waitFor();
    assert.equal(state.library.at(-1), true);
    assert.equal(await page.title(), 'Favorites | GALX');
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation', exact: true }).locator('[href="/images"]').getAttribute('aria-current'), 'page');
    await nav.getByRole('link', { name: 'My images', exact: true }).focus();
    await page.keyboard.press('Enter'); await page.waitForURL(base + '/images/library');
    const popupPromise = context.waitForEvent('page');
    await nav.getByRole('link', { name: 'Favorites', exact: true }).click({ modifiers: ['Meta'] });
    const popup = await popupPromise; await popup.waitForLoadState();
    await popup.getByRole('heading', { name: 'Your favorites', exact: true }).waitFor(); await popup.close();
    await page.goto(base + '/images?view=library'); await page.waitForURL(base + '/images/library');
    await page.locator('.studio-result').waitFor(); await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const audit = await new AxeBuilder({ page }).setLegacyMode(true).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).options({ iframes: false }).analyze();
    const violations = audit.violations.map(v => ({ id: v.id, impact: v.impact }));
    assert.deepEqual(violations, []);
    await page.screenshot({ path: path.join(out, `library-${width}.png`), fullPage: true });
    state.status = 401;
    await nav.getByRole('link', { name: 'Favorites', exact: true }).click();
    const signin = page.getByRole('link', { name: 'Sign in again', exact: true });
    await signin.waitFor(); assert.equal(await signin.getAttribute('href'), '/login?next=/images/favorites&error=session_expired&reauth=1');
    assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_CANARY/);
    assert.equal(state.generations, 1, 'navigation never repeats generation');
    assert.deepEqual(state.errors, []);
    results.push({ width, violations, generationRequests: state.generations, checks: 'canonical views, state retention, Back/Forward, refresh, keyboard, new tab, old bookmarks, expiry, no overflow' });
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
