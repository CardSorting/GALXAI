/** Synthetic loopback UI fixture. No database, provider, Docker or real credentials. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp,mkdir,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { CentralClient,hash } from '../src/relay/pool-protocol.js';
import { poolMonitor } from '../src/relay/pool-monitor-server.js';
import { DesktopManager } from '../src/relay/desktop-manager.js';

const {chromium}=await import(pathToFileURL(process.env.GALX_BROWSER_MODULE ?? '/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs').href);
const {default:AxeBuilder}=await import(pathToFileURL('/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs').href);
const directory=await mkdtemp(path.join(tmpdir(),'pool-browser-')),shots=path.resolve('.impeccable/review/relay-management');await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true});const monitors:any[]=[];const report:any[]=[];
try{
  for(const pool of ['premium','standard'] as const){const identity={pool,installationId:randomUUID()},epoch=randomUUID(),accountId='codex_sh_'+hash(pool).slice(0,24),desktopId=randomUUID();
    const data:any={pool,installationId:identity.installationId,epoch,registrationAllowed:true,executionAllowed:true,lastSeenAt:new Date().toISOString(),accounts:pool==='premium'?[{id:accountId,desktopId,name:'Synthetic · Design studio',state:'enabled',revision:2,acknowledgedRevision:2,acknowledgedEpoch:epoch,acknowledgedAt:new Date().toISOString(),models:['fixture-text-a','fixture-text-b'],accountClass:'paid',credentialExpiresAt:Date.now()+86400000},{id:'codex_sh_'+hash('second').slice(0,24),desktopId:randomUUID(),name:'Synthetic · Research team',state:'paused',revision:3,acknowledgedRevision:2,acknowledgedEpoch:epoch,models:['fixture-text-a'],accountClass:'paid',credentialExpiresAt:Date.now()-1000}]:[],registrations:pool==='premium'?[{id:randomUUID(),desktopId,name:'Synthetic · New account',state:'reviewed',revision:1,accountClass:'paid',models:['fixture-text-a','fixture-text-b']}]:[],activity:pool==='premium'?[{id:randomUUID(),accountId,command:'enabled',revision:2,at:new Date().toISOString()}]:[]};
    if(pool==='premium')data.accounts[0].updatedAt=new Date(Date.now()-120000).toISOString();
    const tokens=['operator','viewer','registrar'].map(role=>hash(pool+role));
    let offline=false, mutationCount=0, stopFails=false, connectWrites=0, connectError=false, lostConnect=false, refreshError=false;
    const clients=tokens.map(token=>new CentralClient('http://127.0.0.1:1',token,identity,(async(url:any,options:any)=>{
      if(offline)throw Error('synthetic offline');
      const route=new URL(url).pathname, body=JSON.parse(options.body);
      if(route==='/operator/set_account'){
        mutationCount++;const account=data.accounts.find((a:any)=>a.id===body.accountId);
        if(account.revision!==body.expectedRevision)return Response.json({error:{code:'record_changed'}},{status:409});
        const registration=data.registrations.find((r:any)=>r.accountId===account.id);
        if(body.command==='rename'){account.name=body.name;if(registration)registration.name=body.name;}
        else if(body.command==='remove'){account.state='revoked';account.removedAt=new Date().toISOString();if(registration)registration.removedAt=account.removedAt;}
        else account.state=body.command;
        account.revision++;return Response.json({desktopId:account.desktopId,savedRevision:account.revision});
      }
      if(route==='/operator/manage_registration'){
        const registration=data.registrations.find((r:any)=>r.id===body.registrationId);
        if(registration.revision!==body.expectedRevision)return Response.json({error:{code:'record_changed'}},{status:409});
        if(body.command==='rename')registration.name=body.name;
        if(body.command==='remove')registration.removedAt=new Date().toISOString();
        if(body.command==='restore'){registration.removedAt=null;registration.state='prepared';}
        registration.revision++;return Response.json({desktopId:registration.desktopId,savedRevision:registration.revision,removedAt:registration.removedAt});
      }
      if(route==='/operator/prepare'){let saved=data.registrations.find((r:any)=>r.id===body.id);if(!saved){saved={id:body.id,desktopId:body.desktopId,name:body.name,state:'prepared',revision:1};data.registrations.unshift(saved);}return Response.json(saved);}
      if(route==='/operator/operation'){const saved=data.registrations.find((r:any)=>r.id===body.id);if(!saved)return Response.json({error:{code:'not_found',message:'Registration not found.'}},{status:404});return Response.json(saved);}
      if(route==='/operator/ticket')return Response.json({ticket:'synthetic'});
      if(route==='/registrar/review'){const saved=data.registrations.find((r:any)=>r.id===body.id);Object.assign(saved,{state:'reviewed',accountClass:pool==='premium'?'paid':'free',models:['fixture-text-a']});return Response.json(saved);}
      if(route==='/registrar/connect'){if(connectError)return Response.json({error:{code:'credential_missing'}},{status:422});connectWrites++;const saved=data.registrations.find((r:any)=>r.id===body.id);Object.assign(saved,{state:'registered',accountClass:pool==='premium'?'paid':'free',models:['fixture-text-a']});saved.accountId='codex_sh_'+hash(saved.id).slice(0,24);data.accounts.push({id:saved.accountId,desktopId:saved.desktopId,name:saved.name,state:'paused',revision:1,models:saved.models,accountClass:saved.accountClass,credentialExpiresAt:Date.now()+86400000,connectionState:'connected',connectionCheckedAt:new Date().toISOString()});return lostConnect?Response.json({error:{code:'control_unavailable'}},{status:503}):Response.json(saved);}
      if(route==='/registrar/refresh'){if(refreshError)return Response.json({error:{code:'credential_rejected'}},{status:422});const saved=data.registrations.find((r:any)=>r.id===body.id);const account=data.accounts.find((a:any)=>a.id===saved.accountId);Object.assign(account,{connectionState:'connected',connectionCheckedAt:new Date().toISOString(),credentialExpiresAt:Date.now()+86400000});return Response.json({accountId:account.id,state:'updated'});}
      return Response.json(data);
    }) as typeof fetch));
    const running=new Set([desktopId]);
    const driver={available:async()=>true,list:async()=>data.registrations.map((r:any)=>({id:r.desktopId,containerId:r.desktopId,running:running.has(r.desktopId),healthy:true})),create:async()=>{},start:async(id:string)=>{running.add(id);},stop:async(id:string)=>{if(stopFails)throw Error('synthetic stop failure');running.delete(id);},destroy:async()=>{},launch:async()=>{},display:async()=>{throw Error();},clipboard:async()=>'',credentials:async()=>[]};
    const desktops=new DesktopManager(path.join(directory,pool+'.json'),driver);if(pool==='premium')await desktops.create({id:desktopId,name:'Synthetic · New account'});
    const monitor=poolMonitor({operator:clients[0],viewer:clients[1],registrar:clients[2],operatorToken:tokens[0],viewerToken:tokens[1],desktops});monitor.server.listen(0,'127.0.0.1');await once(monitor.server,'listening');monitors.push(monitor);const origin=`http://127.0.0.1:${(monitor.server.address() as any).port}`;
    const context=await browser.newContext();const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
    const inspectDialog=async(surface:string)=>{
      for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
        await page.setViewportSize({width,height});
        if(!process.env.GALX_UI_INTERACTIONS_ONLY)await page.screenshot({path:path.join(shots,`${pool}-${surface}-${name}.png`),fullPage:true});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>v.id),[]);
        report.push({pool,surface,viewport:name,axeViolations:0,overflow:false});
      }
    };
    await page.goto(origin);
    assert.equal(await page.locator('#launcher').getAttribute('href'),`galx-monitor://open/${pool}`);
    assert.equal((await page.request.get(origin+'/api/status')).status(),401);
    for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
      await page.setViewportSize({width,height});if(!process.env.GALX_UI_INTERACTIONS_ONLY)await page.screenshot({path:path.join(shots,`${pool}-access-${name}.png`),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>v.id),[]);
      report.push({pool,surface:'access',viewport:name,axeViolations:0,overflow:false});
    }
    await page.goto(`${origin}/#ticket=invalid&role=operator`);
    await page.getByText('This sign-in link is invalid.',{exact:false}).waitFor();
    assert.equal(new URL(page.url()).hash,'');
    const role=pool==='premium'?'operator':'viewer';const ticket=await(await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:`Bearer ${tokens[role==='operator'?0:1]}`}})).json();
    await page.goto(`${origin}/#ticket=${ticket.ticket}&role=${role}`);await page.getByText(pool==='premium'?'Premium relay':'Standard relay',{exact:true}).waitFor();
    assert.equal(new URL(page.url()).hash,'');
    const renewal=await(await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:`Bearer ${tokens[role==='operator'?0:1]}`}})).json();
    await page.goto(`${origin}/#ticket=${renewal.ticket}&role=${role}`);
    await page.waitForFunction(()=>!location.hash&&document.querySelector('#role')?.textContent.includes('access'));
    assert.equal((await fetch(origin+'/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({role,ticket:renewal.ticket})})).status,401,'reopening an authenticated monitor consumes the ticket');
    assert.equal(await page.locator('#role').textContent(),pool==='premium'?'Operator access':'Read-only access');
    // Automatic activation communicates a useful pending state in both fixed monitors.
    data.automaticActivation=true;data.executionAllowed=false;
    const savedAccounts=data.accounts;data.accounts=[];
    await page.locator('nav a[href="#accounts"]').click();
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.locator('#execution').filter({hasText:'Waiting for account'}).waitFor();
    assert.match(await page.locator('#gate-note').innerText(),/automatically/);
    assert.equal((await page.locator('body').innerText()).includes('New accounts start paused'),false);
    for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
      await page.setViewportSize({width,height});
      await page.screenshot({path:path.join(shots,`${pool}-automatic-${name}.png`),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>v.id),[]);
      report.push({pool,surface:'automatic-activation',viewport:name,axeViolations:0,overflow:false});
    }
    data.accounts=savedAccounts;data.executionAllowed=true;data.automaticActivation=false;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.locator('#execution').filter({hasText:'Allowed'}).waitFor();
    if(pool==='premium'){
      await page.getByRole('link',{name:/^Connections/}).click();

      await page.locator('#pending .models summary').click();
      await page.locator('#pending .models summary').focus();
      await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('#refresh')?.hasAttribute('disabled'));
      assert.equal(await page.locator('#pending .models').getAttribute('open'),'');
      await page.getByRole('link',{name:/^Accounts/}).click();
      await page.locator('#search').fill('missing account');await page.locator('#no-results').waitFor({state:'visible'});
      await page.getByRole('button',{name:'Clear filters'}).click();assert.equal(await page.locator('#rows tr').count(),2);
      await page.locator('#filter').selectOption('attention');assert.equal(await page.locator('#rows tr').count(),1);
      await page.locator('#filter').selectOption('all');
      await page.getByRole('button',{name:'Pause',exact:true}).click();
      await page.getByText('Change saved.',{exact:false}).waitFor();assert.equal(mutationCount,1);
      offline=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Connection interrupted',{exact:true}).waitFor();
      assert.equal(await page.locator('#rows button:enabled').count(),0);
      offline=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('#connection').filter({hasText:/^Connected$/}).waitFor();
      data.executionAllowed=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('#execution').filter({hasText:'Paused'}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Enable',exact:true}).first().isEnabled(),false);
      data.executionAllowed=true;
    } else assert.equal(await page.locator('#new').isVisible(),false);
    if(pool==='premium'){
      await page.locator('#filter').selectOption('all');await page.locator('#health-filter').selectOption('attention');
      assert.equal(await page.locator('#rows tr').count(),1);await page.locator('#health-filter').selectOption('all');
      const accountRow=page.locator('#rows tr').filter({hasText:'Synthetic · Design studio'});
      if(await accountRow.locator('.record-menu').getAttribute('open')===null)await accountRow.getByText('Manage',{exact:true}).click();await accountRow.getByRole('button',{name:'Rename',exact:true}).click();
      await page.locator('#manage-name').fill('Renamed <script> studio');await inspectDialog('rename');await page.getByRole('button',{name:'Save name',exact:true}).click();
      await page.locator('#manage-dialog').waitFor({state:'hidden'});assert.equal(data.accounts[0].name,'Renamed <script> studio');
      // A concurrently changed revision leaves the input and dialog available for recovery.
      const renamed=page.locator('#rows tr').filter({hasText:'Renamed <script> studio'});
      if(await renamed.locator('.record-menu').getAttribute('open')===null)await renamed.getByText('Manage',{exact:true}).click();await renamed.getByRole('button',{name:'Rename',exact:true}).click();
      await page.locator('#manage-name').fill('Keep my draft');data.accounts[0].revision++;
      await page.getByRole('button',{name:'Save name',exact:true}).click();await page.locator('#manage-error').waitFor({state:'visible'});
      assert.equal(await page.locator('#manage-name').inputValue(),'Keep my draft');await page.locator('#manage-cancel').click();
      await page.locator('nav a[href="#registrations"]').click();
      const draftRow=page.locator('#pending article').first();
      if(await draftRow.locator('.record-menu').getAttribute('open')===null)await draftRow.getByText('Manage',{exact:true}).click();await draftRow.getByRole('button',{name:'Rename',exact:true}).click();
      await page.locator('#manage-name').fill('Synthetic · Renamed registration');
      await page.getByRole('button',{name:'Save name',exact:true}).click();await page.locator('#manage-dialog').waitFor({state:'hidden'});
      if(await draftRow.locator('.record-menu').getAttribute('open')===null)await draftRow.getByText('Manage',{exact:true}).click();await draftRow.getByRole('button',{name:'Remove registration',exact:true}).click();
      assert.equal(await page.locator('#manage-cancel').evaluate((el:any)=>el===document.activeElement),true);
      await inspectDialog('remove');
      stopFails=true;await page.locator('#manage-submit').click();await page.locator('#manage-dialog').waitFor({state:'hidden'});
      await page.locator('#registration-filter').selectOption('removed');await page.getByText('Desktop still running',{exact:true}).waitFor();
      for(const action of ['start','launch','clipboard','signin']){
        const denied=await page.request.post(origin+`/api/desktops/${desktopId}/${action}`,{headers:{Origin:origin},data:{}});
        assert.equal(denied.status(),409,`removed registration denies direct desktop ${action}`);
      }
      const removedStart=await page.request.post(origin+'/api/registrations/start',{headers:{Origin:origin},data:{id:data.registrations[0].id}});
      assert.equal(removedStart.status(),409);
      stopFails=false;await page.getByRole('button',{name:'Stop desktop',exact:true}).click();
      await page.getByText('History and desktop files are retained.',{exact:true}).waitFor();
      if(await page.locator('#pending').locator('.record-menu').getAttribute('open')===null)await page.locator('#pending').getByText('Manage',{exact:true}).click();await page.getByRole('button',{name:'Restore registration',exact:true}).click();
      await page.locator('#manage-submit').click();await page.locator('#manage-dialog').waitFor({state:'hidden'});
      await page.locator('#registration-filter').selectOption('all');
      await page.getByRole('button',{name:'Start desktop',exact:true}).click();
      await page.getByRole('button',{name:'Open desktop',exact:true}).waitFor();
      // Restore the reviewed fixture for the existing registration coverage below.
      data.registrations[0].name='Synthetic · New account';data.registrations[0].state='reviewed';
      await page.locator('#refresh').click();
    }
    for(const surface of ['accounts','registrations','activity']){
      await page.locator('nav a[href="#'+surface+'"]').click();
      for(const [name,width,height] of [['desktop',1440,1000],['tablet',900,1000],['mobile',390,844]] as const){
        await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));if(!process.env.GALX_UI_INTERACTIONS_ONLY)await page.screenshot({path:path.join(shots,`${pool}-${surface}-${name}.png`),fullPage:true});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${pool}-${surface}-${name} overflow`);
        assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>({id:v.id,nodes:v.nodes.length})),[],`${pool}-${surface}-${name} accessibility`);
        report.push({pool,surface,viewport:name,axeViolations:0,overflow:false});
      }
    }
    if(pool==='premium'){
      await page.setViewportSize({width:1440,height:1000});
      await page.locator('#new').click();await page.waitForFunction(()=>document.activeElement?.id==='name');await page.locator('#name').fill('Synthetic · Added account');
      for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
        await page.setViewportSize({width,height});if(!process.env.GALX_UI_INTERACTIONS_ONLY)await page.screenshot({path:path.join(shots,`premium-create-${name}.png`),fullPage:true});
        assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>v.id),[]);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        report.push({pool,surface:'create',viewport:name,axeViolations:0,overflow:false});
      }
      await page.getByRole('button',{name:'Create sign-in desktop'}).click();
      const registration=page.locator('#pending article').filter({hasText:'Synthetic · Added account'});
      await registration.getByText('Step 1 of 2',{exact:true}).waitFor();
      connectError=true;await registration.getByRole('button',{name:'Connect account',exact:true}).click();
      await registration.getByRole('alert').waitFor();assert.equal(await page.locator('#notice').textContent(),'');
      assert.equal(connectWrites,0);
      connectError=false;lostConnect=true;await registration.getByRole('button',{name:'Connect account',exact:true}).click();
      await page.getByText('Account connected. View its current state in Accounts.',{exact:true}).waitFor();
      assert.equal(await page.locator('.registration-row .inline-error').count(),0);
      const replay=await page.request.post(origin+'/api/registrations/connect',{headers:{Origin:origin},data:{id:data.registrations[0].id}});assert.equal((await replay.json()).replayed,true);assert.equal(connectWrites,1);lostConnect=false;
      await page.locator('nav a[href="#accounts"]').click();
      await page.locator('#rows').getByText('Synthetic · Added account',{exact:false}).waitFor();
      assert.equal(data.accounts.at(-1).state,'paused');
      const added=page.locator('#rows tr').filter({hasText:'Synthetic · Added account'});
      const sameId=data.accounts.at(-1).id;data.accounts.at(-1).connectionState='sign_in_required';
      await page.locator('#refresh').click();await added.getByRole('button',{name:'Reconnect',exact:true}).click();
      const reconnectRow=page.locator('#pending article').filter({hasText:'Synthetic · Added account'});
      await reconnectRow.getByRole('button',{name:'Reconnect account',exact:true}).waitFor();
      refreshError=true;await reconnectRow.getByRole('button',{name:'Reconnect account',exact:true}).click();
      await reconnectRow.getByRole('alert').waitFor();
      for(const [name,width,height] of [['desktop',1440,1000],['narrow',320,844]] as const){
        await page.setViewportSize({width,height});await page.screenshot({path:path.join(shots,`premium-reconnect-${name}.png`),fullPage:true});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map((v:any)=>v.id),[]);
        report.push({pool,surface:'reconnect-error',viewport:name,axeViolations:0,overflow:false});
      }
      refreshError=false;await reconnectRow.getByRole('button',{name:'Reconnect account',exact:true}).click();
      await page.getByText('Connection verified. Check Accounts for its current status.',{exact:true}).waitFor();
      assert.equal(data.accounts.at(-1).id,sameId);assert.equal(data.accounts.at(-1).state,'paused');assert.equal(data.accounts.length,3);
      await page.locator('nav a[href="#accounts"]').click();

      if(await added.locator('.record-menu').getAttribute('open')===null)await added.getByText('Manage',{exact:true}).click();await added.getByRole('button',{name:'Remove account',exact:true}).click();
      await page.locator('#manage-submit').click();await page.locator('#manage-dialog').waitFor({state:'hidden'});
      await page.locator('#filter').selectOption('removed');assert.equal(await page.locator('#rows tr').count(),1);
      assert.equal(data.accounts.at(-1).state,'revoked');await page.locator('#filter').selectOption('all');
      // Recovery starts only the desktop resolved from the existing central registration.
      running.delete(desktopId);await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await page.locator('nav a[href="#registrations"]').click();
      await page.getByRole('button',{name:'Start desktop',exact:true}).click();
      await page.getByRole('button',{name:'Open desktop',exact:true}).first().waitFor();
      assert.equal(running.has(desktopId),true);
      const recovered=page.locator('#pending article').filter({hasText:'Synthetic · New account'});
      await recovered.getByText('Sign-in options',{exact:true}).click();
      page.once('dialog',(dialog:any)=>dialog.accept());
      await recovered.getByRole('button',{name:'Stop desktop',exact:true}).click();
      await recovered.getByRole('button',{name:'Start desktop',exact:true}).waitFor();
      assert.equal(running.has(desktopId),false);
      const blocked=await page.request.post(origin+'/api/registrations/start',{headers:{Origin:origin},data:{id:randomUUID(),desktopId}});
      assert.equal(blocked.status(),400,'browser cannot substitute a desktop ID');
      const unknown=await page.request.post(origin+'/api/registrations/start',{headers:{Origin:origin},data:{id:randomUUID()}});
      assert.equal(unknown.status(),404,'unknown registration cannot start a desktop');
    }
    if(pool==='premium'){
      const downgrade=await(await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:`Bearer ${tokens[1]}`}})).json();
      await page.goto(`${origin}/#ticket=${downgrade.ticket}&role=viewer`);
      await page.getByText('Read-only access',{exact:true}).waitFor();
      assert.equal(await page.locator('#new').isVisible(),false);
      assert.equal((await page.request.post(origin+'/api/registrations/prepare',{headers:{Origin:origin},data:{}})).status(),403,'downgrade revokes operator authority');
    }
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.getByText('You’re signed out',{exact:true}).waitFor();
    assert.equal((await page.request.get(origin+'/api/status')).status(),401);
    const expired=await browser.newContext();const expiredPage=await expired.newPage();
    await expiredPage.goto(`${origin}/#ticket=${ticket.ticket}&role=${role}`);
    await expiredPage.getByText('This connection could not be completed.',{exact:false}).waitFor();
    assert.equal(new URL(expiredPage.url()).hash,'');
    await expiredPage.screenshot({path:path.join(shots,`${pool}-expired.png`),fullPage:true});await expired.close();
    assert.deepEqual(errors,[]);await context.close();
  }
  await writeFile(path.join(shots,'verification.json'),JSON.stringify({fixture:'synthetic only',checks:report},null,2));console.log(`Two monitors: ${report.length} responsive/accessibility variants; filter, mutation, outage recovery, activation guard, registration, desktop recovery and session checks passed.`);
}finally{for(const monitor of monitors){await monitor.close();monitor.server.closeAllConnections();}await browser.close();await rm(directory,{recursive:true,force:true});}
