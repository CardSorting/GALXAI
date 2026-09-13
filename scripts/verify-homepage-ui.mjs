/** Local production-build homepage review. No account, payment, or publication writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.impeccable/review', process.argv.includes('--motion-only') ? 'galaxy-home-playful-diagnostic' : 'galaxy-home-playful');
await mkdir(output, { recursive: true });
const workspace = await mkdtemp(path.join(tmpdir(), 'galx-home-ui-'));
for (const name of ['.next', 'public', 'node_modules']) await symlink(path.join(root, name), path.join(workspace, name));
await writeFile(path.join(workspace, 'package.json'), '{"private":true}');
const port = 3424, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', workspace, '-p', String(port), '-H', '127.0.0.1'], {
  cwd: workspace, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const checks = [], scripts = new Set(), socialImages = [];
const forbiddenCopy = /openai|frontier|supabase|broccolidb|postgres|shard|upstream|inference|credentials|routing|cloudflare|vercel|api gateway/i;
const forbiddenAssets = /preview_application_snapshots|preview_admin_members|preview_admin_audit|api\.openai\.com|PRIVATE_SENTINEL|INTERNAL_KEY|DATABASE_URL/;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base)).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Local production server did not become ready');
  const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
  const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const width of process.argv.includes('--motion-only') ? [] : [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(base, { waitUntil: 'networkidle' }); assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
    assert.match(await page.getByRole('heading', { level: 1 }).innerText(), /Your idea,\s*ready to share/);
    const main = page.locator('main');
    assert.equal(await main.getByRole('link', { name: 'Start with Sites' }).first().getAttribute('href'), '/sites');
    assert.equal(await main.getByRole('link', { name: 'Continue with GALX Pro' }).getAttribute('href'), '/auth/signin?next=%2Fbilling%23plan');
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link').first().innerText(), 'Sites');
    assert.equal(await page.getByRole('link', { name: 'Sign in', exact: true }).getAttribute('href'), '/auth/signin?next=%2Fsites');
    assert.equal(await page.getByRole('navigation', { name: 'Footer', exact: true }).getByRole('link').first().innerText(), 'Sites');
    assert.match(await page.locator('#pricing').innerText(), /\$20/);
    assert.equal(await page.locator('#pricing table').count(), 1);
    assert.equal(await page.locator('#faq details').count(), 6);
    assert(await page.evaluate(() => document.querySelector('#pricing').compareDocumentPosition(document.querySelector('#faq')) & Node.DOCUMENT_POSITION_FOLLOWING));
    assert.doesNotMatch(await page.locator('body').innerText(), forbiddenCopy);
    const metadata = await page.locator('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('content') || node.textContent).join('\n'));
    assert.doesNotMatch(metadata, forbiddenCopy); assert.match(metadata, /GALX Sites/);
    for (const src of await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')))) scripts.add(src);
    assert(await page.locator('main img').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0)));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `document overflow at ${width}px`);
    await page.screenshot({ path: path.join(output, `full-${width}.png`), fullPage: true });
    if (width === 1440 || width === 390) {
      await page.locator('main > section').first().screenshot({ path: path.join(output, `hero-${width}.png`) });
      await page.locator('#pricing').screenshot({ path: path.join(output, `pricing-${width}.png`) });
    }
    const picker = page.getByRole('group', { name: 'Choose an example' });
    const figure = page.getByRole('figure', { name: 'Explore starting ideas for your Site' });
    const exampleHeights = [];
    for (const [label, id] of [['Landing page', 'product'], ['Portfolio', 'portfolio'], ['Event page', 'event']]) {
      const choice = picker.getByRole('button', { name: label, exact: true });
      await choice.focus(); await page.keyboard.press('Enter');
      assert.equal(await choice.getAttribute('aria-pressed'), 'true');
      assert.equal(await picker.locator('[aria-pressed="true"]').count(), 1);
      assert.equal(await figure.getByRole('link', { name: 'Use this idea' }).getAttribute('href'), `/sites?starter=${id}`);
      const firstTitle = await figure.getByRole('heading', { level: 2 }).innerText();
      exampleHeights.push((await figure.boundingBox()).height);
      await figure.getByRole('button', { name: 'See a revision' }).click();
      assert.notEqual(await figure.getByRole('heading', { level: 2 }).innerText(), firstTitle);
      assert.equal(await figure.getByRole('link', { name: 'Use this idea' }).getAttribute('href'), `/sites?starter=${id}&refine=1`);
      exampleHeights.push((await figure.boundingBox()).height);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if ((width === 1440 || width === 390) && id === 'portfolio') await figure.screenshot({ path: path.join(output, `example-revised-${width}.png`) });
      await figure.getByRole('button', { name: 'Back to first draft' }).click();
    }
    assert.ok(Math.max(...exampleHeights) - Math.min(...exampleHeights) <= 1, `example controls move between versions at ${width}px: ${exampleHeights.join(', ')}`);
    await picker.getByRole('button', { name: 'Landing page', exact: true }).click();
    await page.getByRole('link', { name: 'Skip to main content' }).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'homepage-content');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Start with Sites');
    const question = page.locator('#faq summary').first(); await question.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#faq details').first().evaluate(node => node.open), true);
    await page.locator('#faq details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
    assert.doesNotMatch(await page.locator('#faq').innerText(), forbiddenCopy);
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
    assert.deepEqual(violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) })), []);
    if (width === 1440 || width === 390) await page.locator('#faq').screenshot({ path: path.join(output, `faq-${width}.png`) });
    await main.getByRole('link', { name: 'See pricing', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#pricing');
    assert.deepEqual(errors, []);
    checks.push({ width, overflow, axeViolations: violations.length, pageErrors: errors.length, versions: 'passed', keyboard: 'passed', copy: 'passed', pricing: 'passed', skipLink: 'passed', exampleHeights });
    if (width === 1440) {
      await main.getByRole('link', { name: 'Continue with GALX Pro' }).click();
      await page.waitForURL('**/auth/signin?next=%2Fbilling%23plan');
      assert.equal(new URL(page.url()).searchParams.get('next'), '/billing#plan');
      await page.locator('input[type="email"]').first().waitFor();
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('group', { name: 'Choose an example' }).getByRole('button', { name: 'Portfolio', exact: true }).click();
      await page.getByRole('button', { name: 'See a revision' }).click();
      await page.getByRole('link', { name: 'Use this idea' }).click();
      await page.waitForURL('**/sites?starter=portfolio&refine=1');
      const prompt = page.getByRole('textbox', { name: 'Describe your Site or ask for a change' });
      await prompt.waitFor(); await page.waitForFunction(() => document.querySelector('#site-prompt')?.value.includes('small businesses'));
      assert.match(await prompt.inputValue(), /independent brand designer/);
      const idea = await prompt.inputValue();
      const signIn = page.getByRole('link', { name: 'Sign in to create', exact: true });
      assert.equal(await signIn.getAttribute('href'), '/auth/signin?next=%2Fsites%3Fstarter%3Dportfolio%26refine%3D1');
      await signIn.click(); await page.waitForURL('**/auth/signin?next=**');
      assert.equal(new URL(page.url()).searchParams.get('next'), '/sites?starter=portfolio&refine=1');
      await page.locator('input[type="email"]').first().waitFor();
      await page.goBack({ waitUntil: 'networkidle' });
      await page.waitForFunction(value => document.querySelector('#site-prompt')?.value === value, idea);
      await prompt.fill('My own unfinished idea. Keep this draft.');
      await page.goto(base + '/sites?starter=event', { waitUntil: 'networkidle' });
      assert.equal(await prompt.inputValue(), 'My own unfinished idea. Keep this draft.');
      await page.getByText('Your unsent draft is still here.', { exact: false }).waitFor();
      await page.getByRole('button', { name: 'An event page', exact: true }).click();
      assert.equal(await prompt.inputValue(), 'My own unfinished idea. Keep this draft.');
      await prompt.fill('');
      await page.getByRole('button', { name: 'An event page', exact: true }).click();
      assert.match(await prompt.inputValue(), /neighborhood makers market/);
      await page.reload({ waitUntil: 'networkidle' });
      assert.match(await prompt.inputValue(), /neighborhood makers market/);
      await page.screenshot({ path: path.join(output, 'starter-workspace-1440.png'), fullPage: true });
      await prompt.fill('');
      await page.goto(base + '/sites?starter=unknown', { waitUntil: 'networkidle' });
      assert.equal(await prompt.inputValue(), '');
      assert.equal(await page.getByRole('navigation', { name: 'Footer', exact: true }).getByRole('link').first().innerText(), 'Images');
    }
    await context.close(); console.log(`PASS: homepage at ${width}px, pricing, example revisions, FAQ, keyboard, accessibility, public copy and navigation.`);
  }
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference', isMobile: width === 390, hasTouch: width === 390 });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await context.addInitScript(() => {
      window.homeMetrics = { cls: 0, lcp: 0, longTasks: [], shifts: [] };
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          window.homeMetrics.cls += entry.value;
          window.homeMetrics.shifts.push({ at: entry.startTime, value: entry.value, sources: entry.sources.map(source => ({ element: source.node?.tagName, id: source.node?.id, className: source.node?.getAttribute?.('class'), previous: source.previousRect, current: source.currentRect })) });
        }
      })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => { window.homeMetrics.lcp = entry.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => { window.homeMetrics.longTasks.push(entry.duration); })).observe({ type: 'longtask', buffered: true });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('main')?.dataset.motion === 'on');
    const main = page.locator('main');
    assert.equal(await main.getAttribute('data-sky-active'), 'true');
    assert(await main.evaluate(node => node.getAnimations({ subtree: true }).some(animation => animation.effect.getTiming().iterations === Infinity && animation.playState === 'running')));
    const galaxyControls = page.getByRole('group', { name: 'Galaxy controls' });
    const starButton = galaxyControls.getByRole('button', { name: 'Send a shooting star', exact: true });
    const star = page.locator('[data-home-comet]');
    const parallax = page.locator('[data-home-parallax]');
    if (width === 1440) {
      const hero = await page.locator('[data-home-hero]').boundingBox();
      const action = main.getByRole('link', { name: 'Start with Sites', exact: true }).first();
      const before = await action.boundingBox();
      await page.mouse.move(hero.x + hero.width * .2, hero.y + hero.height * .1);
      await page.waitForFunction(() => parseFloat(document.querySelector('[data-home-parallax]').style.getPropertyValue('--pointer-x')) < 0);
      await page.mouse.move(hero.x + hero.width * .8, hero.y + hero.height * .1);
      await page.waitForFunction(() => parseFloat(document.querySelector('[data-home-parallax]').style.getPropertyValue('--pointer-x')) > 0);
      assert.deepEqual(await action.boundingBox(), before, 'Pointer depth must not move a control');
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => document.querySelector('[data-home-parallax]').style.getPropertyValue('--pointer-x') === '0px');
      await page.locator('[data-home-hero]').dispatchEvent('pointermove', { pointerType: 'touch', clientX: hero.x + hero.width, clientY: hero.y });
      assert.equal(await parallax.evaluate(node => node.style.getPropertyValue('--pointer-x')), '0px');
      await starButton.focus();
      await page.keyboard.press('Enter');
    } else {
      assert.equal(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false);
      await starButton.tap();
    }
    await page.waitForFunction(() => document.querySelector('[data-home-comet]').getAnimations().length === 1);
    // Freeze one finite effect only for its visual capture; normal playback resumes immediately.
    await star.evaluate(node => { const animation = node.getAnimations()[0]; animation.pause(); animation.currentTime = 500; });
    await page.locator('[data-home-hero]').screenshot({ path: path.join(output, `shooting-star-${width}.png`), animations: 'allow' });
    await star.evaluate(node => node.getAnimations().forEach(animation => animation.play()));
    await starButton.focus();
    for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.press('Enter');
    assert.equal(await star.evaluate(node => node.getAnimations().length), 1, 'Repeated star actions replace the active effect');
    await page.getByRole('button', { name: 'Portfolio', exact: true }).click();
    await page.getByRole('button', { name: 'See a revision', exact: true }).click();
    await page.getByRole('button', { name: 'Event page', exact: true }).click();
    await page.getByRole('button', { name: 'See a revision', exact: true }).click();
    assert.match(await page.getByRole('figure').getByRole('heading', { level: 2 }).innerText(), /Bring the family/);
    assert.equal(await page.getByRole('link', { name: 'Use this idea' }).getAttribute('href'), '/sites?starter=event&refine=1');
    // Bounded, real scrolling samples; report timing without claiming field CWV.
    const frames = await page.evaluate(async () => {
      const intervals = []; let previous = performance.now();
      for (let frame = 0; frame < 60; frame++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); intervals.push(now - previous); previous = now;
        window.scrollBy({ top: 18, behavior: 'instant' });
      }
      return intervals.sort((a, b) => a - b);
    });
    const chapters = page.getByRole('navigation', { name: 'On this page' });
    for (const [name, id] of [['Possibilities', 'possibilities'], ['Pricing', 'pricing'], ['Questions', 'faq']]) {
      await chapters.getByRole('link', { name, exact: true }).click();
      await page.waitForFunction(section => {
        const target = document.getElementById(section);
        return target && Math.abs(target.getBoundingClientRect().top - 84) < 2;
      }, id);
      assert.equal(await chapters.getByRole('link', { name, exact: true }).getAttribute('aria-current'), 'location');
      assert.equal(new URL(page.url()).hash, `#${id}`);
    }
    assert.equal(await main.getAttribute('data-sky-active'), 'false');
    assert.equal(await star.evaluate(node => node.getAnimations().length), 0);
    assert(await main.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.effect.getTiming().iterations === Infinity).every(animation => animation.playState === 'paused')));
    const metrics = await page.evaluate(() => window.homeMetrics);
    assert(metrics.cls < 0.01, `Homepage shifted during loading/scrolling at ${width}px: ${JSON.stringify(metrics.shifts)}`);
    const stickyPosition = await page.evaluate(() => scrollY);
    const stickyBounds = await chapters.getByRole('button', { name: 'Pause page motion', exact: true }).boundingBox();
    await chapters.getByRole('button', { name: 'Pause page motion', exact: true }).click();
    assert.equal(await main.getAttribute('data-motion'), 'off');
    const afterPausePosition = await page.evaluate(() => scrollY);
    assert(Math.abs(afterPausePosition - stickyPosition) < 2, `Pausing from the sticky bar must preserve reading position: ${JSON.stringify({ before: stickyPosition, after: afterPausePosition, button: stickyBounds })}`);
    assert.equal(await starButton.isDisabled(), true);
    await chapters.getByRole('button', { name: 'Enable page motion', exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('main')?.dataset.skyActive === 'true');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await main.getAttribute('data-sky-active'), 'false');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => document.querySelector('main')?.dataset.skyActive === 'true');
    await starButton.focus(); await page.keyboard.press('Enter');
    await galaxyControls.getByRole('button', { name: 'Pause page motion', exact: true }).click();
    assert.equal(await main.getAttribute('data-motion'), 'off');
    assert.equal(await main.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await page.reload({ waitUntil: 'networkidle' });
    await galaxyControls.getByRole('button', { name: 'Enable page motion', exact: true }).waitFor();
    assert.equal(await main.getAttribute('data-motion'), 'off');
    await galaxyControls.getByRole('button', { name: 'Enable page motion', exact: true }).click();
    assert.equal(await main.getAttribute('data-motion'), 'on');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('main')?.dataset.motion === 'off');
    assert.equal(await galaxyControls.getByRole('button', { name: 'Motion reduced by your device settings' }).isDisabled(), true);
    assert.equal(await starButton.isDisabled(), true);
    assert.equal(await main.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('main')?.dataset.motion === 'on');
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
    assert.deepEqual(violations.map(item => item.id), []);
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    checks.push({ width, motion: 'passed', pointerDepth: width === 1440 ? 'bounded, reset, controls stationary, touch ignored' : 'touch scrolling preserved', shootingStar: 'keyboard/touch, replaceable, stopped when paused/offscreen', stickyMotionControl: 'reading position preserved', pausePersistence: 'passed', liveReducedMotion: 'passed', hiddenAndOffscreen: 'passed', chapterAnchors: 'passed', rapidSwitching: 'passed', metrics, scrollFrameP95Ms: frames[Math.floor(frames.length * .95)] });
    await page.screenshot({ path: path.join(output, `motion-${width}.png`), fullPage: true });
    await context.close();
    console.log(`PASS: motion, pause, live reduced motion, native anchors, rapid changes and accessibility at ${width}px.`);
  }
  // Next's inline stream completion still runs; the client bundles all fail to load.
  const noHydration = await browser.newContext({ viewport: { width: 390, height: 1000 } });
  await noHydration.route('**/*', route => new URL(route.request().url()).origin === base && route.request().resourceType() !== 'script' ? route.continue() : route.abort());
  const fallback = await noHydration.newPage();
  await fallback.goto(base, { waitUntil: 'networkidle' });
  for (const id of ['sites-title', 'possibilities-title', 'pricing-title', 'faq-title', 'start-title']) assert.equal(await fallback.locator(`#${id}`).isVisible(), true, `Content hidden without hydration: ${id}`);
  await fallback.locator('#faq summary').first().click();
  assert.equal(await fallback.locator('#faq details').first().evaluate(node => node.open), true);
  assert.equal(await fallback.getByRole('navigation', { name: 'On this page' }).getByRole('link').count(), 3);
  assert.equal(await fallback.locator('main').getAttribute('data-motion'), 'off');
  checks.push({ clientBundlesBlocked: 'content, links and native disclosures passed; inline framework stream completion required' });
  await noHydration.close();
  for (const src of scripts) { const response = await fetch(base + src); assert(response.ok); assert.doesNotMatch(await response.text(), forbiddenAssets, src); }
  console.log(`PASS: ${scripts.size} homepage browser scripts scanned; no internal identifiers found.`);
  for (const route of ['opengraph-image', 'twitter-image']) {
    const response = await fetch(`${base}/${route}`); assert(response.ok); assert.match(response.headers.get('content-type'), /^image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 630);
    await writeFile(path.join(output, `${route}.png`), bytes); socialImages.push(route);
  }
  console.log('PASS: both social previews render as 1200×630 PNG images.');
} finally {
  await writeFile(path.join(output, 'checks.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, scriptsScanned: scripts.size, socialImages }, null, 2));
  await writeFile(path.join(output, 'server.log'), serverLog);
  await browser?.close(); server.kill('SIGTERM');
}
