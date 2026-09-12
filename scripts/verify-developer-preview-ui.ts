/** Local production browser fixtures. No real signup, email, generation or publication. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:3419';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const output = '.impeccable/review/developer-preview'; await fs.mkdir(output, { recursive: true });
const checks: unknown[] = [];
try {
  for (const width of [1440,390]) {
    for (const signedIn of [false,true]) {
      const context = await browser.newContext({ viewport: { width, height: 980 }, reducedMotion: 'reduce' });
      if (signedIn) await context.addInitScript(() => localStorage.setItem('galx_custom_auth_user', JSON.stringify({ id:'preview-fixture', email:'creator@example.test', name:'Creator', token:'preview-fixture-token', provider:'fixture' })));
      const state = { status:'not_requested', unavailable:false, posts:0, feedback:0 };
      await context.route('**/*', async (route: any) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== new URL(base).origin) return route.abort();
        const json = (value: unknown, status=200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(value) });
        if (url.pathname === '/api/developer-access') {
          assert.equal(req.headers().authorization, 'Bearer preview-fixture-token');
          if (state.unavailable) return json({ error:{ code:'request_unavailable', message:'Your request could not be saved. Please try again.' } },503);
          if (req.method() === 'POST') { state.posts++; assert.deepEqual(Object.keys(req.postDataJSON()).sort(), ['expected_traffic','use_case']); state.status='pending'; }
          return json({ status:state.status, requested_at:null });
        }
        if (url.pathname === '/api/developer-access/feedback') { state.feedback++; assert.deepEqual(Object.keys(req.postDataJSON()), ['message']); return json({received:true},201); }
        if (url.pathname.startsWith('/api/')) return json({ enabled:false, amountUsd:null, status:'healthy' });
        return route.continue();
      });
      const page = await context.newPage(); const errors: string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));
      async function inspect(label:string) {
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
        await page.screenshot({path:`${output}/${label}-${width}.png`,fullPage:true});
        checks.push({label,width,overflow,violations:violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),errors});
        assert.equal(overflow,false,label); assert.deepEqual(errors,[],label);
      }
      await page.goto(base+'/developers',{waitUntil:'networkidle'});
      if (!signedIn) {
        await page.getByRole('link',{name:'Sign up to request access',exact:true}).waitFor();
        await inspect('guest');
        await page.getByRole('link',{name:'create images',exact:true}).click();
        await page.waitForURL(base+'/images');
        assert.equal(new URL(page.url()).pathname,'/images');
        await page.goto(base+'/sites'); assert.equal(new URL(page.url()).pathname,'/sites');
        await page.goto(base+'/'); await inspect('home');
      } else {
        await page.getByLabel('What would you use the API for?').fill('I am building a writing assistant for a small research team.');
        await inspect('request');
        await page.getByRole('button',{name:'Request developer access',exact:true}).click();
        await page.getByRole('heading',{name:'You’re on the developer waitlist'}).waitFor(); assert.equal(state.posts,1);
        await page.reload();await page.getByRole('heading',{name:'You’re on the developer waitlist'}).waitFor();
        await inspect('pending');
        state.status='approved';await page.getByRole('button',{name:'Check access status'}).click();
        await page.getByRole('heading',{name:'Your preview access is approved'}).waitFor();
        await page.getByLabel('Share private feedback').fill('The first request worked. I would like a clearer explanation of usage limits.');
        await page.getByRole('button',{name:'Send private feedback'}).click();await page.getByText('Feedback received.',{exact:false}).waitFor();assert.equal(state.feedback,1);
        await inspect('approved');
        state.status='revoked';await page.reload();await page.getByRole('heading',{name:'Your developer access is paused'}).waitFor();
        state.unavailable=true;await page.getByRole('button',{name:'Check access status'}).click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
        state.unavailable=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('heading',{name:'Your developer access is paused'}).waitFor();
      }
      await context.close();
    }
  }
  assert(checks.every((check: any) => check.violations.length === 0), 'Accessibility findings: see checks.json');
  console.log('PASS: desktop/mobile public entry, signup link, request, persistence, approval, feedback, revocation, recovery, accessibility and overflow checks.');
} finally { await fs.writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));await browser.close(); }
