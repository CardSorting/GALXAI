/** Controlled browser fixtures only; never submits to the live generation service. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:3417';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const out = path.resolve('.impeccable/review/images');
await fs.mkdir(out, { recursive: true });
const picture = await fs.readFile('public/images/studio/desert.webp');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results: unknown[] = [];
const sentinel = 'private-diagnostic-sentinel';

async function setup(width: number, authenticated: boolean) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  const state = { posts: 0, polls: 0, patches: 0, complete: false, mode: 'success', libraryMode: 'success', payload: null as any,
    images: [] as any[], favorites: new Set<string>(), libraryQueries: [] as string[] };
  if (authenticated) await context.addInitScript(() => {
    localStorage.setItem('galx_custom_auth_user', JSON.stringify({ id: 'studio-test-user', token: 'studio-fixture-token', name: 'Studio Tester', provider: 'fixture' }));
  });
  const fixture = (id: string, prompt: string, ratio = '3:2') => ({ id, prompt, aspectRatio: ratio, status: 'completed', quality: 'standard',
    publicUrl: `https://galx.ai/v1/images/assets/${id}`, createdAt: '2026-09-10T10:00:00Z', isFavorite: state.favorites.has(id), internal: sentinel, model: sentinel });
  await context.route('**/*', async (route: any) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== new URL(base).origin) return route.abort();
    const json = (value: unknown, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value), headers });
    if (url.pathname === '/v1/images/generations') {
      state.posts++; state.payload = req.postDataJSON();
      assert.equal(req.headers().prefer, 'respond-async');
      assert(req.headers()['idempotency-key']);
      assert.equal(req.headers().authorization, 'Bearer studio-fixture-token');
      if (state.mode === 'offline') return route.abort();
      if (state.mode === 'limited') return json({ error: { code: 'rate_limited', message: sentinel } }, 429, { 'Retry-After': '2' });
      if (state.mode === 'unauthorized') return json({ error: { message: sentinel } }, 401);
      return json({ id: 'request-fixture', status: 'queued', task_url: 'https://evil.test/private', internal: sentinel }, 202);
    }
    if (url.pathname === '/v1/images/requests/request-fixture') {
      state.polls++;
      if (!state.complete) return json({ id: 'request-fixture', status: 'queued', private: sentinel }, 202);
      state.images = [fixture('fixture-image', state.payload?.prompt || 'Recovered image', '3:2')];
      return json({ data: [{ b64_json: picture.toString('base64'), internal: sentinel }], internal: sentinel });
    }
    if (url.pathname.startsWith('/v1/images/assets/')) return route.fulfill({ status: 200, contentType: 'image/webp', body: picture });
    if (url.pathname === '/api/images/library') {
      state.libraryQueries.push(url.search);
      if (state.libraryMode === 'error') return json({ error: sentinel }, 503);
      if (state.libraryMode === 'unauthorized') return json({ error: sentinel }, 401);
      let records = state.images.map(image => ({ ...image, isFavorite: state.favorites.has(image.id) }));
      if (url.searchParams.has('search')) records = records.filter(image => image.prompt.toLowerCase().includes(url.searchParams.get('search')!.toLowerCase()));
      if (url.searchParams.get('isFavorite') === 'true') records = records.filter(image => image.isFavorite);
      if (url.searchParams.get('cursor')) records = [fixture('second-image', 'Another beautiful landscape')];
      return json({ success: true, records, total: state.libraryMode === 'pages' ? 2 : records.length, nextCursor: state.libraryMode === 'pages' && !url.searchParams.get('cursor') ? 'page-two' : null, internal: sentinel });
    }
    if (url.pathname.startsWith('/api/images/library/')) {
      state.patches++;
      const id = url.pathname.split('/').pop()!;
      if (req.postDataJSON().isFavorite) state.favorites.add(id); else state.favorites.delete(id);
      return json({ success: true });
    }
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) return json({ success: true, data: [], balance: 0, balanceUsd: 0 });
    return route.continue();
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error: Error) => pageErrors.push(error.message));
  return { context, page, state, pageErrors };
}
async function inspect(page: any, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => { const body = document.querySelector('.studio-canvas-body')!.getBoundingClientRect(); return { available: innerWidth, canvas: body.width }; });
  if (widths.available < 760) assert.equal(widths.canvas, widths.available, 'mobile canvas uses full width');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, `${label}: no horizontal overflow`);
  assert.doesNotMatch(await page.locator('.studio').innerText(), /private-diagnostic-sentinel/);
  const axe = await new AxeBuilder({ page }).include('.studio').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const issues = axe.violations.map((issue: any) => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map((node: any) => node.target) }));
  results.push({ label, overflow, accessibility: issues });
  if (!process.env.GALX_STUDIO_NO_CAPTURE) await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: !(await page.getByRole('dialog').count()) });
  assert.deepEqual(issues, [], `${label}: accessibility checks pass`);
  return issues;
}
try {
  for (const width of [1440, 390]) {
    const { context, page, state, pageErrors } = await setup(width, false);
    await page.goto(base + '/images', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Sign in to generate' }).waitFor().catch(async (error: Error) => { console.log('BROWSER DEBUG', pageErrors, (await page.locator('body').innerText()).slice(0,3000)); await page.screenshot({ path: path.join(out, 'debug.png'), fullPage: true }); throw error; });
    await inspect(page, `guest-${width}`);
    assert(await page.evaluate(() => Boolean(document.querySelector('.studio-view-nav')!.compareDocumentPosition(document.querySelector('.studio-composer')!) & Node.DOCUMENT_POSITION_FOLLOWING)), 'navigation precedes composer in keyboard order');
    await page.getByRole('button', { name: 'Use prompt: Somewhere unexpected' }).click();
    assert.match(await page.getByLabel('Prompt', { exact: true }).inputValue(), /terracotta/);
    assert.equal(await page.getByRole('button', { name: 'Landscape 3:2' }).getAttribute('aria-pressed'), 'true');
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.getByLabel('Prompt', { exact: true }).inputValue(), /terracotta/);
    await page.getByRole('button', { name: 'My images', exact: true }).click();
    await page.getByRole('heading', { name: 'Your own space to create' }).waitFor();
    assert.equal(state.posts, 0); assert.deepEqual(pageErrors, []);
    await context.close();
  }

  const { context, page, state, pageErrors } = await setup(1440, true);
  await page.goto(base + '/images', { waitUntil: 'networkidle' });
  const generate = page.getByRole('button', { name: 'Generate image', exact: true });
  await generate.waitFor(); assert(await generate.isDisabled());
  await page.getByLabel('Prompt', { exact: true }).fill('A cinematic blue desert lake');
  await page.getByRole('button', { name: 'Landscape 3:2' }).click();
  await page.getByRole('button', { name: '2 images', exact: true }).click();
  await page.getByLabel('Prompt', { exact: true }).press('Control+Enter');
  await page.getByRole('heading', { name: 'Waiting to start…' }).waitFor();
  assert.equal(state.posts, 1);
  assert.deepEqual(state.payload, { model: 'openai-gpt-image-latest', prompt: 'A cinematic blue desert lake', n: 2, size: '1536x1024', quality: 'standard', response_format: 'url' });
  await page.getByRole('button', { name: 'Pause status checks' }).click();
  await page.getByRole('button', { name: 'Check status', exact: true }).waitFor();
  await inspect(page, 'pending-1440');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Waiting to start…' }).waitFor();
  assert.equal(state.posts, 1, 'reload resumes retrieval without another generation');
  state.complete = true;
  await page.getByRole('heading', { name: 'Fresh from your imagination' }).waitFor();
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).click();
  await page.getByRole('dialog').waitFor();
  await inspect(page, 'inspector-1440');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image', exact: true }).last().click();
  assert.match((await download).suggestedFilename(), /\.webp$/);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert(await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).evaluate((el: HTMLElement) => el === document.activeElement));
  await page.getByRole('button', { name: 'My images', exact: true }).click();
  await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).waitFor();
  assert.equal(state.patches, 1);
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove from favorites' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add to favorites' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Keep your favorites close' }).waitFor();
  await page.getByRole('button', { name: 'My images', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search your images' }).fill('no match');
  await page.getByRole('heading', { name: 'No images match your search' }).waitFor();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).waitFor();
  state.libraryMode = 'pages'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.getByRole('button', { name: 'Load more images' }).click();
  await page.getByRole('button', { name: 'Open image: Another beautiful landscape' }).waitFor();
  await inspect(page, 'library-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await inspect(page, 'library-390');
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).click();
  await inspect(page, 'inspector-390');
  await page.keyboard.press('Escape');
  state.libraryMode = 'error'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.getByRole('heading', { name: 'Your images couldn’t be loaded' }).waitFor();
  await inspect(page, 'library-error-390');
  state.libraryMode = 'unauthorized'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.getByRole('link', { name: 'Sign in again', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Sign in again', exact: true }).getAttribute('href'), '/auth/signin?next=%2Fimages');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  state.mode = 'limited';
  await page.getByRole('button', { name: 'Generate 2 images', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Your request limit' }).waitFor();
  assert.doesNotMatch(await page.locator('.studio').innerText(), new RegExp(sentinel));
  await page.getByRole('button', { name: /^Try again in [12]s$/ }).waitFor();
  await page.getByRole('button', { name: 'Generate 2 images', exact: true }).waitFor();
  assert.equal(state.posts, 2, 'rate limit does not automatically retry');
  state.mode = 'offline';
  await page.getByRole('button', { name: 'Generate 2 images', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'connection was interrupted' }).waitFor();
  assert(await page.getByRole('button', { name: 'Generate 2 images', exact: true }).isDisabled());
  assert.equal(state.posts, 3);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('alert').filter({ hasText: 'earlier request was interrupted' }).waitFor();
  assert.equal(state.posts, 3); assert.deepEqual(pageErrors, []);
  await context.close();
} finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
