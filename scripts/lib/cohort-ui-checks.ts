/** Production-build browser checks using the disposable database and identity fixtures. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { DeveloperAccessRepository } from '../../src/lib/supabase/repositories/DeveloperAccessRepository';
import type { PreviewAdminRepository } from '../../src/lib/supabase/repositories/PreviewAdminRepository';

export async function verifyCohortUI({ browser, base, output, identities, access, repo, AxeBuilder }: {
  browser: any; base: string; output: string; identities: Record<string, { id: string; email: string; token: string }>;
  access: DeveloperAccessRepository; repo: PreviewAdminRepository; AxeBuilder: any;
}) {
  await mkdir(output, { recursive: true }); const checks: any[] = [];
  const introduction = 'I’m an independent builder making research tools for a small team.';
  const project = 'A writing assistant that helps a research team summarize their own notes.';
  for (const width of [1440, 768, 390]) {
    const actor = identities[`participant${width}`];
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
      await page.goto(base + '/developers', { waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('link', { name: 'Sign up to apply', exact: true }).getAttribute('href'), '/auth/signup?next=%2Fdevelopers');
      await page.getByRole('link', { name: 'Create images', exact: true }).waitFor();
      assert.match(await page.locator('main').last().innerText(), /participant-reported/);
      await capture('guest');
      if (width === 390) await access.request(actor.id, actor.email, project, 'exploring');
      await context.addCookies([{ name: 'galx_session', value: actor.token, url: base }]);
      await context.addInitScript((identity: any) => localStorage.setItem('galx_custom_auth_user', JSON.stringify({ ...identity, provider: 'fixture' })), actor);
      await page.reload({ waitUntil: 'networkidle' });
      if (width === 390) await page.getByRole('button', { name: 'Complete application', exact: true }).click();
      await page.getByRole('button', { name: 'Review application', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your application', exact: true }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Check your application' }).evaluate((element: HTMLElement) => document.activeElement === element), true);
      await capture('validation');
      await page.getByLabel('A short introduction', { exact: true }).fill(introduction);
      await page.getByLabel('GitHub profile', { exact: true }).fill('github.com/cohort-builder?tab=repositories');
      await page.getByLabel('LinkedIn profile', { exact: true }).fill('linkedin.com/in/cohort-builder?trk=public');
      await page.getByLabel('What would you use the API for?', { exact: true }).fill(project);
      await page.getByLabel('Expected API requests', { exact: true }).selectOption('under_100_daily');
      await page.getByRole('radio', { name: /Yes, I’d like to participate/ }).check();
      const fields = await page.locator('input:not([type=radio]), textarea, select').evaluateAll((elements: HTMLElement[]) => elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize)));
      assert(fields.every((size: number) => size >= 16), 'mobile inputs must avoid focus zoom');
      await page.getByRole('button', { name: 'Review application', exact: true }).click();
      await page.getByRole('heading', { name: 'Review your application', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Edit answers', exact: true }).click();
      assert.equal(await page.getByLabel('A short introduction', { exact: true }).inputValue(), introduction);
      await capture('application');
      await page.getByRole('button', { name: 'Review application', exact: true }).click();
      await capture('review');
      if (width === 1440) {
        const failOnce = (route: any) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'request_unavailable', message: 'Your request could not be saved. Please try again.' } }) });
        await page.route('**/api/developer-access', failOnce, { times: 1 });
        await page.getByRole('button', { name: 'Submit application', exact: true }).click();
        await page.getByText('Your request could not be saved. Please try again.', { exact: true }).waitFor();
        await capture('retry');
        assert.equal(await access.get(actor.id), null);
      }
      await page.getByRole('button', { name: width === 390 ? 'Save changes' : 'Submit application', exact: true }).click();
      await page.getByRole('heading', { name: 'You’re on the developer waitlist', exact: true }).waitFor();
      const saved = await access.get(actor.id); assert(saved); assert.equal(saved.status, 'pending'); assert.equal(saved.github_url, 'https://github.com/cohort-builder');
      assert.equal(saved.linkedin_url, 'https://www.linkedin.com/in/cohort-builder'); assert.equal(saved.cohort_interest, 'next');
      assert.equal((await repo.detail(identities.owner, actor.id)).request.introduction, introduction);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByText('Your saved application', { exact: true }).click();
      await page.getByText(introduction, { exact: true }).waitFor(); await capture('pending');
      await page.getByRole('button', { name: 'Update application', exact: true }).click();
      await page.getByRole('radio', { name: /a future cohort is better/ }).check();
      await page.getByRole('button', { name: 'Review application', exact: true }).click();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByRole('heading', { name: 'You’re on the developer waitlist', exact: true }).waitFor();
      const updated = await access.get(actor.id); assert.equal(updated?.cohort_interest, 'later'); assert.equal(updated?.requested_at.toISOString(), saved.requested_at.toISOString());
      await page.getByRole('button', { name: 'Update application', exact: true }).click();
      await page.getByLabel('A short introduction', { exact: true }).fill('This edit must survive until I explicitly discard it.');
      await page.getByRole('button', { name: 'Review application', exact: true }).click();
      await repo.review(identities.owner, actor.id, updated!.revision!, 'approved', 'Reviewed a bounded cohort application.', 7);
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByRole('button', { name: 'Discard edits and reload', exact: true }).waitFor();
      await page.getByText('This edit must survive until I explicitly discard it.', { exact: true }).waitFor();
      assert.equal((await access.get(actor.id))?.introduction, introduction); await capture('conflict');
      await page.getByRole('button', { name: 'Discard edits and reload', exact: true }).click();
      await page.getByRole('heading', { name: 'Your preview access is approved', exact: true }).waitFor();
    } catch (error) {
      await page.screenshot({ path: path.join(output, `failure-${width}.png`), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  return checks;
}
