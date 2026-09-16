/** Isolated compiled workspace navigation. Run with verify-auth-entry-server.cjs. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base = process.argv[2] || 'http://localhost:3427';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
const output = path.resolve(process.env.GALX_WORKSPACE_REVIEW_OUTPUT || '.impeccable/review/workspace-ux-audit');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const owner='00000000-0000-4000-8000-000000000001';
const user={id:owner,aud:'authenticated',role:'authenticated',email:'fixture@example.test',is_anonymous:false,app_metadata:{provider:'email'},user_metadata:{name:'Fixture'},identities:[],created_at:'2026-09-13T00:00:00Z'};
const session=suffix=>({access_token:`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:owner,exp:4102444800,jti:crypto.randomUUID()})).toString('base64url')}.${suffix}`,refresh_token:'fixture',expires_at:4102444800,token_type:'bearer',user});
const cookie=suffix=>({name:'sb-supabase-auth-token',value:`base64-${Buffer.from(JSON.stringify(session(suffix))).toString('base64url')}`,url:base,sameSite:'Lax'});
const forbidden=/PRIVATE_AUTH_SENTINEL|WorkspaceSessionUnavailableError|WorkspacePageGate|GALX_PRIVATE_(?:POST_MORTEM|KNOWLEDGE)_CONTENT|DIAGNOSTIC TRACE|Copy Diagnostics|GATEWAY RESILIENCE ACTIVE|Root Page Error Boundary Caught/;
const assets=new Set(), results=[];
async function inspect(page,label) {
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
 assert.doesNotMatch(await page.locator('body').innerText(),forbidden,label);
 const a=await new AxeBuilder({page}).setLegacyMode(true).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).options({iframes:false}).analyze();
 assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],label+' accessibility');
 for(const src of await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src))) assets.add(src);
 await page.screenshot({path:path.join(output,label+'.png'),fullPage:true});
}
try {
 // A fresh credential passes middleware and fails its independent page check.
 for(const route of ['/images','/sites','/sites/00000000-0000-4000-8000-000000000000']) {
  for(const headers of [{},{rsc:'1'}]) {
   const c=cookie('render-unavailable');
   const r=await fetch(base+route,{headers:{...headers,cookie:`${c.name}=${c.value}`},redirect:'manual'});
   assert.equal(r.status,200,route+' streamed recovery');assert.match(r.headers.get('cache-control'),/private.*no-store/);
   const body=await r.text();assert.match(body,/Your workspace is temporarily unavailable/);assert.doesNotMatch(body,forbidden);assert.doesNotMatch(body,/class="(?:sites-workspace|studio)"/);
  }
  results.push({route,check:'middleware success followed by page outage; HTML/RSC fail closed without workspace content'});
 }
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:900},bypassCSP:true,reducedMotion:'no-preference'});
  const state={delay:false,posts:0,rsc:0,profileCalls:0,profileStatus:200,profileDelay:0,libraryStatus:200};
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   if(url.hostname==='supabase.invalid') return url.pathname.endsWith('/user')?json(user):json(session('valid'));
   if(url.origin!==new URL(base).origin)return route.abort();
   if(request.method()==='POST')state.posts++;
   if(url.pathname==='/api/auth/session') {
    state.profileCalls++;
    const status=state.profileStatus;
    if(state.profileDelay) await new Promise(resolve=>setTimeout(resolve,state.profileDelay));
    return status===200?json({valid:true,user:{id:owner,name:'Fixture',email:user.email}}):json({error:'PRIVATE_AUTH_SENTINEL'},status);
   }
   if(url.pathname==='/api/sites/workspace')return json({setup:{access:'included',publishing:'available',username:null},sites:[],site:null});
   if(url.pathname==='/api/images/library')return state.libraryStatus===200?json({success:true,records:[],total:0,nextCursor:null}):json({error:'PRIVATE_AUTH_SENTINEL'},state.libraryStatus);
   if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/v1/'))return json({success:true,data:[],balance:0,balanceUsd:0});
   if(request.headers().rsc==='1'){state.rsc++;if(state.delay)await new Promise(resolve=>setTimeout(resolve,800));}
   return route.continue();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const product of ['images','sites']) {
   await context.addCookies([cookie('render-unavailable')]);
   console.log('outage',width,product);
   await page.goto(base+'/'+product);
   await page.getByRole('heading',{name:'Your workspace is temporarily unavailable'}).waitFor();
   await inspect(page,`${product}-recovery-${width}`);
   await page.evaluate(()=>window.__workspaceHeader=document.querySelector('header'));
   await context.addCookies([cookie('render-unavailable')]);
   await page.getByRole('button',{name:'Try again',exact:true}).click();
   await page.getByRole('status').filter({hasText:'This page is still unavailable.'}).waitFor();
   assert.equal(await page.locator('.studio,.sites-workspace').count(),0,'failed server retry stays closed');
   const before=state.rsc;
   await context.addCookies([cookie('valid')]);
   console.log('retry',width,product);
   await page.getByRole('button',{name:'Try again',exact:true}).click();
   console.log('clicked',width,product);
   await page.locator(product==='sites'?'.sites-workspace':'.studio').waitFor();
   assert(state.rsc>before,'retry requested a fresh server render');
   assert(await page.evaluate(()=>window.__workspaceHeader===document.querySelector('header')),'header survives recovery');
   console.log('ready',width,product);
   await inspect(page,`${product}-ready-${width}`);
  }
  // A full document entry discards the router cache before testing slow links.
  await page.goto(base+'/');
  await page.getByRole('navigation',{name:'Main navigation'}).waitFor();
  state.delay=true;
  await page.evaluate(()=>window.__workspaceHeader=document.querySelector('header'));
  for(const [label,selector] of [['Images','.studio'],['Sites','.sites-workspace']]) {
   await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:label,exact:true}).click();
   await page.getByRole('navigation',{name:'Main navigation'}).getByRole('status').filter({hasText:`Opening ${label}`}).waitFor();
   await page.locator(selector).waitFor();
   assert(await page.evaluate(()=>window.__workspaceHeader===document.querySelector('header')),'persistent header');
  }
  await page.goBack();await page.locator('.studio').waitFor();
  await page.goForward();await page.locator('.sites-workspace').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.sites-workspace').evaluate(el=>getComputedStyle(el).animationName),'none');
  await inspect(page,`sites-reduced-motion-${width}`);
  state.delay=false;
  const nav=label=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:label,exact:true}).click();
  // Existing account-scoped local drafts must survive both navigation and session recovery.
  await page.locator('#site-prompt').fill('Keep my Site draft through navigation');
  await nav('Images');await page.locator('.studio').waitFor();
  await page.getByLabel('Prompt',{exact:true}).fill('Keep my image draft through recovery');
  await nav('Sites');await page.locator('.sites-workspace').waitFor();
  assert.equal(await page.locator('#site-prompt').inputValue(),'Keep my Site draft through navigation');
  await nav('Images');await page.locator('.studio').waitFor();
  assert.equal(await page.getByLabel('Prompt',{exact:true}).inputValue(),'Keep my image draft through recovery');

  // Browser profile failure occurs after the server has admitted this account.
  console.log('browser profile outage',width);
  state.profileStatus=503;state.profileDelay=1200;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-workspace-loading="Images"]').waitFor();
  await page.evaluate(()=>window.__workspaceHeader=document.querySelector('header'));
  await page.getByRole('heading',{name:'Let’s get you reconnected',exact:true}).waitFor();
  assert.equal(await page.locator('.studio,.sites-workspace').count(),0,'unverified private content withheld');
  assert(await page.evaluate(()=>window.__workspaceHeader===document.querySelector('header')),'header survives browser verification failure');
  await page.waitForFunction(()=>document.activeElement?.id==='route-recovery-heading');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Try again','keyboard reaches retry');
  const beforeRetry=state.profileCalls;
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('main button')?.getAttribute('aria-disabled')==='true');
  await page.locator('main button').evaluate(button=>{button.click();button.click();});
  await page.getByRole('status').filter({hasText:'Your session is still unavailable.'}).waitFor();
  assert.equal(state.profileCalls,beforeRetry+2,'repeated activation joins one bounded two-read verification');
  assert.equal(await page.locator('main button').evaluate(button=>button===document.activeElement),true,'retry keeps focus');
  assert.equal(await page.locator('main [role="status"]').evaluate(el=>Boolean(el.closest('[aria-busy="true"]'))),false,'status is not suppressed by busy content');
  await inspect(page,`profile-retry-${width}`);
  await context.setOffline(true);
  await page.getByRole('status').filter({hasText:'Your device is offline.'}).waitFor();
  const beforeOffline=state.profileCalls;
  await page.locator('main button').evaluate(button=>button.click());
  assert.equal(state.profileCalls,beforeOffline,'offline retry does not issue a request');
  await context.setOffline(false);
  // The existing online listener may coalesce a fresh account check. Wait for it.
  await page.waitForTimeout(3500);
  await page.getByRole('link',{name:'Return home',exact:true}).click();
  await page.locator('#homepage-content').waitFor();
  assert(await page.evaluate(()=>window.__workspaceHeader===document.querySelector('header')),'home preserves shell during outage');
  await page.getByRole('button',{name:'Retry account',exact:true}).waitFor();
  await nav('Images');
  await page.getByRole('heading',{name:'Let’s get you reconnected',exact:true}).waitFor();
  state.profileStatus=200;
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.locator('.studio').waitFor();
  assert.equal(await page.getByLabel('Prompt',{exact:true}).inputValue(),'Keep my image draft through recovery');
  await nav('Sites');await page.locator('.sites-workspace').waitFor();
  assert.equal(await page.locator('#site-prompt').inputValue(),'Keep my Site draft through navigation');

  state.profileDelay=0;state.libraryStatus=403;
  await page.goto(base+'/images/library');
  await page.getByRole('heading',{name:'Your images couldn’t be loaded'}).waitFor();
  await page.getByText('This action isn’t available for your account.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Sign in again'}).count(),0,'403 never suggests expired credentials');
  await inspect(page,`images-permission-${width}`);
  state.libraryStatus=200;

  if(width===1440) {
   console.log('long wait and reflow');
   state.profileDelay=8000;
   await page.goto(base+'/images',{waitUntil:'domcontentloaded'});
   await page.locator('[data-workspace-loading="Images"]').waitFor();
   const toolbarHeight=await page.locator('[data-workspace-loading="Images"] > div').first().evaluate(el=>el.getBoundingClientRect().height);
   await page.getByRole('status').filter({hasText:'Opening Images is taking longer than usual.'}).waitFor();
   assert.equal(await page.locator('[data-workspace-loading="Images"] > div').first().evaluate(el=>el.getBoundingClientRect().height),toolbarHeight,'long-wait feedback does not shift desktop content');
   assert.equal(await page.locator('main [role="status"]').evaluate(el=>Boolean(el.closest('[aria-busy="true"]'))),false);
   await page.getByRole('link',{name:'Return home',exact:true}).waitFor();
   await page.screenshot({path:path.join(output,'images-slow-1440.png')});
   await page.locator('.studio').waitFor();
   state.profileDelay=0;state.profileStatus=503;
   await page.reload();
   await page.getByRole('heading',{name:'Let’s get you reconnected',exact:true}).waitFor();
   await page.setViewportSize({width:320,height:900});
   for(const theme of ['contrast','emerald']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await inspect(page,`recovery-${theme}-320`);
   }
   await page.emulateMedia({forcedColors:'active'});
   await page.evaluate(()=>{
    for(const el of document.querySelectorAll('main h1,main p,main button,main a')) el.style.fontSize=`${parseFloat(getComputedStyle(el).fontSize)*2}px`;
   });
   await inspect(page,'recovery-forced-colors-double-text-320');
  }
  assert.deepEqual(errors,[]);assert.equal(state.posts,0,'navigation never dispatches a mutation');
  results.push({width,check:'server/browser recovery; single retry and focus; offline; safe home; both drafts; 403; stable shell; delayed navigation; history; reduced motion; accessibility',posts:state.posts,...(width===1440?{extended:'long wait; 320px reflow; two themes; forced colors; doubled text'}:{})});
  await context.close();
 }
 for(const url of assets){const r=await fetch(url);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),forbidden,url);}
 await writeFile(path.join(output,'results.json'),JSON.stringify({results,assets:assets.size,scope:'Synthetic account and API fixtures; compiled production application; no production acceptance'},null,2));
 console.log(`PASS workspace recovery/navigation; ${results.length} cases, ${assets.size} assets`);
} finally {await browser.close();}
