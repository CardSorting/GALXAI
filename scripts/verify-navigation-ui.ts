/** Isolated local route-navigation fixtures; never generates, publishes, or contacts external services. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const base = process.argv[2] || 'http://127.0.0.1:3417';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const output = path.resolve('.impeccable/review/navigation');
await fs.mkdir(output, { recursive: true });
const results: unknown[] = [];
const expected = ['Sites', 'Images', 'Pricing', 'FAQ', 'Knowledge base', 'Developer preview'];
const guestGeometry = new Map<number, unknown>();

async function setup(width: number, signedIn: boolean, reduce = true) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  if (signedIn) await context.addInitScript(() => { if (window.top === window) localStorage.setItem('galx_custom_auth_user', JSON.stringify({ id: 'navigation-fixture-user', token: 'navigation-fixture-token', provider: 'fixture' })); });
  const state = { slow: false, mutations: 0 };
  await context.route('**/*', async (route: any) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (state.slow && url.pathname === '/sites' && request.headers().rsc) await new Promise(resolve => setTimeout(resolve, 1200));
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      if (!['GET', 'HEAD'].includes(request.method())) state.mutations++;
      if (url.pathname === '/api/sites/workspace') return json({ sites: [], site: null, setup: { access: 'included', publishing: 'available', username: null } });
      if (url.pathname === '/api/images/library') return json({ images: [], total: 0, nextCursor: null });
      return json({ success: true, data: [], balance: 0 });
    }
    return route.continue();
  });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  return { context, page, state, errors };
}
async function geometry(page: any) {
  return page.getByRole('navigation', { name: 'Main navigation', exact: true }).evaluate((nav: HTMLElement) => {
    const header = nav.closest('header')!;
    return {
      height: header.getBoundingClientRect().height,
      links: [...nav.querySelectorAll('a')].map(link => {
        const rect = link.getBoundingClientRect();
        return { href: link.getAttribute('href'), x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
      }),
    };
  });
}
async function inspect(page: any, label: string) {
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  assert.equal(await nav.count(), 1, 'exactly one header navigation');
  assert.deepEqual(await nav.locator('a').evaluateAll((links: HTMLAnchorElement[]) => links.map(link => link.firstChild?.textContent)), expected);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no document overflow');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter), 'stable');
  const audit = await new AxeBuilder({ page }).include('header').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const violations = audit.violations.map((v: any) => ({ id: v.id, impact: v.impact }));
  assert.deepEqual(violations, [], label + ' header accessibility');
  await page.screenshot({ path: path.join(output, label + '.png') });
  results.push({ label, violations, geometry: await geometry(page) });
}
function sameGeometry(actual: any, initial: any) {
  assert.equal(actual.height, initial.height, 'header height stays fixed across product routes');
  for (let i = 0; i < actual.links.length; i++) for (const field of ['x', 'y', 'width', 'height']) {
    assert(Math.abs(actual.links[i][field] - initial.links[i][field]) <= .5, `${actual.links[i].href} ${field} moved`);
  }
}
try {
  for (const width of [1440, 900, 768, 390, 320]) for (const signedIn of [false, true]) {
    const { context, page, state, errors } = await setup(width, signedIn);
    await page.goto(base, { waitUntil: 'networkidle' });
    const header = page.locator('header').filter({ has: page.getByRole('navigation', { name: 'Main navigation', exact: true }) });
    await header.getByRole(signedIn ? 'button' : 'link', { name: signedIn ? 'Sign out' : 'Sign in', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const initial = await geometry(page);
    if (signedIn) sameGeometry(initial, guestGeometry.get(width));
    else guestGeometry.set(width, initial);
    await page.evaluate(() => { (window as any).navigationHeader = document.querySelector('nav[aria-label="Main navigation"]')!.closest('header'); });
    const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    for (const destination of ['sites', 'images', 'sites']) {
      await nav.locator(`a[href="/${destination}"]`).click();
      await page.waitForURL(base + '/' + destination);
      await page.locator(destination === 'sites' ? '.sites-workspace' : '.studio').waitFor();
      assert(await page.evaluate(() => (window as any).navigationHeader === document.querySelector('nav[aria-label="Main navigation"]')!.closest('header')), 'header DOM is preserved');
      sameGeometry(await geometry(page), initial);
      assert.equal(await nav.locator(`[href="/${destination}"]`).getAttribute('aria-current'), 'page');
    }
    await inspect(page, `sites-${width}-${signedIn ? 'account' : 'guest'}`);
    await page.goBack(); await page.waitForURL(base + '/images');
    sameGeometry(await geometry(page), initial);
    await inspect(page, `images-${width}-${signedIn ? 'account' : 'guest'}`);
    await page.goForward(); await page.waitForURL(base + '/sites');
    sameGeometry(await geometry(page), initial);
    if (width === 1440 && !signedIn) {
      await nav.locator('[href="/pricing"]').click();
      await page.waitForURL(base + '/pricing');
      assert.equal(await nav.locator('[href="/pricing"]').getAttribute('aria-current'), 'page');
      await nav.locator('[href="/faq"]').click();
      await page.waitForURL(base + '/faq');
      assert.equal(await nav.locator('[href="/faq"]').getAttribute('aria-current'), 'page');
    }
    if (!signedIn && new URL(page.url()).pathname === '/sites') assert.equal(await header.getByRole('link', { name: 'Sign in', exact: true }).getAttribute('href'), '/login?next=/sites');
    if (width < 1100) {
      await nav.locator('[href="/knowledge-base"]').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '/developers');
      await page.waitForFunction(() => {
        const link = document.querySelector('nav[aria-label="Main navigation"] a[href="/developers"]')!;
        const rect = link.getBoundingClientRect(), container = link.closest('nav')!.getBoundingClientRect();
        return rect.left >= container.left && rect.right <= container.right + 1;
      }, undefined, { timeout: 2000 });
      if (width === 390) await page.screenshot({ path: path.join(output, `keyboard-${width}-${signedIn ? 'account' : 'guest'}.png`) });
    }
    assert.equal(state.mutations, 0, 'navigation sends no mutation requests');
    assert.deepEqual(errors, []);
    await context.close();
  }
  const nested = await setup(1440, true);
  for (const [route, label] of [['/sites/00000000-0000-4000-8000-000000000001', 'site-detail-1440'], ['/sites/invalid-id', 'site-not-found-1440']]) {
    await nested.page.goto(base + route, { waitUntil: 'networkidle' });
    if (label === 'site-not-found-1440') {
      assert.doesNotMatch(await nested.page.locator('body').innerText(), /routing table|router diagnostic|ERR_ROUTE|residency:|gateway:|ROUTE UNRESOLVED/i);
      assert.equal(await nested.page.locator('main a[href="/sites"]').count(), 1);
      assert.equal(await nested.page.locator('main a[href="/images"]').count(), 1);
    }
    await inspect(nested.page, label);
    const nav = nested.page.getByRole('navigation', { name: 'Main navigation', exact: true });
    assert.equal(await nav.locator('[href="/sites"]').getAttribute('aria-current'), 'page');
    const initial = await geometry(nested.page);
    await nested.page.evaluate(() => { (window as any).navigationHeader = document.querySelector('nav[aria-label="Main navigation"]')!.closest('header'); });
    await nav.locator('[href="/images"]').click();
    await nested.page.waitForURL(base + '/images');
    assert(await nested.page.evaluate(() => (window as any).navigationHeader === document.querySelector('nav[aria-label="Main navigation"]')!.closest('header')));
    sameGeometry(await geometry(nested.page), initial);
  }
  assert.equal(nested.state.mutations, 0);
  assert.deepEqual(nested.errors, []);
  await nested.context.close();

  const slow = await setup(390, false, false);
  await slow.page.goto(base + '/images', { waitUntil: 'networkidle' });
  const baseline = await geometry(slow.page);
  slow.state.slow = true;
  const nav = slow.page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await nav.locator('[href="/sites"]').click();
  await nav.locator('[data-pending="true"]').waitFor();
  sameGeometry(await geometry(slow.page), baseline);
  await slow.page.waitForURL(base + '/sites');
  await slow.page.locator('.sites-workspace').waitFor();
  sameGeometry(await geometry(slow.page), baseline);
  await inspect(slow.page, 'slow-navigation-390');
  await slow.page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await slow.page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  assert.equal(await nav.locator('a').first().evaluate((link: HTMLElement) => getComputedStyle(link).transitionDuration), '0s');
  assert.deepEqual(slow.errors, []);
  await slow.context.close();
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
