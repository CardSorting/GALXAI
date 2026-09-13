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

async function setup(width: number, authenticated: boolean, reducedMotion: 'reduce' | 'no-preference' = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
  const state = { posts: 0, polls: 0, patches: 0, complete: false, mode: 'success', libraryMode: 'success', libraryHold: null as Promise<void> | null, payload: null as any,
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
      if (state.mode === 'malformed') return json({ data: [{ url: 'https://evil.test/image.png' }], internal: sentinel });
      if (state.mode === 'immediate') return json({ data: Array.from({ length: state.payload.n }, () => ({ b64_json: picture.toString('base64'), internal: sentinel })) });
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
      if (state.libraryHold) await state.libraryHold;
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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => { const body = document.querySelector('.studio-canvas-body')!.getBoundingClientRect(); return { available: innerWidth, canvas: body.width }; });
  if (widths.available < 760) assert.equal(widths.canvas, widths.available, 'mobile canvas uses full width');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, `${label}: no horizontal overflow`);
  assert.doesNotMatch(await page.locator('.studio').innerText(), /private-diagnostic-sentinel/);
  const axe = await new AxeBuilder({ page }).include('.studio').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const issues = axe.violations.map((issue: any) => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map((node: any) => node.target) }));
  results.push({ label, overflow, accessibility: issues });
  if (!process.env.GALX_STUDIO_NO_CAPTURE) {
    await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: !(await page.getByRole('dialog').count()) });
    if (/^(latest|grid|simulation|continuity)-/.test(label)) await page.locator('.studio-creations').screenshot({ path: path.join(out, `${label}-canvas.png`) });
  }
  assert.deepEqual(issues, [], `${label}: accessibility checks pass`);
  return issues;
}
try {
  for (const width of [1440, 390]) {
    const { context, page, state, pageErrors } = await setup(width, false);
    await page.goto(base + '/images', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Sign in to generate' }).waitFor().catch(async (error: Error) => { console.log('BROWSER DEBUG', pageErrors, (await page.locator('body').innerText()).slice(0,3000)); await page.screenshot({ path: path.join(out, 'debug.png'), fullPage: true }); throw error; });
    await inspect(page, `guest-${width}`);
    assert.equal(await page.locator('.studio-creations img, .studio-creations canvas').count(), 0, 'the canvas starts blank');
    assert.doesNotMatch(await page.locator('.studio').innerText(), /What will you imagine|AI-generated examples|Somewhere unexpected|High detail can take longer/);
    assert(await page.evaluate(() => Boolean(document.querySelector('.studio-view-nav')!.compareDocumentPosition(document.querySelector('.studio-composer')!) & Node.DOCUMENT_POSITION_FOLLOWING)), 'navigation precedes composer in keyboard order');
    await page.getByLabel('Prompt', { exact: true }).fill('A terracotta landscape');
    const clearSize = await page.getByRole('button', { name: 'Clear', exact: true }).boundingBox();
    assert(clearSize.width >= 44 && clearSize.height >= 44, 'Clear has a forgiving touch target');
    await page.getByRole('button', { name: 'Landscape 3:2' }).click();
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
  assert.equal(await page.locator('.studio-denoising').count(), 1);
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  assert.equal(await page.locator('.studio-denoising').count(), 2, 'each requested image has a pending slot');
  await page.getByRole('button', { name: 'Image', exact: true }).click();
  assert.equal(state.posts, 1);
  const beforeHidden = state.polls;
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(3000);
  assert.equal(state.polls, beforeHidden, 'hidden page stops status requests');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => document.visibilityState === 'visible');
  assert.deepEqual(state.payload, { model: 'openai-gpt-image-latest', prompt: 'A cinematic blue desert lake', n: 2, size: '1536x1024', quality: 'standard', response_format: 'url' });
  await page.getByText('Generation options', { exact: true }).click();
  await page.getByRole('button', { name: 'Pause updates' }).click();
  await page.getByRole('button', { name: 'Resume updates', exact: true }).waitFor();
  await inspect(page, 'pending-1440');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Waiting to start…' }).waitFor();
  assert.equal(state.posts, 1, 'reload resumes retrieval without another generation');
  state.complete = true;
  await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).waitFor();
  assert.equal(await page.locator('.studio-denoising').count(), 0, 'completion replaces the simulation with real image output');
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
  let releaseLibrary!: () => void;
  state.libraryHold = new Promise(resolve => { releaseLibrary = resolve; });
  await page.getByRole('button', { name: 'Refresh library' }).click();
  try {
    await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('button[aria-label="Refresh library"]')?.disabled);
    assert(await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).isVisible(), 'refresh retains the visible image while its response is pending');
  } finally { state.libraryHold = null; releaseLibrary(); }
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('button[aria-label="Refresh library"]')?.disabled);
  state.libraryMode = 'pages'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-library-pagination button')).some(button => button.textContent === 'Next' && !button.disabled));
  state.libraryMode = 'error';
  await page.getByRole('navigation', { name: 'Image library pages', exact: true }).getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Couldn’t update your library' }).waitFor();
  assert(await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).isVisible(), 'failed pagination keeps existing images');
  const failedPage = state.libraryQueries.at(-1);
  assert.equal(new URLSearchParams(failedPage).get('cursor'), 'page-two');
  state.libraryMode = 'pages';
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('button', { name: 'Open image: Another beautiful landscape' }).waitFor();
  assert.equal(state.libraryQueries.at(-1), failedPage, 'retry loads the failed page instead of discarding the loaded pages');
  await inspect(page, 'library-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await inspect(page, 'library-390');
  await page.getByRole('button', { name: 'Open image: Another beautiful landscape' }).click();
  await inspect(page, 'inspector-390');
  await page.keyboard.press('Escape');
  state.libraryMode = 'error'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.getByRole('alert').filter({ hasText: 'Couldn’t update your library' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open image: A cinematic blue desert lake' }).count(), 0, 'earlier page is released');
  assert(await page.getByRole('button', { name: 'Open image: Another beautiful landscape' }).isVisible(), 'failed refresh preserves the visible page');
  await inspect(page, 'library-error-390');
  state.libraryMode = 'unauthorized'; await page.getByRole('button', { name: 'Refresh library' }).click();
  await page.getByRole('link', { name: 'Sign in again', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Open image:/ }).count(), 0, 'authorization failure clears the library');
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

  for (const width of [1440, 390]) {
    const run = await setup(width, true);
    run.state.mode = 'immediate';
    await run.page.goto(base + '/images', { waitUntil: 'networkidle' });
    await run.page.getByLabel('Prompt', { exact: true }).fill('Two blue landscapes');
    await run.page.getByRole('button', { name: '2 images', exact: true }).click();
    await run.page.getByRole('button', { name: 'Generate 2 images', exact: true }).click();
    await run.page.getByText('2 recent images', { exact: true }).waitFor();
    assert.equal(await run.page.locator('.studio-focused-image').count(), 1, 'latest view shows just the newest image');
    if (width < 760) await run.page.getByRole('button', { name: 'Edit prompt', exact: true }).click();
    await run.page.getByLabel('Prompt', { exact: true }).fill('A third image');
    await run.page.getByRole('button', { name: '1 image', exact: true }).click();
    await run.page.getByRole('button', { name: 'Generate image', exact: true }).click();
    await run.page.getByRole('button', { name: 'Open image: A third image' }).waitFor();
    if (width > 760) assert.equal(await run.page.locator('.studio-return-results').isVisible(), false, 'mobile return action stays hidden on desktop');
    await inspect(run.page, `latest-${width}`);
    await run.page.getByRole('button', { name: 'Grid', exact: true }).click();
    assert.equal(await run.page.locator('.studio-creation-thumbnail').count(), 3, 'all completed batches remain in the session array');
    assert(await run.page.locator('.studio-creation-thumbnail').first().evaluate((el: HTMLElement) => el.getBoundingClientRect().width <= 160), 'grid cards stay thumbnail sized');
    await inspect(run.page, `grid-${width}`);
    const thumb = run.page.getByRole('button', { name: 'Open image: Two blue landscapes' }).first();
    await thumb.click();
    await run.page.getByRole('dialog').waitFor();
    const dialog = run.page.getByRole('dialog');
    assert(await dialog.getByRole('button', { name: 'Previous image', exact: true }).isDisabled());
    await run.page.keyboard.press('ArrowRight');
    await dialog.getByText('2 of 3', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
    await dialog.getByText('3 of 3', { exact: true }).waitFor();
    assert(await dialog.getByRole('button', { name: 'Next image', exact: true }).isDisabled());
    await run.page.keyboard.press('Tab');
    assert(await dialog.evaluate((el: HTMLElement) => el.contains(document.activeElement)), 'keyboard focus stays in the dialog');
    await inspect(run.page, `browse-inspector-${width}`);
    await run.page.keyboard.press('Escape');
    assert(await thumb.evaluate((el: HTMLElement) => el === document.activeElement), 'lightbox restores focus to the thumbnail');
    await run.page.getByRole('button', { name: 'My images', exact: true }).click();
    await run.page.getByRole('button', { name: 'Create', exact: true }).click();
    assert.equal(await run.page.getByRole('button', { name: 'Grid', exact: true }).getAttribute('aria-pressed'), 'true', 'view survives library navigation');
    await run.page.getByRole('button', { name: 'Image', exact: true }).click();
    await run.page.getByRole('button', { name: 'Show image 1: Two blue landscapes', exact: true }).click();
    await run.page.locator('.studio-focused-image').focus();
    await run.page.keyboard.press('ArrowRight');
    assert.equal(await run.page.getByRole('button', { name: 'Show image 2: Two blue landscapes', exact: true }).getAttribute('aria-pressed'), 'true', 'focused image supports arrow navigation');
    if (width < 760) await run.page.getByRole('button', { name: 'Edit prompt', exact: true }).click();
    await run.page.getByLabel('Prompt', { exact: true }).fill('Another landscape while browsing');
    run.state.mode = 'success';
    await run.page.getByRole('button', { name: 'Generate image', exact: true }).click();
    await run.page.getByRole('heading', { name: 'Waiting to start…' }).waitFor();
    assert.equal(await run.page.locator('.studio-focused-image').count(), 1, 'browsing keeps an earlier image visible while generating');
    await run.page.getByRole('button', { name: 'View generation', exact: true }).click();
    assert.equal(await run.page.locator('.studio-denoising').count(), 1);
    await run.page.getByRole('button', { name: 'Previous generated image', exact: true }).click();
    run.state.complete = true;
    await run.page.getByText('4 recent images', { exact: true }).waitFor();
    await run.page.locator('.studio-focused-image').filter({ has: run.page.getByAltText('A third image', { exact: true }) }).waitFor();
    assert.equal(await run.page.getByRole('button', { name: 'Show image 3: A third image', exact: true }).getAttribute('aria-pressed'), 'true', 'completion does not steal the selected image');
    await run.page.getByRole('button', { name: 'Latest image', exact: true }).click();
    await run.page.getByRole('button', { name: 'Open image: Another landscape while browsing', exact: true }).waitFor();
    assert.equal(run.state.posts, 3, 'browsing never submits a generation');
    await inspect(run.page, `continuity-${width}`);
    if (width === 390) {
      await run.page.setViewportSize({ width: 320, height: 740 });
      await inspect(run.page, 'continuity-320');
      await run.page.setViewportSize({ width, height: 1000 });
    } else {
      await run.page.setViewportSize({ width: 1280, height: 700 });
      await inspect(run.page, 'workspace-short');
      assert(await run.page.getByText('Scroll for more settings', { exact: true }).isVisible());
      await run.page.setViewportSize({ width, height: 1000 });
    }
    await run.page.getByRole('button', { name: 'Grid', exact: true }).click();
    if (width < 760) await run.page.getByRole('button', { name: 'Edit prompt', exact: true }).click();
    if (width < 760) {
      assert(await run.page.getByRole('button', { name: 'Back to images', exact: true }).isVisible());
      await run.page.waitForFunction(() => document.activeElement?.id === 'studio-prompt');
      assert(await run.page.getByLabel('Prompt', { exact: true }).evaluate((el: HTMLElement) => el === document.activeElement), 'Edit prompt restores text-entry focus');
      await inspect(run.page, 'composer-expanded-390');
      await run.page.getByRole('button', { name: 'Back to images', exact: true }).click();
      assert.equal(await run.page.getByLabel('Prompt', { exact: true }).isVisible(), false);
      await run.page.getByRole('button', { name: 'Edit prompt', exact: true }).click();
    }
    run.state.mode = 'malformed';
    await run.page.getByRole('button', { name: 'Generate image', exact: true }).click();
    await run.page.getByRole('alert').filter({ hasText: 'connection was interrupted' }).waitFor();
    assert.equal(await run.page.locator('.studio-creation-thumbnail').count(), 4, 'invalid output does not add an image or discard previous results');
    assert.equal(await run.page.locator('.studio-denoising').count(), 0, 'an interrupted submission stops its animation');
    assert.deepEqual(run.pageErrors, []);
    await run.context.close();
  }

  const strip = await setup(900, true);
  strip.state.mode = 'immediate';
  await strip.page.goto(base + '/images', { waitUntil: 'networkidle' });
  await strip.page.getByLabel('Prompt', { exact: true }).fill('A twelve-image browsing session');
  await strip.page.getByRole('button', { name: '4 images', exact: true }).click();
  for (let batch = 1; batch <= 3; batch++) {
    await strip.page.getByRole('button', { name: 'Generate 4 images', exact: true }).click();
    await strip.page.getByText(`${batch * 4} recent images`, { exact: true }).waitFor();
  }
  const selectedThumb = strip.page.locator('.studio-filmstrip [aria-pressed="true"]');
  const stripBounds = await strip.page.locator('.studio-filmstrip').boundingBox();
  const selectedBounds = await selectedThumb.boundingBox();
  assert(selectedBounds.x >= stripBounds.x && selectedBounds.x + selectedBounds.width <= stripBounds.x + stripBounds.width, 'selected filmstrip image scrolls into view at intermediate widths');
  await inspect(strip.page, 'filmstrip-900');
  await strip.context.close();

  const motion = await setup(1440, true, 'no-preference');
  await motion.page.goto(base + '/images', { waitUntil: 'networkidle' });
  await motion.page.getByLabel('Prompt', { exact: true }).fill('A softly lit landscape');
  await motion.page.getByRole('button', { name: 'Generate image', exact: true }).click();
  await motion.page.getByRole('heading', { name: 'Waiting to start…' }).waitFor();
  const pixels = () => motion.page.locator('.studio-denoising').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const initial = await pixels();
  await motion.page.waitForTimeout(400);
  assert.notEqual(await pixels(), initial, 'the simulation changes while generating');
  await motion.page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await motion.page.waitForTimeout(100);
  const paused = await pixels();
  await motion.page.waitForTimeout(300);
  assert.equal(await pixels(), paused, 'pausing the animation freezes the canvas');
  await motion.page.getByText('Generation options', { exact: true }).click();
  assert(await motion.page.getByRole('button', { name: 'Pause updates', exact: true }).isVisible(), 'animation controls do not pause status retrieval');
  await motion.page.getByRole('button', { name: 'Play animation', exact: true }).click();
  await inspect(motion.page, 'simulation-1440');
  await motion.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await pixels();
  await motion.page.waitForTimeout(300);
  assert.equal(await pixels(), hidden, 'hidden canvases stop painting');
  await motion.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await motion.page.waitForTimeout(300);
  assert.notEqual(await pixels(), hidden, 'visible canvases resume painting');
  await motion.page.emulateMedia({ reducedMotion: 'reduce' });
  await motion.page.waitForTimeout(100);
  const reduced = await pixels();
  await motion.page.waitForTimeout(300);
  assert.equal(await pixels(), reduced, 'reduced motion keeps the simulation static');
  assert.equal(motion.state.posts, 1);
  assert.deepEqual(motion.pageErrors, []);
  await motion.context.close();
} finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
