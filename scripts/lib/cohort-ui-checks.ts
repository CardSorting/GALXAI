/** Production-build browser checks using the disposable database and identity fixtures. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
export async function verifyCohortUI({ browser, base, output, AxeBuilder }: {
  browser: any; base: string; output: string; AxeBuilder: any;
}) {
  await mkdir(output, { recursive: true }); const checks: any[] = [];
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', (route: any) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(), errors: string[] = []; page.on('pageerror', (error: Error) => errors.push(error.message));
    async function capture(label: string) {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const violations = (await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
      await page.screenshot({ path: path.join(output, `${label}-${width}.png`), fullPage: true });
      checks.push({ label, width, overflow, violations: violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })), errors: [...errors] });
      assert.equal(overflow, false, label); assert.deepEqual(errors, [], label);
      assert.deepEqual(violations.map((v: any) => v.id), [], label);
      console.log(`Verified cohort ${label} at ${width}px.`);
    }
    try {
      const removed = await page.goto(base + '/developers', { waitUntil: 'networkidle' });
      assert.equal(removed?.status(), 404);
      assert.match(await page.locator('body').innerText(), /unavailable/i);
      await capture('removed');
    } catch (error) {
      await page.screenshot({ path: path.join(output, `failure-${width}.png`), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  return checks;
}
