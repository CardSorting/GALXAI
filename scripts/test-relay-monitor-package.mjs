/** Verify the actual monitor image offline; every authority below is synthetic. */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const exec=promisify(execFile);
if(process.argv[2]!=='--inside') {
  const tag=process.env.GALX_RELAY_SERVICE_TAG??'candidate-20260915';
  const context=process.env.GALX_PREMIUM_DOCKER_CONTEXT??'desktop-linux';
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(tag)||!/^[a-zA-Z0-9_.-]+$/.test(context))throw Error('Invalid fixture target');
  const runId=randomUUID(),name='galx-monitor-package-'+runId;
  const docker=(args,options={})=>exec('docker',['--context',context,...args],{timeout:60000,maxBuffer:2097152,...options});
  try {
    const metadata=JSON.parse((await docker(['image','inspect','galxai-monitor-premium:'+tag])).stdout)[0];
    assert.equal(metadata.Config.User,'1000:1000');
    assert.equal(metadata.Config.Labels['io.galx.component'],'monitor');
    assert.equal(metadata.Config.Labels['io.galx.pool'],'premium');
    assert(metadata.Config.Env.every(v=>/^(PATH|NODE_VERSION|YARN_VERSION|NODE_ENV)=/.test(v)));
    const inputs=JSON.stringify({check:await readFile(fileURLToPath(import.meta.url),'utf8'),handoff:await readFile(new URL('./lib/relay-local-access.mjs',import.meta.url),'utf8')});
    assert(Buffer.byteLength(inputs)<1048576);
    // Pipe synthetic test code into bounded container tmpfs. The daemon may
    // deliberately have no workstation filesystem mounts (e.g. isolated Colima).
    const bootstrap="const fs=await import('node:fs');const inputs=JSON.parse(fs.readFileSync(0,'utf8'));fs.mkdirSync('/tmp/checks',{mode:448});fs.writeFileSync('/tmp/checks/check.mjs',inputs.check,{mode:384});fs.writeFileSync('/tmp/checks/handoff.mjs',inputs.handoff,{mode:384});process.argv=[process.execPath,'/tmp/checks/check.mjs','--inside'];await import('file:///tmp/checks/check.mjs');";
    const args=['run','--rm','-i','--name',name,'--label','galx.package.check='+runId,
      '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--pids-limit','128','--memory','512m','--memory-swap','512m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=16777216',
      '--tmpfs','/state:rw,nosuid,nodev,uid=1000,gid=1000,mode=0700,size=16777216',
      '--tmpfs','/run/secrets:rw,nosuid,nodev,uid=1000,gid=1000,mode=0700,size=1048576',
      '--env','DOCKER_HOST=unix:///tmp/fixture-docker.sock','--entrypoint','node',metadata.Id,'--input-type=module','-e',bootstrap];
    const result=await new Promise((resolve,reject)=>{
      const child=execFile('docker',['--context',context,...args],{timeout:60000,maxBuffer:2097152},(error,stdout,stderr)=>error?reject(error):resolve({stdout,stderr}));
      child.stdin.end(inputs);
    });
    console.log(JSON.stringify({image:metadata.Id,architecture:metadata.Architecture,...JSON.parse(result.stdout.trim())}));
  } finally {
    try {
      const c=JSON.parse((await docker(['inspect',name])).stdout)[0];
      if(c.Config.Labels['galx.package.check']!==runId)throw Error('Fixture ownership mismatch');
      await docker(['rm','--force',c.Id]);
    }catch(e){if(!/No such (object|container)/.test(e.stderr??''))throw e;}
  }
} else {
  let checks=0;
  const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
  const required=['component.json','desktop','desktop-activity.js','desktop-login.html','desktop-login.js',
    'desktop-organizer.css','desktop-organizer.js','desktops.html','desktops.js','entrypoint.mjs','node_modules',
    'package-lock.json','package.json','pool-desktop.html','pool-desktop.js','pool-monitor-access.css',
    'pool-monitor-login.html','pool-monitor-login.js','pool-monitor-model.js','pool-monitor.css','pool-monitor.html','pool-monitor.js','service.mjs'];
  equal((await readdir('/app')).sort(),required.sort(),'exact project artifact inventory');
  const manifest=JSON.parse(await readFile('/app/package.json','utf8'));
  const modules=await readdir('/app/node_modules');
  equal(modules.includes('broccoli-queue'),false,'build-only queue source omitted');
  equal(modules.includes('esbuild'),false,'build tool omitted');
  equal((await readdir('/app/node_modules/@noorm').catch(()=>[])).length,0,'build-only database source omitted');
  for(const entry of required.filter(v=>/\.(mjs|js|json|html|css)$/.test(v))) {
    const value=await readFile('/app/'+entry,'utf8');
    assert(!value.includes('/Users/')&&!value.includes('/home/bozoegg')&&!value.includes('post-mortem/'),'developer/private path in '+entry);checks++;
  }
  const cli=(await exec('docker',['--version'])).stdout.trim();
  assert(cli.startsWith('Docker version 29.5.3,'));checks++;
  const installationId=randomUUID(),epoch=randomUUID(),now=()=>new Date().toISOString();
  const tokens=Object.fromEntries(['operator','viewer','registrar'].map(role=>[role,randomBytes(32).toString('hex')]));
  const privateMarker='private-fixture-'+randomUUID();
  let revoked=false,controlUnavailable=false;
  const controlCalls=[],dockerCalls=[];
  const rawStatus=()=>({pool:'premium',installationId,epoch,lastSeenAt:now(),registrationAllowed:true,
    executionAllowed:true,automaticActivation:true,providerApiKey:privateMarker,centralOrigin:privateMarker,
    accounts:[{id:'fixture-account',name:'Fixture account',state:'enabled',revision:1,acknowledgedRevision:1,
      acknowledgedEpoch:epoch,credentialExpiresAt:Date.now()+3600000,connectionState:'connected',
      connectionCheckedAt:now(),updatedAt:now(),models:['fixture-model'],healthSignal:'none',
      consecutiveFailures:0,encrypted_ciphertext:privateMarker,providerAccount:privateMarker}],
    registrations:[],activity:[],diagnostics:{secret:privateMarker}});
  const central=http.createServer(async(req,res)=>{
    if(controlUnavailable){req.socket.destroy();return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const input=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    const role=Object.keys(tokens).find(k=>req.headers.authorization==='Bearer '+tokens[k]);
    controlCalls.push({route:req.url,fields:Object.keys(input).sort(),role});
    if(revoked||!['operator','viewer'].includes(role)||input.pool!=='premium'||input.installationId!==installationId){
      res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:{code:'unauthorized',raw:privateMarker}}));
    }
    if(req.url!=='/operator/status'){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rawStatus()));
  });
  const daemon=http.createServer((req,res)=>{
    dockerCalls.push(req.url);res.setHeader('Content-Type','application/json');
    if(req.url==='/_ping'){res.setHeader('API-Version','1.54');return res.end('OK');}
    if(req.url==='/version')return res.end(JSON.stringify({ApiVersion:'1.54',MinAPIVersion:'1.44',Version:'29.5.3'}));
    if(req.url.includes('/containers/json'))return res.end('[]');
    if(req.url.includes('/images/fixture-desktop/json'))return res.end(JSON.stringify({Id:'sha256:'+'1'.repeat(64)}));
    res.writeHead(404);res.end('{}');
  });
  await new Promise(resolve=>central.listen(17780,'127.0.0.1',resolve));
  await new Promise(resolve=>daemon.listen('/tmp/fixture-docker.sock',resolve));
  await writeFile('/run/secrets/component-config',JSON.stringify({pool:'premium',installationId,
    centralOrigin:'http://127.0.0.1:17780',operatorToken:tokens.operator,viewerToken:tokens.viewer,
    registrarToken:tokens.registrar,desktopImage:'fixture-desktop'}),{mode:0o600});
  let child,logs='';
  const origin='http://127.0.0.1:13311';
  const startMonitor=async()=>{
    child=spawn(process.execPath,['/app/entrypoint.mjs'],{stdio:['ignore','pipe','pipe'],env:process.env});
    child.stdout.on('data',v=>{logs+=v;});child.stderr.on('data',v=>{logs+=v;});
    for(let i=0;i<100;i++){
      try{if((await fetch(origin+'/health/live')).status===200)return;}catch{}
      if(child.exitCode!==null)throw Error('Packaged startup failed');
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw Error('Packaged monitor unavailable');
  };
  const killMonitor=async()=>{
    assert(child&&child.exitCode===null);
    const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;
  };
  try {
    // This is the image's real startup script, not a substituted monitor module.
    await startMonitor();equal(true,true,'actual packaged entrypoint starts');
    const secrets=[...Object.values(tokens),privateMarker,installationId,epoch];
    const clean=async(response)=>{
      const body=await response.text(),headers=JSON.stringify([...response.headers]);
      for(const secret of secrets)assert(!body.includes(secret)&&!headers.includes(secret),'private response leak');checks++;
      return {status:response.status,body};
    };
    equal((await clean(await fetch(origin+'/api/status'))).status,401,'anonymous status denied');
    equal((await clean(await fetch(origin+'/assets/monitor.js'))).status,401,'anonymous asset denied');
    const cookies={};
    for(const role of ['operator','viewer']){
      const ticket=await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:'Bearer '+tokens[role]}});
      equal(ticket.status,200,'private host ticket '+role);
      const issued=await ticket.json();
      const exchange=await fetch(origin+'/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({role,ticket:issued.ticket})});
      equal(exchange.status,200,'browser exchange '+role);
      cookies[role]=exchange.headers.getSetCookie().find(v=>v.startsWith('galx_pool-'+role+'_')).split(';')[0];
      await clean(exchange);
    }
    const reply=await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}));
    equal(reply.status,200,'authorized monitor operational');
    const state=JSON.parse(reply.body);
    equal(Object.keys(state).sort(),['pool','registrationAllowed','executionAllowed','automaticActivation','relayFresh','accounts','registrations','activity','role','desktops','desktopAvailable'].sort(),'browser allowlist');
    equal(state.desktopAvailable,true,'packaged CLI reaches scoped synthetic daemon');
    equal(state.relayFresh,true,'current scoped control state');
    equal(state.accounts[0].applied,true,'saved account acknowledged');
    const model=await import('/app/pool-monitor-model.js');
    equal(model.accountHealth(state.accounts[0],state).code,'unknown','packaged unknown remains neutral');
    for(const route of ['/','/assets/monitor.js','/assets/monitor-model.js','/assets/monitor.css','/assets/desktop.js','/desktops'])
      equal((await clean(await fetch(origin+route,{headers:{Cookie:cookies.operator}}))).status,200,'packaged resource '+route);
    for(const route of ['/operator/status','/service.mjs','/run/secrets/component-config'])
      equal((await clean(await fetch(origin+route,{headers:{Cookie:cookies.operator}}))).status,403,'private path inaccessible '+route);
    equal((await clean(await fetch(origin+'/api/accounts/action',{method:'POST',headers:{Cookie:cookies.viewer,Origin:origin,'Content-Type':'application/json'},body:'{}'}))).status,403,'viewer mutation denied');
    equal((await clean(await fetch(origin+'/api/accounts/action',{method:'POST',headers:{Cookie:cookies.operator,Origin:'https://hostile.invalid','Content-Type':'application/json'},body:'{}'}))).status,403,'foreign origin denied');
    // The unchanged host handoff helper consumes just the fixed private fields.
    const {monitorHandoff}=await import(new URL('./handoff.mjs',import.meta.url));
    let privateFields;
    const deadline=await monitorHandoff('premium',{pool:'premium',installationId},async()=>{
      const c=JSON.parse(await readFile('/run/secrets/component-config','utf8'));
      const r=await fetch(c.centralOrigin+'/operator/status',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+c.operatorToken,'Content-Type':'application/json'},body:JSON.stringify({pool:c.pool,installationId:c.installationId})});
      assert(r.ok);const s=await r.json();const evidence={pool:s.pool,installationId:s.installationId,lastSeenAt:s.lastSeenAt};
      privateFields=Object.keys(evidence).sort();return evidence;
    });
    assert(deadline>Date.now()&&deadline<=Date.now()+61000);checks++;
    equal(privateFields,['installationId','lastSeenAt','pool'],'private ownership allowlist');
    // All process/network faults below stay inside this offline package fixture.
    controlUnavailable=true;
    const unavailable=await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}));
    assert([502,503].includes(unavailable.status),'control loss must not serve stale authority');checks++;
    controlUnavailable=false;
    equal((await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}))).status,200,'control connectivity recovers');
    const recoveryStarted=performance.now();await killMonitor();await startMonitor();
    equal((await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}))).status,401,'process restart invalidates ephemeral browser session');
    const freshTicket=await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:'Bearer '+tokens.operator}});
    equal(freshTicket.status,200,'unchanged private credential obtains fresh ticket after restart');
    const freshExchange=await fetch(origin+'/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({role:'operator',ticket:(await freshTicket.json()).ticket})});
    equal(freshExchange.status,200,'new browser session after monitor death');
    cookies.operator=freshExchange.headers.getSetCookie().find(v=>v.startsWith('galx_pool-operator_')).split(';')[0];await clean(freshExchange);
    const recovered=await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}));
    equal(recovered.status,200,'monitor status recovered after process death');
    equal(JSON.parse(recovered.body).accounts[0].applied,true,'private ownership acknowledgement survives monitor death');
    const monitorRecoveryMs=Math.round(performance.now()-recoveryStarted);
    revoked=true;
    equal((await clean(await fetch(origin+'/api/status',{headers:{Cookie:cookies.operator}}))).status,403,'revoked control authority not served from cache');
    equal((await clean(await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:'Bearer '+tokens.operator}}))).status,403,'ticket cannot restore revoked control authority');
    await killMonitor();await startMonitor();
    equal((await clean(await fetch(origin+'/session/ticket',{method:'POST',headers:{Authorization:'Bearer '+tokens.operator}}))).status,403,'monitor restart cannot restore revoked control authority');
    equal([...new Set(controlCalls.map(v=>v.route))],['/operator/status'],'only required scoped control route');
    assert(controlCalls.every(v=>JSON.stringify(v.fields)===JSON.stringify(['installationId','pool'])));checks++;
    assert(dockerCalls.every(v=>v==='/_ping'||v==='/version'||v.includes('/containers/json')||v.includes('/images/fixture-desktop/json')));checks++;
    for(const secret of secrets)assert(!logs.includes(secret));checks++;
    console.log(JSON.stringify({checks,cli,entrypointStarted:true,monitorRecoveryMs,processDeathRecovered:true,controlLossFailClosed:true,revocationSurvivesRestart:true,browserFields:Object.keys(state).sort(),
      privateOwnershipFields:privateFields,controlRoutes:[...new Set(controlCalls.map(v=>v.route))],
      projectFiles:required,productionDependencies:Object.keys(manifest.dependencies),network:'none; synthetic loopback control and Unix daemon only'}));
  } finally {
    if(child&&child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});
    }
    central.closeAllConnections();daemon.closeAllConnections();
    await Promise.all([new Promise(resolve=>central.close(resolve)),new Promise(resolve=>daemon.close(resolve))]);
  }
}
