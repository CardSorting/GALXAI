/** Local production-build fixtures only. No real user actions or external requests. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const base = process.argv[2] ?? 'http://127.0.0.1:3405';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.GALX_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-connection-ui-'));
const results: unknown[] = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    let release!: () => void, probes = 0;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await context.route('**/*', async (route: any) => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (url.pathname === '/api/version') {
        probes++; assert.equal(route.request().method(), 'HEAD');
        await gate; return route.fulfill({ status: 200, body: '' });
      }
      if (url.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(probes, 0, 'hidden footer must not probe');
    await page.goto(base + '/about', { waitUntil: 'domcontentloaded' });
    const status = page.locator('[data-connection-status]');
    await status.getByText('Connection not checked', { exact: true }).waitFor();
    await status.scrollIntoViewIfNeeded();
    const box = await status.boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= width, 'connection view fits');
    const link = status.getByRole('link');
    const target = await link.boundingBox(); assert(target && target.height >= 44);
    await link.focus();
    assert(await link.evaluate((element: HTMLElement) => element === document.activeElement));
    await page.screenshot({ path: path.join(directory, `unknown-${width}.png`) });
    release();
    await status.getByText('Website reachable', { exact: true }).waitFor();
    assert(await status.locator('time').getAttribute('datetime'));
    assert(!/All Systems Operational|99\.99|circuit|shard|Supabase/i.test(await status.innerText()));
    await page.screenshot({ path: path.join(directory, `measured-${width}.png`) });
    await context.setOffline(true);
    await status.getByText('You’re offline', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(directory, `offline-${width}.png`) });
    await context.setOffline(false);
    await status.getByText('Connection not checked', { exact: true }).waitFor();
    assert.equal(probes, 1, 'network changes must not reset request cooldown');
    results.push({ width, unknownFirst: true, measuredTimestamp: true, offline: true,
      touchTarget44px: true, keyboardFocus: true, probes });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ screenshots: directory, results }, null, 2));
