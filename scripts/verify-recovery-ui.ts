/** Isolated browser fixtures only; never replays real account actions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:3405';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local production build.');
const browserModule = process.env.GALX_BROWSER_MODULE || 'playwright';
const { chromium } = await import(browserModule);
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.GALX_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-recovery-ui-'));
const results: unknown[] = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    let replayRequests = 0;
    await context.route('**/*', (route: any) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/egress-fixture') { replayRequests++; return route.abort(); }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => {
      localStorage.setItem('galx_broccolidb_outbox_v1', JSON.stringify([{ id: 'visual-fixture', url: '/api/egress-fixture',
        method: 'POST', headers: {}, payload: {}, idempotencyKey: 'fixture', status: 'failed', priority: 5,
        attempts: 5, maxAttempts: 5, timestamp: Date.now(), checksum: '', ownerId: '' }]));
      sessionStorage.setItem('galx_chunk_reload_attempt', String(Date.now()));
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    const notice = page.getByRole('complementary', { name: 'Connection and recovery' });
    await notice.getByText('Saved actions need attention', { exact: true }).waitFor();
    const details = notice.locator('summary');
    await details.focus(); await page.keyboard.press('Enter');
    assert(await notice.locator('details').getAttribute('open') !== null);
    const box = await notice.boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= width, 'Notice fits the viewport');
    const target = await details.boundingBox(); assert(target && target.height >= 44);
    assert(!/All Systems Synced|Supabase|shard|provider/i.test(await notice.innerText()));
    await page.screenshot({ path: path.join(directory, 'attention-' + width + '.png') });
    await context.setOffline(true);
    await notice.getByText('You’re offline', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(directory, 'offline-' + width + '.png') });
    await context.setOffline(false);
    await page.evaluate(() => { window.dispatchEvent(new ErrorEvent('error', { message: 'ChunkLoadError' })); });
    await notice.getByRole('button', { name: 'Reload page' }).waitFor();
    const button = await notice.getByRole('button', { name: 'Reload page' }).boundingBox();
    assert(button && button.height >= 44);
    await page.screenshot({ path: path.join(directory, 'refresh-' + width + '.png') });
    await notice.getByRole('button', { name: 'Dismiss notification' }).click();
    assert.equal(await notice.count(), 0, 'Notice can be dismissed without blocking the page');
    assert.equal(replayRequests, 0);
    results.push({ width, fits: true, keyboardDetails: true, touchTargets44px: true, exhaustedActionsReplayed: replayRequests });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ screenshots: directory, results }, null, 2));
