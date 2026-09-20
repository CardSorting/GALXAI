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
      const state = { status:'retired', unavailable:false, posts:0, feedback:0 };
      await context.route('**/*', async (route: any) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== new URL(base).origin) return route.abort();
        const json = (value: unknown, status=200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(value) });
        if (url.pathname === '/api/developer-access' || url.pathname === '/api/developer-access/feedback') return json({ error:{ code:'public_access_retired', message:'Self-service developer access is no longer available.' } },410);
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
      const removed = await page.goto(base+'/developers',{waitUntil:'networkidle'});
      assert.equal(removed?.status(), 404);
      assert.match(await page.locator('body').innerText(), /unavailable/i);
      await page.goto(base+'/', { waitUntil: 'networkidle' });
      await inspect(signedIn ? 'home-signed-in' : 'home-guest');
      await context.close();
    }
  }
  assert(checks.every((check: any) => check.violations.length === 0), 'Accessibility findings: see checks.json');
  console.log('PASS: desktop/mobile developer route is removed and the public home surface remains accessible without overflow.');
} finally { await fs.writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));await browser.close(); }
