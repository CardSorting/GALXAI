/** Local browser fixtures: no live account, inference, publishing or external requests. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2] || 'http://127.0.0.1:3422';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const {chromium}=await import(process.env.GALX_BROWSER_MODULE || 'playwright');
const {default:AxeBuilder}=await import(process.env.GALX_AXE_MODULE || '@axe-core/playwright');
const output=path.resolve('.impeccable/review/sites');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results:unknown[]=[];
async function setup(width:number,authenticated:boolean){
  const context=await browser.newContext({viewport:{width,height:940},reducedMotion:'reduce'});
  if(authenticated)await context.addInitScript(()=>{if(window.top===window)localStorage.setItem('galx_custom_auth_user',JSON.stringify({id:'sites-fixture-user',token:'sites-fixture-token',name:'Site Tester',provider:'fixture'}));});
  const state={sites:[] as any[],posts:[] as any[],complete:true,mode:'ok',listDelay:0};
  await context.route('**/*',async(route:any)=>{
    const req=route.request(),url=new URL(req.url());if(url.protocol==='about:')return route.continue();if(url.origin!==new URL(base).origin)return route.abort();
    const json=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/api/sites/workspace'){
      assert.equal(req.headers().authorization,'Bearer sites-fixture-token');
      if(req.method()==='GET'){
        if(url.searchParams.get('view')==='setup')return json({quote:{quoteVersion:'fixture-v1',maxChargeMicroUsd:50000},publishing:'available',username:null,internal:'private-sentinel'});
        if(url.searchParams.has('id'))return json({site:state.sites.find(s=>s.id===url.searchParams.get('id'))});
        if(state.listDelay)await new Promise(resolve=>setTimeout(resolve,state.listDelay));
        return json({sites:state.sites});
      }
      const body=req.postDataJSON();state.posts.push(body);
      if(state.mode==='error')return json({error:{message:'private-sentinel'}},503);
      let site=state.sites.find(s=>s.id===body.id);
      if(body.action==='create'){site={id:body.id,title:'Untitled Site',revision:0,updatedAt:new Date().toISOString(),document:null,messages:[],generating:false,archived:false,published:false,address:null};state.sites.push(site);}
      if(body.action==='generate'){
        assert.equal(body.maxChargeMicroUsd,50000);assert.equal(body.quoteVersion,'fixture-v1');assert(body.operationId);site.generating=!state.complete;
        site.messages.push({id:'user-'+site.revision,role:'user',text:body.brief});
        if(state.complete){site.document={schema_version:1,title:'Daylight. A calmer week.',summary:'A thoughtful planner for small teams who want more space for meaningful work.',sections:[{heading:'Plan with intention',body:'Bring tasks, priorities, and people into one considered weekly plan.'},{heading:'Make room for focus',body:'A little structure helps your team spend less time coordinating and more time doing the work that matters.'}]};site.title=site.document.title;site.revision++;site.messages.push({id:'reply-'+site.revision,role:'assistant',text:'Your draft is ready to preview. Tell me what you’d like to change.'});}
      }
      if(body.action==='rename'){site.title=body.title;site.revision++;}
      if(body.action==='archive'){site.archived=body.archived;site.revision++;}
      if(body.action==='publish'){assert.equal(body.audience,'public');site.published=true;site.address={hostname:'daylight.alice.galx.ai',status:'pending',url:null};site.revision++;}
      if(body.action==='unpublish'){site.published=false;site.revision++;}
      return json({site,private:'private-sentinel'});
    }
    if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/v1/'))return json({success:true,data:[],balance:0,balanceUsd:0});
    return route.continue();
  });
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));
  return{context,page,state,errors};
}
async function inspect(page:any,label:string){
  console.log(JSON.stringify({checking:label}));
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelectorAll('.sites-workspace').length===1 && document.querySelectorAll('.sites-viewport > iframe').length===1);
  if(await page.locator('iframe').isVisible())await page.frameLocator('iframe').getByRole('heading',{level:1}).waitFor();
  console.log(JSON.stringify({previewReady:label}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' horizontal overflow');
  assert.doesNotMatch(await page.locator('.sites-workspace').innerText(),/private-sentinel/);
  const analysis=await new AxeBuilder({page}).setLegacyMode(true).include('.sites-workspace').withTags(['wcag2a','wcag2aa','wcag21aa']).options({iframes:false}).analyze();
  const violations=analysis.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.target)}));
  if(!process.env.GALX_SITES_NO_CAPTURE)await page.screenshot({path:path.join(output,label+'.png'),fullPage:true});
  results.push({label,violations});assert.deepEqual(violations,[],label+' accessibility');
}
try{
  for(const width of [1440,390]){
    const {context,page,errors}=await setup(width,false);await page.goto(base+'/sites',{waitUntil:'domcontentloaded'});
    await page.getByRole('link',{name:'Sign in to create'}).waitFor();
    await inspect(page,`guest-${width}`);
    await page.getByRole('button',{name:'A product launch',exact:true}).click();assert.match(await page.getByLabel('Describe your Site or ask for a change').inputValue(),/Daylight/);
    if(width<760){await page.getByRole('button',{name:'Preview',exact:true}).click();await inspect(page,`guest-preview-${width}`);}
    const frame=page.frameLocator('iframe');await frame.getByRole('heading',{level:1}).waitFor();assert.match(await frame.getByRole('heading',{level:1}).innerText(),/Good ideas/);
    assert.equal(await page.locator('iframe').getAttribute('sandbox'),'');assert.deepEqual(errors,[]);await context.close();
  }
  for(const width of [1440,390]){
    const {context,page,state,errors}=await setup(width,true);await page.goto(base+'/sites',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'A product launch',exact:true}).click();await page.getByRole('button',{name:'Send message, maximum $0.05',exact:true}).click();
    await page.getByText('Your draft is ready to preview.',{exact:false}).waitFor();
    assert.equal(state.posts.filter(p=>p.action==='generate').length,1);assert.equal(state.posts.filter(p=>p.action==='create').length,1);
    if(width<760)await page.getByRole('button',{name:'Preview',exact:true}).click();
    await page.frameLocator('iframe[title="Your Site draft preview"]').getByRole('heading',{name:'Daylight. A calmer week.',exact:true}).waitFor();await inspect(page,`draft-${width}`);
    await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByLabel('Your username',{exact:true}).fill('alice');
    assert.equal(state.posts.filter(p=>p.action==='publish').length,0);await page.getByRole('button',{name:'Publish publicly',exact:true}).click();
    await page.getByText('Publication saved.',{exact:false}).waitFor();assert(await page.getByText('Publication saved.',{exact:false}).isVisible());
    await page.getByText('Address pending',{exact:true}).waitFor();assert.equal(state.posts.filter(p=>p.action==='publish').length,1);
    await page.getByRole('button',{name:'Site settings',exact:true}).click();await page.getByLabel('Site name',{exact:true}).fill('Daylight for teams');await page.getByRole('button',{name:'Save name',exact:true}).click();
    await page.getByRole('button',{name:'Site settings',exact:true}).click();await page.getByRole('button',{name:'Archive',exact:true}).click();
    assert.equal(state.sites[0].archived,true);assert.equal(state.sites[0].published,true);
    if(width<760)await page.getByRole('button',{name:'Chat',exact:true}).first().click();
    await page.getByRole('button',{name:'Restore Site',exact:true}).click();assert.equal(state.sites[0].archived,false);
    await page.getByRole('button',{name:'My Sites',exact:false}).click();await page.getByLabel('Search your Sites').fill('Daylight');assert.equal(await page.locator('.sites-list-item').count(),1);
    await page.locator('.sites-list-item').click();assert.match(page.url(),/\/sites\/[a-f0-9-]{36}/);await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Your draft is ready to preview.',{exact:false}).waitFor();
    if(width<760){
      await page.getByRole('button',{name:'Preview',exact:true}).click();
      await page.getByRole('button',{name:'Publish',exact:true}).click();state.mode='error';
      await page.getByLabel('Your username',{exact:true}).fill('alice');await page.getByRole('button',{name:'Publish publicly',exact:true}).click();
      await page.getByRole('alert').waitFor();assert(await page.getByRole('alert').isVisible());await inspect(page,'publish-error-390');state.mode='ok';
      await page.getByRole('button',{name:'New Site',exact:true}).click();await page.getByLabel('Describe your Site or ask for a change').waitFor({state:'visible'});
      assert(await page.getByLabel('Describe your Site or ask for a change').evaluate((el:any)=>el===document.activeElement));
      state.listDelay=1800;await page.goto(base+'/sites/'+state.sites[0].id,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Loading your Site…',exact:true}).waitFor();assert(await page.getByRole('button',{name:/Send message/}).isDisabled());
      assert.equal(await page.locator('iframe').count(),0);await page.screenshot({path:path.join(output,'loading-390.png'),fullPage:true});
      await page.getByText('Your draft is ready to preview.',{exact:false}).waitFor();
    }
    assert.deepEqual(errors,[]);await context.close();
  }
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({scope:'isolated browser fixtures; no live inference or publication',results},null,2)+'\n');
  console.log(JSON.stringify({states:results.length,failures:0,output}));
}finally{await browser.close();}
