/** Local synthetic browser coverage. Run with verify-auth-entry-server.cjs. */
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2]||'http://localhost:3427';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const {chromium}=await import(process.env.GALX_BROWSER_MODULE||'/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
const {default:AxeBuilder}=await import(process.env.GALX_AXE_MODULE||'/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs');
const output=path.resolve('.impeccable/review/free-generation');
await mkdir(output,{recursive:true});
const owner='00000000-0000-4000-8000-000000000001';
const user={id:owner,aud:'authenticated',role:'authenticated',email:'fixture@example.test',is_anonymous:false,app_metadata:{provider:'email'},user_metadata:{name:'Fixture'},identities:[],created_at:'2026-09-13T00:00:00Z'};
const session={access_token:`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:owner,exp:4102444800})).toString('base64url')}.valid`,refresh_token:'fixture',expires_at:4102444800,token_type:'bearer',user};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try {
  for(const width of [1440,390,320]) {
    const context=await browser.newContext({viewport:{width,height:900},bypassCSP:true,reducedMotion:'reduce'});
    await context.addCookies([{name:'sb-supabase-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,url:base,sameSite:'Lax'}]);
    const state={quota:{plan:'free',quota:{sites:1,images:5,siteTurns:3}},status:200,delay:0,calls:0,posts:0};
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
      if(url.hostname==='supabase.invalid')return json(url.pathname.endsWith('/user')?user:session);
      if(url.origin!==new URL(base).origin)return route.abort();
      if(request.method()==='POST')state.posts++;
      if(url.pathname==='/api/auth/session')return json({valid:true,user:{id:owner,name:'Fixture',email:user.email}});
      if(url.pathname==='/api/billing/generation-quota'){
        state.calls++;if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
        return json(state.status===200?state.quota:{error:'PRIVATE_QUOTA_SENTINEL'},state.status);
      }
      if(url.pathname==='/api/sites/workspace')return json({setup:{access:'free',publishing:'available',username:null},sites:[],site:null});
      if(url.pathname==='/api/images/library')return json({success:true,records:[],total:0,nextCursor:null});
      if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/v1/'))return json({success:true,data:[],balance:0,balanceUsd:0});
      return route.continue();
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const counter=page.locator('header').getByRole('status').filter({hasText:'Free generation quota:'});
    const inspect=async label=>{
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
      assert.doesNotMatch(await page.locator('body').innerText(),/PRIVATE_QUOTA_SENTINEL|identity_hash|allowance_usd/);
      const audit=await new AxeBuilder({page}).include('header').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      assert.deepEqual(audit.violations.map(v=>({id:v.id,impact:v.impact})),[],label+' accessibility');
      await page.screenshot({path:path.join(output,label+'.png')});
    };
    const refresh=()=>page.evaluate(()=>window.dispatchEvent(new Event('galx:generation-quota-changed')));
    await page.goto(base+'/sites');await counter.getByText('Site turns: 3 of 3 left').waitFor();
    assert.match(await counter.innerText(),/Sites: 1.*Images: 5/s);
    await inspect('free-'+width);
    await page.getByPlaceholder('Tell us about your Site…').fill('A local fixture draft');
    const send=page.getByRole('button',{name:'Send message',exact:true});
    await send.scrollIntoViewIfNeeded();assert.equal(await send.isEnabled(),true,'free account can compose');
    await send.click({trial:true}); // Check hit testing without submitting a generation.
    const sendBox=await send.boundingBox();assert(sendBox&&sendBox.y>=0&&sendBox.y+sendBox.height<=901,JSON.stringify({check:'send remains reachable',width,sendBox}));
    await page.evaluate(()=>window.scrollTo(0,0));
    state.quota={plan:'free',quota:{sites:0,images:0,siteTurns:0}};
    await refresh();await counter.getByText('Site turns: 0 of 3 left').waitFor();
    await inspect('exhausted-'+width);
    state.status=503;await refresh();await counter.getByText('Temporarily unavailable').waitFor();
    await inspect('unavailable-'+width);
    state.status=200;state.quota={plan:'free',quota:{sites:1,images:5,siteTurns:3}};
    await refresh();await counter.getByText('Site turns: 3 of 3 left').waitFor();
    const before=state.calls;state.delay=300;
    await page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('galx:generation-quota-changed'));});
    await page.waitForResponse(r=>r.url().includes('/api/billing/generation-quota'));
    assert.equal(state.calls,before+1,'overlapping refreshes coalesce');state.delay=0;
    await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
    await inspect('light-'+width);
    state.quota={plan:'pro',quota:null};await refresh();await counter.waitFor({state:'hidden'});
    assert.equal(state.posts,0,'inspection never generates or publishes');assert.deepEqual(errors,[]);
    results.push({width,states:['free','exhausted','unavailable','recovered','pro'],overlap:'coalesced',axeViolations:0,mutations:0});
    await context.close();
  }
  await writeFile(path.join(output,'verification.json'),JSON.stringify({scope:'local synthetic Chromium; no external services',results},null,2)+'\n');
  console.log(JSON.stringify({passed:true,results}));
} finally {await browser.close();}
