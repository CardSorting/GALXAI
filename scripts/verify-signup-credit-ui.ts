/** Local production preview with intercepted authentication; never sends email. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'http://127.0.0.1:3417';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const out = '.impeccable/review/signup';
await fs.mkdir(out,{recursive:true});
const sentinel = 'private-signup-diagnostic-sentinel';
const results: unknown[] = [];
async function setup(width: number) {
  const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const state = {mode:'pending',offer:5 as number | null,unavailable:false,submissions:0,resends:0,payload:null as any};
  await context.route('**/*',async(route: any)=>{
    const request=route.request(), url=new URL(request.url());
    const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname==='/auth/v1/signup') {
      state.submissions++; state.payload=request.postDataJSON();
      assert.equal(new URL(url.searchParams.get('redirect_to')!).searchParams.get('next'),'/images');
      if(state.mode==='error') return json({code:'unexpected_failure',msg:sentinel},400);
      const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:state.payload.email,
        app_metadata:{provider:'email',providers:['email']},user_metadata:{name:'New Creator'},identities:[],created_at:new Date().toISOString()};
      if(state.mode==='pending') return json(user);
      const exp=Math.floor(Date.now()/1000)+3600;
      const token=`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp})).toString('base64url')}.fixture`;
      return json({access_token:token,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:'fixture',user:{...user,email_confirmed_at:new Date().toISOString()}});
    }
    if(url.pathname==='/auth/v1/resend') {state.resends++;return json({});}
    if(url.origin!==new URL(base).origin) return route.abort();
    if(url.pathname==='/api/auth/signup-offer') return state.unavailable ? json({error:sentinel},503) : json({enabled:state.offer!==null,amountUsd:state.offer,identity_hash:sentinel});
    if(url.pathname==='/api/wallet/summary') return json({summary:{balanceUsd:5,proofOfDepositVerified:false}});
    if(url.pathname.startsWith('/api/')) return json({records:[],keys:[]});
    return route.continue();
  });
  const page=await context.newPage();
  await page.clock.install();
  return {context,state,page};
}
async function capture(page:any,name:string) {
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,`${name}: horizontal overflow`);
  assert(!(await page.locator('body').innerText()).includes(sentinel));
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  results.push({name,violations:scan.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}))});
}
async function fill(page:any) {
  await page.getByLabel('Your Name or Handle').fill('New Creator');
  await page.getByLabel('Email Address',{exact:true}).fill('new@example.test');
  await page.getByLabel('Password',{exact:true}).fill('creative-password-42');
  await page.getByLabel('Confirm Password',{exact:true}).fill('creative-password-42');
}
try {
  if (!process.argv.includes('--http-only')) {
  for(const width of [1440,390]) {
    const {page,context,state}=await setup(width);
    await page.goto(`${base}/auth/signup?next=%2Fimages`);
    await page.getByTestId('signup-credit-offer').waitFor();
    assert.match(await page.getByTestId('signup-credit-offer').innerText(),/\$5\.00/);
    await capture(page,`offer-${width}`);
    await fill(page);
    await page.getByRole('button',{name:'Create Account',exact:true}).click();
    await page.getByRole('heading',{name:'Check your email',exact:true}).waitFor();
    assert.equal(state.submissions,1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('galx_custom_auth_user')),null);
    assert(!(await context.cookies()).some((cookie:any)=>cookie.name==='galx_session'));
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Check your email');
    assert.equal(new URL(page.url()).pathname,'/auth/signup');
    await capture(page,`confirmation-${width}`);
    if(width===1440) {
      await page.clock.fastForward(61000);
      await page.getByRole('button',{name:'Resend confirmation email',exact:true}).click();
      await page.getByText('If your account needs confirmation, a new link is on its way.',{exact:false}).waitFor();
      assert.equal(state.resends,1);
    }
    await page.getByRole('button',{name:'Use a different email'}).click();
    await fill(page); state.mode='error';
    await page.getByRole('button',{name:'Create Account',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('galx_custom_auth_user')),null);
    await capture(page,`signup-error-${width}`);
    await context.close();
  }
  const {page,context,state}=await setup(390);
  state.offer=7.5;
  await page.goto(`${base}/auth/signup?next=%2Fimages`);
  await page.getByTestId('signup-credit-offer').waitFor();
  assert.match(await page.getByTestId('signup-credit-offer').innerText(),/\$7\.50/);
  state.offer=null;
  await page.reload(); await page.getByRole('button',{name:'Create Account',exact:true}).waitFor();
  assert.equal(await page.getByTestId('signup-credit-offer').count(),0);
  state.unavailable=true;
  await page.reload(); await fill(page);
  assert.equal(await page.getByTestId('signup-credit-offer').count(),0);
  state.mode='immediate';
  await page.getByRole('button',{name:'Create Account',exact:true}).click();
  await page.waitForURL('**/images');
  assert.match(await page.evaluate(()=>localStorage.getItem('galx_custom_auth_user')) || '',/00000000-0000-4000-8000-000000000001/);
  await context.close();
  } else {
    results.push(...JSON.parse(await fs.readFile(`${out}/results.json`, 'utf8')));
  }
  // Real HTTP checks against the local app, without a session or database writes.
  const callback=await fetch(`${base}/auth/callback?error=${sentinel}&error_description=${sentinel}&next=%2F%5Cevil.test`,{redirect:'manual',headers:{'x-forwarded-host':'evil.test'}});
  assert.equal(callback.status,307); assert(!callback.headers.get('location')!.includes(sentinel));
  const destination = new URL(callback.headers.get('location')!);
  assert(['localhost','127.0.0.1'].includes(destination.hostname));
  assert.equal(destination.port,new URL(base).port);
  assert.equal(destination.pathname,'/auth/signin');
  assert.equal(destination.searchParams.get('next'),'/models');
  const unauthorized=await fetch(`${base}/api/keys?userId=another-account`);
  assert.equal(unauthorized.status,401);
  assert(!/stack|postgres|supabase|private/.test(await unauthorized.text()));
  const html=await (await fetch(`${base}/auth/signup`)).text();
  const paths=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]))];
  const assets=await Promise.all(paths.map(async path=>({path,body:await (await fetch(new URL(path,base))).text()})));
  const privateFields=/galx_signup_credit_policy|galx_signup_credit_grants|galx_award_signup_credit|identity_hash|private-signup-diagnostic-sentinel/;
  assert(!privateFields.test(html));
  assert(assets.every(asset=>!privateFields.test(asset.body)));
  await fs.writeFile(`${out}/asset-scan.json`,JSON.stringify({route:'/auth/signup',scripts:paths.length,privateFieldMatches:0},null,2));
} finally {
  await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  await browser.close();
}
const issues=(results as any[]).flatMap(result=>result.violations.map((violation:any)=>({name:result.name,...violation})));
console.log(JSON.stringify({states:results.length,issues},null,2));
assert.equal(issues.length,0,'Accessibility findings; see review/signup/results.json');
