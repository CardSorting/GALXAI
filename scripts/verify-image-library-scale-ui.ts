/** Synthetic 10,000-image library; external traffic and generation are blocked. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:3417';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const picture = await fs.readFile('public/images/studio/desert.webp');
const out = path.resolve('.impeccable/review/images-scale'); await fs.mkdir(out, { recursive: true });
const results: unknown[] = [];
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('galx_custom_auth_user', JSON.stringify({ id: 'scale-user', token: 'fixture', provider: 'fixture' })));
    let mode = 'success', detailMode = 'success', pages = 0, details = 0, originals = 0, thumbnails = 0;
    const requests: string[] = [], errors: string[] = [];
    const record = (n: number) => ({ id: `image-${n}`, promptPreview: `Landscape ${n}`, status: 'completed', aspectRatio: n % 2 ? '3:2' : '9:16', quality: 'standard',
      publicUrl: `/v1/images/assets/image-${n}`, createdAt: '2026-09-13T00:00:00Z', isFavorite: false });
    await context.route('**/*', async (route: any) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) return route.abort();
      const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/images/library') {
        pages++; requests.push(url.search); assert.equal(url.searchParams.get('summary'), 'none'); assert.equal(url.searchParams.get('limit'), '36');
        if (mode !== 'success') return json({ error: 'PRIVATE_CANARY' }, mode === 'denied' ? 401 : 503);
        const offset = Number(url.searchParams.get('cursor') || 0), search = url.searchParams.get('search');
        const total = search ? 1 : 10000;
        return json({ success: true, total: null, stats: null, records: Array.from({ length: Math.min(36,total-offset) }, (_, index) => record(search ? 9999 : offset + index)),
          nextCursor: offset + 36 < total ? String(offset + 36) : null, previousCursor: offset > 0 ? String(Math.max(0,offset-36)) : null });
      }
      if (url.pathname.startsWith('/api/images/library/')) {
        if (request.method() === 'PATCH') return json({ success: true });
        details++;
        if (detailMode === 'error') return json({ error: 'PRIVATE_CANARY' }, 503);
        if (detailMode === 'slow') await new Promise(resolve => setTimeout(resolve, 350));
        const n = Number(url.pathname.split('-').at(-1));
        return json({ success: true, record: { ...record(n), prompt: `Full prompt ${n}. ` + 'Detailed texture. '.repeat(1000) } });
      }
      if (url.pathname.startsWith('/v1/images/assets/')) {
        if (url.pathname.endsWith('/thumbnail')) thumbnails++; else originals++;
        return route.fulfill({ status: 200, contentType: 'image/webp', body: picture });
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
        assert.notEqual(url.pathname, '/v1/images/generations');
        return json({ success: true, data: [], balance: 0 });
      }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', (error: Error) => errors.push(error.message));
    await page.goto(base + '/images', { waitUntil: 'networkidle' }); assert.equal(pages, 0, 'Create does not hydrate the saved library');
    await page.getByRole('link', { name: 'My images', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.studio-result').length === 36);
    const pagination = page.getByRole('navigation', { name: 'Image library pages', exact: true });
    const next = pagination.getByRole('button', { name: 'Next', exact: true });
    const previous = pagination.getByRole('button', { name: 'Previous', exact: true });
    await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('.studio-results-grid img')).some(image => image.complete && image.naturalWidth > 0));
    assert(await previous.isDisabled()); assert.equal(details, 0); assert.equal(originals, 0); assert(thumbnails > 0);
    const loops = width === 1440 ? 100 : 3;
    for (let n = 1; n <= loops; n++) {
      await next.click(); await pagination.getByText(`Page ${n + 1}`, { exact: true }).waitFor();
      assert.equal(await page.locator('.studio-result').count(), 36);
      assert.equal(await page.locator('.studio-results-grid img').count(), 36);
    }
    await previous.click(); await pagination.getByText(`Page ${loops}`, { exact: true }).waitFor();
    const before = await page.locator('.studio-result-preview').first().getAttribute('aria-label');
    await page.getByRole('link', { name: 'Create', exact: true }).click();
    await page.getByRole('link', { name: 'My images', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('[aria-label="Refresh library"]')?.disabled);
    assert.equal(await page.locator('.studio-result-preview').first().getAttribute('aria-label'), before, 'switching views preserves the current page');
    mode = 'error'; await next.click(); await page.getByRole('alert').waitFor();
    const failed = requests.at(-1); assert.equal(await page.locator('.studio-result-preview').first().getAttribute('aria-label'), before);
    mode = 'success'; await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await pagination.getByText(`Page ${loops + 1}`, { exact: true }).waitFor(); assert.equal(requests.at(-1), failed);
    detailMode = 'error'; await page.locator('.studio-result-preview').first().click();
    const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Retry details' }).waitFor();
    assert(await dialog.getByRole('button', { name: 'Copy prompt', exact: true }).isDisabled());
    detailMode = 'success'; await dialog.getByRole('button', { name: 'Retry details' }).click();
    await page.waitForFunction(() => document.querySelector('.studio-detail-prompt')?.textContent?.startsWith('Full prompt'));
    assert(await dialog.getByRole('button', { name: 'Copy prompt', exact: true }).isEnabled());
    detailMode = 'slow'; await dialog.getByRole('button', { name: 'Next image', exact: true }).click(); await page.keyboard.press('Escape');
    await page.waitForTimeout(400); assert.equal(await page.getByRole('dialog').count(), 0, 'late details cannot reopen a closed lightbox');
    assert.equal(await page.locator('.studio-result').count(), 36);
    await page.getByRole('searchbox', { name: 'Search your images' }).fill('9999');
    await page.waitForFunction(() => document.querySelectorAll('.studio-result').length === 1);
    await pagination.getByText('Page 1', { exact: true }).waitFor(); assert(await previous.isDisabled()); assert(await next.isDisabled());
    detailMode = 'success'; await page.getByRole('button', { name: 'Reuse prompt', exact: true }).click();
    await page.waitForFunction(() => document.querySelector<HTMLTextAreaElement>('#studio-prompt')?.value.startsWith('Full prompt 9999.'));
    assert((await page.getByLabel('Prompt', { exact: true }).inputValue()).length > 300, 'reuse receives the full saved prompt');
    await page.getByRole('link', { name: 'My images', exact: true }).click(); await page.getByRole('searchbox', { name: 'Search your images' }).fill('');
    await page.waitForFunction(() => document.querySelectorAll('.studio-result').length === 36);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false); assert.doesNotMatch(await page.locator('.studio').innerText(), /PRIVATE_CANARY/);
    const axe = await new AxeBuilder({ page }).include('.studio').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations, []); assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(out, `library-${width}.png`) });
    results.push({ width, fixtureImages: 10000, consecutivePages: loops, maxCards: 36, maxGridImages: 36, overflow, axeViolations: axe.violations.length, requests: { pages, details, originals, thumbnails } });
    mode = 'denied'; await page.getByRole('button', { name: 'Refresh library' }).click(); await page.getByRole('link', { name: 'Sign in again', exact: true }).waitFor();
    assert.equal(await page.locator('.studio-result').count(), 0);
    await context.close();
  }
  await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
