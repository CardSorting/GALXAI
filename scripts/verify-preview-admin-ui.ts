/** Real production Next.js + disposable PostgreSQL. Only identity-provider responses are mocked. */
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtemp, symlink, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { PreviewAdminRepository } from '../src/lib/supabase/repositories/PreviewAdminRepository';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';
import { verifyCohortUI } from './lib/cohort-ui-checks';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = isolatedIntegrationEnvironment(process.env);
const pool = new Pool({ connectionString: process.env.GALX_INTEGRATION_DATABASE_URL, ssl: false });
const repo = new PreviewAdminRepository(pool), access = new DeveloperAccessRepository(pool);
const workspace = await mkdtemp(path.join(tmpdir(), 'galx-admin-ui-'));
const output = path.join(root, '.impeccable/review/preview-admin'); await mkdir(output, { recursive: true });
const identities = Object.fromEntries(['owner','reviewer','viewer','outsider','participant1440','participant768','participant390'].map(role => [role, { id: randomUUID(), email: `${role}@preview.example.test`, name: role, token: randomBytes(24).toString('hex') }]));
const authFile = path.join(workspace, 'identities.json');
await writeFile(authFile, JSON.stringify(Object.fromEntries(Object.values(identities).map(actor => [actor.token, actor]))), { mode: 0o600 });
await repo.bootstrap(identities.owner.email); await repo.session(identities.owner);
for (const role of ['reviewer','viewer'] as const) { await repo.updateStaff(identities.owner, identities[role].email, null, role, 'Browser fixture staff access.'); await repo.session(identities[role]); }
const requestIds: string[] = [];
for (let i = 0; i < 28; i++) {
  const id = randomUUID(); requestIds.push(id);
  await access.request(id, i === 0 ? 'maya@smallstudio.example' : i === 1 ? 'alex@research.example' : `builder${i}@preview.example.test`,
    i === 0 ? 'We’re building a writing assistant for a six-person design studio. We want to explore draft summaries before offering it to our clients.' : i === 1 ? 'A private research assistant for a small community archive. We want to test citations and share feedback on confusing responses.' : 'Exploring a small application with a few colleagues before inviting a wider group.', i % 2 ? 'exploring' : 'under_100_daily', i === 0 ? {
      introduction: 'I’m Maya, a designer and developer working with a small creative studio.', github_url: 'https://github.com/maya-builder', linkedin_url: 'https://www.linkedin.com/in/maya-builder', cohort_interest: 'next', use_case: '', expected_traffic: 'under_100_daily',
    } : undefined);
}
await repo.review(identities.owner, requestIds[1], 1, 'approved', 'A small project with a clear feedback plan.', 30);
await access.feedback(requestIds[1], 'The first request worked well. When a request takes longer, a clearer progress message would help our team understand what to do next.');
for (const entry of ['.next','public','node_modules']) await symlink(path.join(root, entry), path.join(workspace, entry));
await writeFile(path.join(workspace, 'package.json'), '{"private":true}');
const port = 3421, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--import', path.join(root, 'scripts/fixtures/admin-http-auth.mjs'), path.join(root, 'node_modules/next/dist/bin/next'), 'start', workspace, '-p', String(port), '-H', '127.0.0.1'], {
  cwd: workspace, env: { ...env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', GALX_ADMIN_HTTP_FIXTURE: '1', GALX_ADMIN_HTTP_IDENTITIES: authFile }, stdio: ['ignore','pipe','pipe'],
});
let serverLog = ''; server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
const http = (url: string) => new Promise<number>((resolve, reject) => { const req = httpRequest(url, res => { res.resume(); resolve(res.statusCode || 0); }); req.on('error', reject); req.end(); });
const checks: unknown[] = [];
let browser: any;
let activePage: any;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if (await http(base + '/api/health') === 200) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 250)); }
  assert(ready, 'Production fixture server did not become ready.');
  const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
  const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const anonymous = await browser.newContext();
  for (const pathname of ['/api/admin/preview?view=requests', '/api/admin/preview?view=staff', '/api/admin/preview?view=activity']) {
    const response = await anonymous.request.get(base + pathname, { headers: { 'x-role': 'owner', 'x-user-id': identities.owner.id, 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } });
    assert.equal(response.status(), 401); assert(!/preview.example|private\.|postgres|supabase|shard/i.test(await response.text())); assert.match(response.headers()['cache-control'], /no-store/);
  }
  assert.equal((await anonymous.request.get(base+'/admin',{maxRedirects:0})).status(),307);
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'galx_session', value: identities.owner.token, url: base }]);
    await context.addInitScript((actor: any) => localStorage.setItem('galx_custom_auth_user', JSON.stringify({ ...actor, provider: 'fixture' })), identities.owner);
    await context.route('**/*', (route: any) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message));
    const readRequests: string[] = [];
    page.on('request', (request: any) => {
      if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/admin/preview') readRequests.push(request.url());
    });
    activePage = page;
    page.on('response', async (response: any) => {
      if (response.url().includes('/api/admin/preview') && response.request().method() === 'POST')
        checks.push({mutationStatus: response.status(), body: await response.text()});
    });
    async function capture(label: string) {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const violations = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
      await page.screenshot({ path: path.join(output, `${label}-${width}.png`), fullPage: true });
      checks.push({label,width,overflow,violations:violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),errors:[...errors]});
      assert.equal(overflow,false,label); assert.deepEqual(errors,[],label); console.log(`Verified ${label} at ${width}px.`);
    }
    const response = await page.goto(base+'/admin',{waitUntil:'networkidle'}); assert.equal(response?.status(),200);
    await page.getByRole('button',{name:/maya@smallstudio/}).waitFor(); assert.equal(await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).count(),0); await capture('inbox');
    assert.equal(readRequests.length, 1, 'initial inbox uses one browser request after identity hydration');
    assert.equal(new URL(readRequests[0]).searchParams.get('view'), 'requests');
    await page.getByRole('button',{name:/maya@smallstudio/}).click(); await page.getByRole('textbox',{name:'Internal decision note',exact:true}).waitFor(); await capture('review');
    await page.getByRole('textbox',{name:'Internal decision note',exact:true}).fill('Small team with a thoughtful, bounded project.');
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByRole('textbox',{name:'Internal decision note',exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Internal decision note',exact:true}).inputValue(),'Small team with a thoughtful, bounded project.');
    await page.getByRole('button',{name:'Next request',exact:true}).click();
    await page.getByRole('heading',{name:'builder2@preview.example.test',exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to requests',exact:true}).click();
    await page.getByRole('button',{name:/maya@smallstudio/}).click();
    await page.getByRole('textbox',{name:'Internal decision note',exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Internal decision note',exact:true}).inputValue(),'Small team with a thoughtful, bounded project.');
    if (width === 1440) {
      await page.getByRole('button',{name:'Approve access',exact:true}).click(); await page.getByText('Decision saved for maya@smallstudio.example.').waitFor();
      await page.getByText('Access is active', {exact:false}).waitFor(); await capture('approved');
      await page.getByRole('textbox',{name:'Internal decision note',exact:true}).fill('Pause while we improve the first response.');
      await page.getByRole('button',{name:'Pause access',exact:true}).click(); await page.getByText('Developer API and tools are unavailable',{exact:false}).waitFor();
      await page.getByRole('combobox',{name:/^Decision/}).selectOption('pending'); await page.getByRole('textbox',{name:'Internal decision note',exact:true}).fill('Return to review for the next cohort.');
      await page.getByRole('button',{name:'Return to waitlist',exact:true}).click(); await page.getByRole('button',{name:'Approve access',exact:true}).waitFor();
      // Make the displayed revision stale; mutation must not replace the newer decision or discard the draft.
      const latest = await repo.detail(identities.owner, requestIds[0]);
      await repo.review(identities.reviewer, requestIds[0], latest.request.revision, 'approved', 'Reviewed in a second session.', 7);
      await page.getByRole('textbox',{name:'Internal decision note',exact:true}).fill('This draft must survive a conflict.');
      await page.getByRole('button',{name:'Approve access',exact:true}).click(); await page.getByRole('alert').filter({hasText:'This record changed'}).waitFor();
      assert.equal(await page.getByRole('textbox',{name:'Internal decision note',exact:true}).inputValue(),'This draft must survive a conflict.'); await capture('conflict');
      const latestAgain = await repo.detail(identities.owner, requestIds[0]);
      await repo.review(identities.owner, requestIds[0], latestAgain.request.revision, 'revoked', 'Reset isolated mobile fixture.', null);
      await repo.review(identities.owner, requestIds[0], latestAgain.request.revision+1, 'pending', 'Reset isolated mobile fixture.', null);
    }
    await page.getByRole('button',{name:'Next request',exact:true}).click(); await page.getByRole('heading',{name:'builder2@preview.example.test',exact:true}).waitFor();
    await page.getByRole('button',{name:'Next request',exact:true}).click(); await page.getByRole('heading',{name:'builder3@preview.example.test',exact:true}).waitFor();
    await page.getByRole('button',{name:'Feedback',exact:true}).click(); await page.getByText('The first request worked well.',{exact:false}).waitFor(); await capture('feedback');
    await page.getByRole('button',{name:'Mark resolved',exact:true}).click(); await page.getByRole('heading',{name:'No open feedback'}).waitFor();
    await page.getByLabel('Filter feedback').selectOption('resolved'); await page.getByRole('button',{name:'Reopen',exact:true}).click();
    await page.getByRole('button',{name:'Staff access',exact:true}).click(); await page.getByRole('button',{name:'Add staff member',exact:true}).waitFor(); await capture('staff');
    await page.getByRole('button',{name:'Add staff member',exact:true}).click(); await page.getByLabel('Email address').fill(`new-staff-${width}@preview.example.test`);
    await page.getByRole('combobox',{name:/^Role/}).selectOption('viewer'); await page.getByLabel('Internal note',{exact:true}).fill('Read early feedback alongside the founder.'); await capture('staff-editor');
    await page.getByRole('button',{name:'Save staff access',exact:true}).click(); await page.getByText('Staff access updated.').waitFor();
    await page.getByRole('button',{name:'Activity',exact:true}).click(); await page.getByText('Staff access added',{exact:true}).first().waitFor(); await capture('activity');
    activePage = null; await context.close();
  }
  // A verified account claiming owner in editable metadata still has no staff authority.
  for (const role of ['outsider','viewer'] as const) {
    const context = await browser.newContext(); await context.addCookies([{name:'galx_session',value:identities[role].token,url:base}]);
    const response = await context.request.get(base+'/api/admin/preview?view=requests'); assert.equal(response.status(),role==='outsider'?403:200);
    const mutation = await context.request.post(base+'/api/admin/preview',{headers:{origin:base},data:{action:'review',user_id:requestIds[0],revision:1,status:'approved',reason:'Attempted escalation.',expires_in_days:null}});
    assert.equal(mutation.status(),403);
    await context.close();
  }
  // Admin chunk is served only to staff and never cacheable for later unauthenticated reuse.
  const manifest = JSON.parse(await readFile(path.join(root,'.next/server/app-build-manifest.json'),'utf8').catch(()=>readFile(path.join(root,'.next/app-build-manifest.json'),'utf8')));
  const adminChunk = manifest.pages['/admin/page'].find((name:string)=>name.includes('/admin/page-'));
  assert(adminChunk); assert.equal((await anonymous.request.get(base+'/_next/'+adminChunk)).status(),401);
  for (const pathname of ['/','/images','/sites']) {
    const response = await anonymous.request.get(base+pathname); assert.equal(response.status(),200);
    const html = await response.text(); assert(!/owner@preview|maya@smallstudio|Internal decision note|preview_admin_audit|preview_application_snapshots|PreviewReadSync|wanted\.ordinality/.test(html));
    for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
      const asset = await anonymous.request.get(base+match[1]); const js=await asset.text();
      assert(!/preview_admin_audit|preview_admin_members|Internal decision note|Staff access added|preview_application_snapshots|PreviewReadSync|wanted\.ordinality/.test(js));
    }
  }
  await anonymous.close();
  checks.push(...await verifyCohortUI({ browser, base, output: path.join(root, '.impeccable/review/developer-cohort'), identities, access, repo, AxeBuilder }));
  assert(checks.every((check:any)=>!check.violations || check.violations.length===0),'Accessibility violations: see checks.json');
  console.log('PASS: production desktop/mobile admin review, approval, pause, stale conflict, feedback, staff, activity, role isolation, admin chunk protection and public bundle scans.');
} finally {
  if (activePage && !activePage.isClosed()) { await activePage.screenshot({path:path.join(output,'last-state.png'),fullPage:true}); checks.push({lastState:(await activePage.locator('body').innerText()).slice(0,5000)}); }
  await writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
  await writeFile(path.join(output,'server.log'),serverLog);
  await browser?.close(); server.kill('SIGTERM'); await pool.end();
}
