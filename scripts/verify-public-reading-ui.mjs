/** Isolated production UI/HTTP review. No account, billing, generation or publication writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.impeccable/review/public-reading');
await mkdir(output, { recursive: true });
const workspace = await mkdtemp(path.join(tmpdir(), 'galx-reading-ui-'));
for (const name of ['.next', 'public', 'node_modules']) await symlink(path.join(root, name), path.join(workspace, name));
await writeFile(path.join(workspace, 'package.json'), '{"private":true}');
const base = 'http://127.0.0.1:3436';
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', workspace, '-p', '3436', '-H', '127.0.0.1'], {
  cwd: workspace, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    GALX_VAULT_ACTIVE_KEY_VERSION: 'v1', GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'), GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url') }, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const results = { http: [], layouts: [], checks: [], scriptCount: 0 };
const scriptUrls = new Set();
const forbidden = /GALX_PRIVATE_(?:POST_MORTEM|KNOWLEDGE)_CONTENT|preview_admin_members|preview_application_snapshots|PRIVATE_SENTINEL|GALX_INTERNAL_ADMIN_KEY|DATABASE_URL|VM_RELAY_URL|api\.openai\.com/;
const forbiddenCopy = /openai|supabase|broccolidb|postgres|shard|upstream|topology|inference|credential source|cloudflare|vercel|75% prompt|SOC 2/i;
const routes = ['/pricing', '/faq', '/knowledge-base', '/pricing/galx-pro', '/pricing/fair-use', '/pricing/billing-and-cancellation', '/knowledge-base/getting-started', '/knowledge-base/revising-your-site', '/knowledge-base/publishing-your-site', '/knowledge-base/public-beta', '/knowledge-base/images-and-developer-access'];
const captures = ['/pricing', '/faq', '/knowledge-base', '/pricing/galx-pro', '/knowledge-base/getting-started'];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/pricing', { signal: AbortSignal.timeout(3000) })).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Local production server did not become ready');
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  const titles = new Set();
  for (const route of routes) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 200, route);
    assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/, route);
    const html = await response.text();
    assert.doesNotMatch(html, forbidden, route);
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert(title && !titles.has(title), 'unique page title: ' + route); titles.add(title);
    assert.equal((title.match(/GALXAI/g) || []).length, 1, 'brand appears once');
    assert(html.includes(`rel="canonical" href="https://galx.ai${route}"`), 'canonical ' + route);
    assert(html.includes(`property="og:url" content="https://galx.ai${route}"`), 'social canonical ' + route);
    assert(html.includes('content="index, follow'), 'indexable metadata ' + route);
    assert(sitemap.includes(`https://galx.ai${route}</loc>`), 'sitemap ' + route);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
    const crumbs = schemas.find(schema => schema['@type'] === 'BreadcrumbList');
    assert(crumbs?.itemListElement.length >= 2, 'breadcrumbs ' + route);
    for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) scriptUrls.add(match[1]);
    const rsc = await fetch(base + route, { headers: { rsc: '1', 'next-router-prefetch': '1', authorization: 'Bearer ordinary-user-token' }, redirect: 'manual' });
    assert.equal(rsc.status, 200, 'RSC ' + route); assert.doesNotMatch(await rsc.text(), forbidden);
    results.http.push({ route, status: response.status, title, rsc: rsc.status });
  }
  for (const route of ['/docs', '/knowledge-base/private', '/pricing/galx-pro/admin', '/faq.css']) {
    const response = await fetch(base + route, { redirect: 'manual', headers: { rsc: '1', 'next-router-prefetch': '1' } });
    assert.notEqual(response.status, 200, 'private path ' + route);
    assert.doesNotMatch(await response.text(), forbidden);
  }
  for (const route of ['/api/internal/telemetry', '/api/relay/status']) for (const headers of [{}, { authorization: 'Bearer ordinary-user-token' }]) {
    const response = await fetch(base + route, { headers });
    const body = await response.text();
    if (route === '/api/internal/telemetry') {
      assert.equal(response.status, 404); assert.deepEqual(JSON.parse(body), { error: 'Not found' });
    } else {
      assert.equal(response.status, 401);
      assert.deepEqual(Object.keys(JSON.parse(body)).sort(), ['error', 'request_access_url']);
    }
    assert.doesNotMatch(body, forbidden);
  }
  results.checks.push('raw HTML, RSC/prefetch, private-path denial, administrator denial, canonical/social metadata, sitemap and breadcrumbs');
  const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
  const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const width of [1440, 390, 320, 900, 768]) {
    console.log('Checking viewport', width);
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    let mutations = 0;
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== base) return route.abort();
      if (!['GET', 'HEAD'].includes(route.request().method())) mutations++;
      return route.continue();
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of captures) {
      console.log('Inspecting', route, width);
      assert.equal((await page.goto(base + route, { waitUntil: 'networkidle' })).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.equal(await page.getByRole('navigation', { name: 'Main navigation', exact: true }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflow at ${width}`);
      assert.doesNotMatch(await page.locator('main').innerText(), forbiddenCopy);
      if (route.startsWith('/pricing')) {
        const action = page.getByRole('link', { name: 'Continue with GALX Pro' });
        assert.notEqual(await action.evaluate(link => getComputedStyle(link).backgroundColor), 'rgba(0, 0, 0, 0)', 'plan action has a visible button treatment');
      }
      const active = route.startsWith('/pricing') ? '/pricing' : route.startsWith('/knowledge-base') ? '/knowledge-base' : '/faq';
      assert.equal(await page.locator(`nav[aria-label="Main navigation"] a[href="${active}"]`).getAttribute('aria-current'), 'page');
      if (width === 1440 || width === 390) {
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], route + ' accessibility');
        const label = route.slice(1).replaceAll('/', '-') + '-' + width;
        await page.screenshot({ path: path.join(output, label + '.png'), fullPage: true });
        await page.screenshot({ path: path.join(output, label + '-viewport.png') });
      }
      results.layouts.push({ route, width, overflow: false });
    }
    // Keyboard reachability of the last clipped menu item on narrow widths.
    const developerLink = page.locator('nav[aria-label="Main navigation"] a[href="/developers"]');
    console.log('Checking navigation focus', width);
    await developerLink.focus({ timeout: 10000 });
    assert(await developerLink.evaluate(link => { const r = link.getBoundingClientRect(); return r.x >= 0 && r.right <= innerWidth; }));
    assert.equal(mutations, 0); assert.deepEqual(errors, []);
    console.log('Closing viewport', width);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  console.log('Checking interactions');
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base + '/knowledge-base', { waitUntil: 'networkidle' });
  const search = page.getByRole('searchbox', { name: 'Search the knowledge base' });
  await search.fill('pottery'); assert.equal(await page.locator('#guide-results a').count(), 1);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click(); assert(await search.evaluate(el => el === document.activeElement));
  await page.getByRole('button', { name: 'Plans and billing', exact: true }).click(); assert.equal(await page.locator('#guide-results a').count(), 3);
  await search.fill('<script>alert(1)</script>'); await page.getByRole('heading', { name: 'No guides found' }).waitFor();
  await page.screenshot({ path: path.join(output, 'search-empty.png') });
  await page.getByRole('button', { name: 'Clear search and filters' }).click(); assert.equal(await page.locator('#guide-results a').count(), 8); assert(await search.evaluate(el => el === document.activeElement));
  await search.fill('billing'); await search.press('Escape'); assert.equal(await search.inputValue(), '');
  await page.evaluate(() => { window.reviewHeader = document.querySelector('nav[aria-label="Main navigation"]').closest('header'); });
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await nav.getByRole('link', { name: 'FAQ', exact: true }).click(); await page.waitForURL(base + '/faq');
  assert(await page.evaluate(() => window.reviewHeader === document.querySelector('nav[aria-label="Main navigation"]').closest('header')));
  const summary = page.locator('summary').first(); await summary.focus(); await summary.press('Enter');
  assert(await summary.evaluate(el => el.parentElement.open));
  await page.locator('nav[aria-label="FAQ topics"] a[href="#plans-and-billing"]').click(); await page.waitForURL('**/faq#plans-and-billing');
  await nav.getByRole('link', { name: 'Pricing', exact: true }).click(); await page.waitForURL(base + '/pricing');
  assert.equal(await page.getByRole('link', { name: 'Continue with GALX Pro' }).getAttribute('href'), '/login?next=/billing%23plan');
  await page.goBack(); await page.waitForURL('**/faq#plans-and-billing');
  await page.goForward(); await page.waitForURL(base + '/pricing');
  await page.getByRole('link', { name: /What’s included in GALX Pro/ }).click(); await page.waitForURL(base + '/pricing/galx-pro');
  await page.locator('nav[aria-label="On this page"] a[href="#included"]').click(); await page.waitForURL('**/pricing/galx-pro#included');
  assert.equal(await page.locator('#included').count(), 1);
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('link', { name: 'See pricing', exact: true }).getAttribute('href'), '/pricing');
  assert.equal(await page.locator('#pricing').count(), 1); assert.equal(await page.locator('#faq').count(), 1);
  results.checks.push('search, category filtering, empty recovery/focus, hostile search, Escape, keyboard disclosure, anchor navigation, persistent header, back/forward, sign-in continuation, homepage legacy anchors');
  await context.close();
  const staticContext = await browser.newContext();
  await staticContext.route('**/*', route => {
    if (route.request().resourceType() === 'script' || new URL(route.request().url()).origin !== base) return route.abort();
    return route.continue();
  });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(base + '/knowledge-base', { waitUntil: 'networkidle' });
  assert.equal(await staticPage.locator('#guide-results a').count(), 8);
  await staticPage.goto(base + '/faq', { waitUntil: 'networkidle' });
  await staticPage.locator('summary').first().click();
  assert(await staticPage.locator('details').first().evaluate(el => el.open));
  results.checks.push('server-rendered guide links and native FAQ with client bundles blocked (inline framework completion allowed)');
  await staticContext.close();
  for (const url of scriptUrls) {
    const response = await fetch(base + url); assert.equal(response.status, 200, url);
    assert.doesNotMatch(await response.text(), forbidden, url);
  }
  results.scriptCount = scriptUrls.size;
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), results, serverLog }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
