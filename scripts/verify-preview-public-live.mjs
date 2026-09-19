/** Read-only production browser checks. No signups, email, generation or publishing. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.GALX_BROWSER_MODULE || '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs');
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output = process.argv.includes('--cohort') ? '.impeccable/review/developer-cohort-live' : '.impeccable/review/preview-activation'; await mkdir(output,{recursive:true});
const checks=[];
try {
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for (const path of ['/developers','/images','/sites']) {
      const response=await page.goto('https://galx.ai'+path,{waitUntil:'networkidle',timeout:30000});
      assert.equal(response.status(),200,path); assert.equal(new URL(page.url()).pathname,path);
      await page.evaluate(()=>document.fonts.ready);
      if (path==='/developers') await page.getByRole('heading',{name:'GALX Nova Private access, by decision.',exact:true}).waitFor();
      const text=await page.locator('body').innerText();
      assert.doesNotMatch(text,/private\.developer|preview_admin_|Internal decision note|GALX_VAULT_|SUPABASE_SERVICE_ROLE_KEY|High-Concurrency Fleet Routing/);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,path); assert.deepEqual(errors,[],path);
      await page.screenshot({path:`${output}/${path.slice(1)}-${width}.png`,fullPage:true});
      checks.push({path,width,status:response.status(),overflow,errors:[...errors]});
    }
    await page.goto('https://galx.ai/admin',{waitUntil:'networkidle'});
    assert.equal(new URL(page.url()).pathname,'/auth/signin');
    assert.equal(new URL(page.url()).searchParams.get('next'),'/admin');
    await context.close();
  }
  console.log('PASS: live desktop/mobile Images, Sites, informational private-access page and admin sign-in redirect.');
} finally {
  await writeFile(`${output}/checks.json`,JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n');
  await browser.close();
}
