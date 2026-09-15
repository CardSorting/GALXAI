// Optional private browser acceptance. Set PLAYWRIGHT_MODULE to an installed Playwright module.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createAuthority, createConsole, listen, close } from './serve.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve('.relay/central-console-audit'); fs.mkdirSync(output, { recursive: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-browser-central-'));
const tokens = { premium: randomUUID(), standard: randomUUID() }, instances = [];
let browser; const results = [], errors = [], urls = {};
try {
  const authority = createAuthority({ filename: path.join(dir, 'central.json'), tokens }); instances.push(authority); const authorityUrl = await listen(authority);
  for (const profile of ['premium', 'standard']) { const gateway = createConsole({ authorityUrl, token: tokens[profile] }); instances.push(gateway); urls[profile] = await listen(gateway); }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const wait = text => page.waitForFunction(text => document.body.innerText.includes(text), text);
  async function inspect(label, screenshot = true) {
    await page.evaluate(fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8'));
    const axe = await page.evaluate(async () => { const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })); });
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, skipHidden: document.activeElement?.className === 'skip' || getComputedStyle(document.querySelector('.skip')).clipPath === 'inset(50%)', inputSizes: [...document.querySelectorAll('input:not([type=checkbox]),select')].filter(el => el.getClientRects().length).map(el => getComputedStyle(el).fontSize) }));
    if (screenshot) await page.screenshot({ path: path.join(output, label + '.png'), fullPage: true });
    results.push({ label, dimensions, axe }); assert.equal(dimensions.width, dimensions.scroll, `${label} page overflow`); assert.deepEqual(axe, [], `${label} axe violations`); assert.ok(dimensions.skipHidden);
  }
  await page.goto(urls.premium); await wait('Workload readiness'); await inspect('premium-desktop-overview');
  await page.locator('#demo-toggle').click(); await page.locator('#demo-lost').check();
  await page.getByRole('link', { name: 'Register paid account', exact: true }).first().click();
  await page.locator('#account-name').fill('Recovery example'); await page.getByRole('button', { name: 'Prepare workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate completed sign-in' }).click(); await page.locator('#confirm-type').check();
  await page.getByRole('button', { name: 'Register account', exact: true }).click(); await page.locator('#recover').waitFor();
  const pending = await page.evaluate(() => sessionStorage.getItem('galx-demo-pending-v2'));
  assert.ok(pending); await page.reload(); await page.locator('#recover').waitFor();
  await page.locator('#refresh').click(); await wait('refreshing the view does not resolve');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('galx-demo-pending-v2')), pending);
  await page.locator('#recover').click(); await wait('Confirmed: the original register');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('galx-demo-pending-v2')), null);
  await page.locator('#demo-toggle').click(); await page.locator('#demo-result').selectOption('images-denied');
  await page.locator('#verify').click(); await wait('Image verification was denied');
  await page.locator('#demo-result').selectOption('success'); await page.locator('#verify').click(); await wait('Account ready for work');
  await page.locator('#demo-relay').check(); await wait('Account saved; relay offline');
  await page.locator('#traffic').click(); await wait('Change saved; relay acknowledgement pending');
  assert.match(await page.locator('.form').innerText(), /Existing work is not confirmed stopped/);
  await page.locator('#account-activity-toggle').click();
  await page.locator('#demo-toggle').click(); await inspect('premium-pending-desktop');
  await page.locator('#demo-toggle').click(); await page.locator('#demo-relay').uncheck(); await wait('New work is paused');
  assert.ok(await page.locator('.account-activity').evaluate(el => el.open), 'expanded activity survives a new revision');
  await page.locator('#pause-updates').click(); assert.ok(await page.locator('#traffic').isDisabled());
  await page.locator('#refresh').click(); await page.waitForFunction(() => !document.querySelector('#traffic').disabled);
  await page.locator('#demo-outage').click(); await wait('Account management is unavailable. Last observed'); assert.ok(await page.locator('#traffic').isDisabled());
  await page.locator('#demo-restore').click(); await wait('Account management connected');
  await page.locator('#demo-role').selectOption('viewer'); await wait('Read-only preview'); assert.ok(await page.locator('#traffic').isDisabled());
  await page.locator('#demo-role').selectOption('operator'); await page.waitForFunction(() => !document.querySelector('#traffic').disabled);
  // A request dropped before central acceptance must retry its original identity.
  await page.goto(urls.premium + '/#register'); await page.locator('#account-name').fill('Original retry');
  const requests = []; let drop = true;
  await page.route('**/api/action', async route => { requests.push(JSON.parse(route.request().postData())); if (drop) { drop = false; await route.abort(); } else await route.continue(); });
  await page.getByRole('button', { name: 'Prepare workspace', exact: true }).click(); await page.locator('#recover').click(); await page.locator('#retry-original').click();
  await page.getByRole('button', { name: 'Simulate completed sign-in' }).waitFor(); assert.deepEqual(requests[0], requests[1]); await page.unroute('**/api/action');
  // Both fixed contexts, mobile form/table, long names and keyboard search.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(urls.standard); await wait('Workload readiness'); await inspect(`standard-overview-${width}`);
    await page.getByRole('link', { name: 'Accounts 2', exact: true }).click(); await page.locator('#account-search').waitFor();
    await page.keyboard.press('/'); assert.equal(await page.locator('#account-search').evaluate(el => el === document.activeElement), true);
    await page.locator('#account-search').fill('missing'); await wait('No matching accounts'); await page.locator('#clear-filter').click();
    await inspect(`standard-table-${width}`);
    assert.ok(await page.locator('.scroll').evaluate(el => el.scrollWidth > el.clientWidth));
    await page.getByRole('link', { name: 'Register free account', exact: true }).first().click();
    assert.equal(await page.locator('#account-name').evaluate(el => getComputedStyle(el).fontSize), '16px');
    await page.locator('#account-name').fill('A'.repeat(62) + width.toString().slice(-2)); await page.getByRole('button', { name: 'Prepare workspace', exact: true }).click();
    await page.getByRole('button', { name: 'Simulate completed sign-in' }).waitFor(); await inspect(`standard-long-name-${width}`);
    // Restore fixture through its explicit demo control for the next viewport.
    await page.locator('#demo-toggle').click(); await page.locator('#demo-reset').click(); await wait('Workload readiness');
  }
  assert.deepEqual(errors, []); results.push({ browserErrors: errors, flows: ['durable lost response through reload', 'unknown operation exact retry', 'image-only recheck', 'offline saved pause', 'relay acknowledgement', 'central outage', 'read-only', 'mobile table', 'keyboard search', 'long labels'] });
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  if (browser) await browser.close(); await Promise.allSettled(instances.map(close)); fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ checks: results.length, output, browserErrors: errors }));
