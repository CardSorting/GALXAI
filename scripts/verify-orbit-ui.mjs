import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base=process.env.GALX_UI_BASE||'http://127.0.0.1:3432';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const {chromium}=await import(process.env.GALX_BROWSER_MODULE||'playwright');
const output=path.resolve('.impeccable/review/orbit');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.GALX_CHROME_PATH?{executablePath:process.env.GALX_CHROME_PATH}:{})});
const checks=[];
try {
  for(const width of [1440,390,320]) {
    let state='active';
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base)return route.abort();
      if(url.pathname==='/api/billing/orbit') {
        if(route.request().method()==='POST') {
          assert.equal(route.request().postDataJSON().action,'cancel');state='ending';
          return route.fulfill({json:{canceled:true}});
        }
        return route.fulfill({json:{name:'VANTA',handle:'vanta',monthlyUsd:10,testMode:false,checkoutAvailable:false,state,
          paidThrough:'2026-10-26T12:00:00Z',canManage:state!=='none',canCancel:state==='active',works:[]}});
      }
      if(url.pathname==='/api/images/feed')return route.fulfill({json:{success:true,items:[],nextCursor:null}});
      if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,json:{error:'Sign in required.'}});
      if(route.request().method()!=='GET')return route.abort();
      return route.continue();
    });
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/profile/vanta`,{waitUntil:'domcontentloaded'});
    const panel=page.getByRole('region',{name:'Orbit VANTA',exact:true});
    await panel.getByText(/Patron of VANTA/).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    for(const button of await panel.getByRole('button').all()) {
      const box=await button.boundingBox();assert(box.height>=44&&box.width>=44);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    async function capture(label) {
      await page.setViewportSize({width,height:Math.max(1000,Math.ceil((await panel.boundingBox()).height)+500)});
      await panel.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+window.scrollY-100));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await panel.screenshot({path:path.join(output,`${label}-${width}.png`)});
    }
    await capture('active');
    await panel.getByRole('button',{name:'Cancel renewal',exact:true}).click();
    await panel.getByRole('button',{name:'Confirm cancellation',exact:true}).click();
    await panel.getByText(/Access ends/).waitFor();
    assert.equal(await panel.getByRole('button',{name:'Cancel renewal',exact:true}).count(),0);
    await capture('ending');
    state='none';await page.reload({waitUntil:'domcontentloaded'});
    await panel.getByText('New Orbit subscriptions are not available yet.').waitFor();
    await capture('unavailable');
    assert.deepEqual(errors,[]);checks.push({width,overflow:false,periodEndCancellation:'passed',touchTargets:'passed'});
    await context.close();
  }
} finally {
  await writeFile(path.join(output,'ui-checks.json'),JSON.stringify({scope:'Local production build; mocked account states, not provider payment evidence',checks},null,2));
  await browser.close();
}
console.log(JSON.stringify(checks));
