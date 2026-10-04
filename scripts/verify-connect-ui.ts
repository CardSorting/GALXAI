/** Local compiled preview only; all account/API/remote requests are intercepted. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const base = process.argv[2] || 'http://127.0.0.1:3427';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const output = path.resolve('.impeccable/review/connect'); await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({ headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const evidence: unknown[] = [];
const id = '00000000-0000-4000-8000-000000000001';
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',bypassCSP:true});
    let signedOut=false,expired=false,available=true,disconnected=false,disconnectFails=false;
    const mutations: string[] = [];
    await context.route('**/*',async (route:any) => {
      const request=route.request(),url=new URL(request.url());
      const json=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.origin!==new URL(base).origin) return route.abort();
      if(url.pathname==='/api/auth/session') return signedOut?json({valid:false},401):json({valid:true,user:{id,email:'fixture@example.test'}});
      if(url.pathname==='/api/connect/consent') {
        if(signedOut)return json({error:'authentication_required'},401);
        if(expired)return json({error:'PRIVATE_SENTINEL'},400);
        if(request.method()==='POST'){mutations.push(request.postData());return json({redirect_uri:`${base}/connect`});}
        return json({application:'Example Studio',inference_access:available});
      }
      if(url.pathname==='/api/connect/connections') {
        if(signedOut)return json({error:'authentication_required'},401);
        if(request.method()==='POST'){mutations.push(request.postData());if(disconnectFails)return json({error:'PRIVATE_SENTINEL'},503);disconnected=true;return route.fulfill({status:204,body:''});}
        return json({inference_access:available,connections:disconnected?[]:[{id,application:'Example Studio',permission:'Use inference',connected_at:'2026-10-03T12:00:00Z'}]});
      }
      if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/v1/'))return json({});
      return route.continue();
    });
    const page=await context.newPage(); const errors:string[]=[];
    page.on('pageerror',(e:Error)=>errors.push(e.message));
    async function inspect(name:string,capture=true){
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name}: overflow`);
      assert.doesNotMatch(await page.locator('main').innerText(),/PRIVATE_SENTINEL|refresh_token|galx_connect_at_|provider credentials|routing/i);
      const analysis=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      const violations=analysis.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.target)}));
      evidence.push({name,width,violations});
      assert.deepEqual(violations,[],`${name}: accessibility`);
      if(capture)await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});
    }
    await page.goto(`${base}/connect/consent?request=${id}`);
    await page.getByRole('heading',{name:'Connect Example Studio to GALX'}).waitFor();
    await inspect('consent');
    await page.getByRole('button',{name:'Allow access',exact:true}).focus();
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Allow access');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.waitForURL(`${base}/connect`);
    assert(mutations.some(v=>v.includes('decision=cancel')));
    await page.getByRole('button',{name:'Disconnect application Example Studio'}).waitFor();
    await inspect('connections');
    disconnectFails=true;
    await page.getByRole('button',{name:'Disconnect application Example Studio'}).click();
    await page.locator('main').getByRole('alert').waitFor();
    await page.getByRole('button',{name:'Disconnect application Example Studio'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Disconnect application Example Studio'}).count(),1);
    await inspect('disconnect-error',false);
    disconnectFails=false;
    await page.getByRole('button',{name:'Disconnect application Example Studio'}).click();
    await page.getByRole('heading',{name:'No applications connected'}).waitFor();
    assert.match(await page.locator('main').innerText(),/New tasks are blocked/);
    await inspect('empty',false);
    available=false;
    await page.goto(`${base}/connect/consent?request=${id}`);
    await page.getByRole('button',{name:'Allow access',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Allow access',exact:true}).isEnabled(),true);
    assert.match(await page.locator('main').innerText(),/does not currently have inference access/);
    await inspect('no-entitlement',false);
    expired=true;
    await page.reload();await page.locator('main').getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button',{name:'Allow access',exact:true}).count(),0);
    await inspect('expired',false);
    signedOut=true;expired=false;
    await page.reload();await page.getByRole('link',{name:'Sign in to GALX'}).waitFor();
    assert.equal(new URL(await page.getByRole('link',{name:'Sign in to GALX'}).getAttribute('href'),base).searchParams.get('next'),`/connect/consent?request=${id}`);
    await inspect('sign-in',false);assert.deepEqual(errors,[]);await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({scope:'Isolated compiled preview, intercepted synthetic API/account data. No hosted acceptance.',checks:evidence},null,2));
  console.log(JSON.stringify({states:evidence.length,violations:0,screenshots:4,output}));
}finally{await browser.close();}
