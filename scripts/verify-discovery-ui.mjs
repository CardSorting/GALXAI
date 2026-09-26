/** Local production-build checks. Synthetic feed; no account or generation writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.GALX_UI_BASE || 'http://127.0.0.1:3425';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local fixture server');
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const output = path.resolve('.impeccable/review/discovery-refinement');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.GALX_CHROME_PATH ? { executablePath: process.env.GALX_CHROME_PATH } : {}),
});
const checks = [];
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#14192d"/></svg>';
const feed = { success: true, nextCursor: null, items: [{
  id: 'fixture-work', created_at: '2026-09-25T00:00:00Z', aspect_ratio: '3:2',
  public_url: '/v1/images/assets/fixture-work', thumbnail_url: '/v1/images/assets/fixture-work',
  author: { handle: 'vanta', displayName: 'VANTA', avatarUrl: null, participantKind: 'star' },
}] };

async function checkOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
}

try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) return route.abort();
      if (url.pathname === '/api/images/feed') return route.fulfill({ json: feed });
      if (url.pathname.startsWith('/v1/images/assets/')) return route.fulfill({ contentType: 'image/svg+xml', body: image });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: { error: 'Sign in required.' } });
      if (request.method() !== 'GET') return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('region', { name: 'Archive caught up' });
    await card.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await card.scrollIntoViewIfNeeded();
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('[aria-label="Archive caught up"]').getBoundingClientRect();
      const sentinel = document.querySelector('.masonry-sentinel').getBoundingClientRect();
      const banner = [...document.querySelectorAll('h3')].find(e => e.textContent === 'Follow your favorite Stars').parentElement.getBoundingClientRect();
      return { contained: card.top >= sentinel.top && card.bottom <= sentinel.bottom, nextSectionGap: banner.top - card.bottom };
    });
    assert(geometry.contained && geometry.nextSectionGap > 0, `Archive overlap at ${width}px`);
    await checkOverflow(page, `Homepage ${width}px`);
    await page.screenshot({ path: path.join(output, `archive-${width}.png`) });

    const section = page.locator('#discover:visible');
    await section.scrollIntoViewIfNeeded();
    assert.doesNotMatch(await section.innerText(), /\$0|currently unavailable|Features\s+Included/);
    assert.match(await section.innerText(), /Saved in this browser/);
    const links = section.getByRole('link');
    assert.deepEqual(await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))), ['/explore', '/stars', '/collections', '/pricing']);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      assert(box.height >= 44 && box.width >= 44, `Small discovery target at ${width}px`);
      await link.focus();
      assert.equal(await link.evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
    }
    await page.locator('#homepage-content').focus();
    const sectionHeight = (await section.boundingBox()).height;
    await page.setViewportSize({ width, height: Math.max(1000, Math.ceil(sectionHeight) + 220) });
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path: path.join(output, `discovery-${width}.png`) });
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Discover', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#discover');
    await page.goto(`${base}/#pricing`, { waitUntil: 'domcontentloaded' });
    await page.locator('#discover:visible').waitFor();
    assert.equal(await page.locator('#pricing').first().evaluate(node => node.closest('section').id), 'discover');

    await page.goto(`${base}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Just here to explore?' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const main = page.locator('main').filter({ has: page.getByRole('heading', { name: 'Support a practice. Or make your own.' }) });
    assert.doesNotMatch(await main.innerText(), /\$0\b|invoking inference|will not dispatch/);
    assert.equal(await page.getByRole('heading', { name: 'Foundry', level: 2, exact: true }).count(), 1);
    await checkOverflow(page, `Pricing ${width}px`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `pricing-${width}.png`) });
    if ([1440, 390].includes(width)) {
      for (const name of ['Orbit', 'Foundry']) {
        const offer = page.getByRole('region', { name, exact: true });
        await page.setViewportSize({width,height:Math.max(1000,Math.ceil((await offer.boundingBox()).height)+300)});
        await offer.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+scrollY-100));
        await offer.screenshot({path:path.join(output,`${name.toLowerCase()}-${width}.png`)});
      }
    }
    assert.deepEqual(errors, []);
    checks.push({ width, ...geometry, discoveryLinks: 'passed', focusAndTouchTargets: 'passed', pricing: 'passed', overflow: false });
    await context.close();
    console.log(`PASS: archive, discovery, navigation and pricing at ${width}px`);
  }
} finally {
  await writeFile(path.join(output, 'checks.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, scope: 'Local production build with synthetic feed; no live acceptance.' }, null, 2));
  await browser.close();
}
