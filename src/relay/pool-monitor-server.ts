import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { MonitorSessions } from './monitor-sessions.js';
import { DesktopGateway } from './desktop-gateway.js';
import type { DesktopManager } from './desktop-manager.js';
import { CentralClient, bearer, equalSecret, exactKeys, failure, json } from './pool-protocol.js';
import { RequestError, readJsonBody } from './request-policy.js';

/** A fixed installation monitor. Operator and viewer cookies never grant the other monitor access. */
export function poolMonitor(deps:{operator:CentralClient;viewer:CentralClient;registrar:CentralClient;operatorToken:string;viewerToken:string;desktops:DesktopManager}) {
  const operator=new MonitorSessions(Date.now,'pool-operator'),viewer=new MonitorSessions(Date.now,'pool-viewer');
  const role=(req:http.IncomingMessage)=>operator.authorized(req)?'operator':viewer.authorized(req)?'viewer':undefined;
  const requireOperator=(req:http.IncomingMessage)=>{if(role(req)!=='operator')throw new RequestError(403,'operator_required','This action requires operator access.');};
  // The desktop gateway has another independent, short-lived browser session. Its account-changing endpoints are disabled below.
  const gateway=new DesktopGateway(deps.desktops,requireOperator,()=>[],()=>{throw Error('Use central account controls.');});
  const checkDesktop=(status:any,id:string,action:string)=>{
    const registration=status.registrations?.find((r:any)=>r.desktopId===id);
    if(!registration)throw new RequestError(404,'registration_not_found','Registration not found.');
    if(registration.removedAt&&action!=='stop')throw new RequestError(409,'registration_removed','This registration was removed. Use Registration to review it.');
  };
  const busy=new Set<string>();
  const server=http.createServer((req,res)=>void(async()=>{
    operator.origin(req);
    const route=new URL(req.url ?? '/','http://local').pathname;
    if(req.method==='GET'&&route==='/health/live')return json(res,200,{ok:true});
    if(req.method==='POST'&&route==='/session/ticket'){
      const key=bearer(req);const sessions=equalSecret(key,deps.operatorToken)?operator:equalSecret(key,deps.viewerToken)?viewer:undefined;
      if(!sessions)throw new RequestError(401,'unauthorized','Provide monitor authorization.');
      // Recheck central revocation before issuing each browser login.
      await (sessions===operator?deps.operator:deps.viewer).call('/operator/status');
      return json(res,200,{...sessions.issue(req),role:sessions===operator?'operator':'viewer'});
    }
    if(req.method==='POST'&&route==='/session'){
      const body=await readJsonBody(req,2048,3000);exactKeys(body,['ticket','role']);
      if(!['operator','viewer'].includes(body.role))throw new RequestError(400,'invalid_request','Invalid sign-in link.');
      const cookie=(body.role==='operator'?operator:viewer).exchange(req,body.ticket);
      res.setHeader('Set-Cookie',[cookie,(body.role==='operator'?viewer:operator).revoke(req)]);return json(res,200,{connected:true});
    }
    if(req.method==='DELETE'&&route==='/session'){
      res.setHeader('Set-Cookie',[operator.revoke(req),viewer.revoke(req)]);return json(res,200,{connected:false});
    }
    if(req.method==='GET'&&route==='/'){
      const asset=role(req)?'pool-monitor.html':'pool-monitor-login.html';
      const pool=deps.operator.identity.pool,name=pool==='premium'?'Premium':'Standard';
      const page=(await readFile(new URL(`./${asset}`,import.meta.url),'utf8')).replaceAll('__MONITOR_NAME__',name).replaceAll('__MONITOR_POOL__',pool);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(page);return;
    }
    if(route==='/assets/login.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(await readFile(new URL('./pool-monitor-login.js',import.meta.url)));return;}
    if(route==='/assets/access.css'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/css','Cache-Control':'no-store'});res.end(await readFile(new URL('./pool-monitor-access.css',import.meta.url)));return;}
    const access=role(req);if(!access)throw new RequestError(401,'session_required','Open a fresh sign-in link from the host.');
    const central=access==='operator'?deps.operator:deps.viewer;
    // All privileged routes verify the central principal on every request; no stale session can outlive revocation.
    const status=await central.call('/operator/status');
    const assets:Record<string,string>={'/assets/monitor.js':'pool-monitor.js','/assets/monitor-model.js':'pool-monitor-model.js','/assets/monitor.css':'pool-monitor.css','/assets/desktop.js':'pool-desktop.js'};
    if(req.method==='GET'&&Object.hasOwn(assets,route)){
      res.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript':'text/css','Cache-Control':'no-store'});res.end(await readFile(new URL('./'+assets[route],import.meta.url)));return;
    }
    if(req.method==='GET'&&route==='/api/status'){
      await deps.desktops.refresh();const desktopState=deps.desktops.snapshot();
      return json(res,200,{...status,role:access,desktops:desktopState.desktops.map(d=>({id:d.id,state:d.state,canConnect:d.canConnect,login:d.login})),desktopAvailable:desktopState.available});
    }
    requireOperator(req);
    if(req.method==='GET'&&route==='/desktops'){
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; img-src 'self' data: blob:; base-uri 'none'; frame-ancestors 'none'"});res.end(await readFile(new URL('./pool-desktop.html',import.meta.url)));return;
    }
    if(route.startsWith('/desktops')||route.startsWith('/api/desktops/')){
      const permitted=route.startsWith('/desktops')||['/api/desktops/access','/api/desktops/session','/api/desktops/state'].includes(route)||/^\/api\/desktops\/[a-f0-9-]+\/(launch|clipboard|signin|signin-cancel|start|stop)$/.test(route);
      if(!permitted)throw new RequestError(403,'central_action_required','Use the account controls in this monitor.');
      const desktopAction=/^\/api\/desktops\/([a-f0-9-]+)\/([^/]+)$/.exec(route);
      if(desktopAction)checkDesktop(status,desktopAction[1],desktopAction[2]);
      if(await gateway.route(req,res,new URL(req.url!,'http://local')))return;
    }
    if(req.method!=='POST'||req.headers.origin!==operator.origin(req))throw new RequestError(403,'origin_not_allowed','Use this monitor for account actions.');
    const body=await readJsonBody(req,4096,3000);
    if(route==='/api/accounts/action'||route==='/api/registrations/manage') {
      const account=route==='/api/accounts/action';
      exactKeys(body,['id',account?'accountId':'registrationId','expectedRevision','command','name']);
      const saved=await central.call(account?'/operator/set_account':'/operator/manage_registration',body);
      if(body.command==='remove'){
        gateway.disconnect(saved.desktopId);
        // Removal commits centrally first; a desktop stop failure must not masquerade as a failed revocation.
        try {
          await deps.desktops.refresh();
          const desktop=deps.desktops.snapshot().desktops.find(d=>d.id===saved.desktopId);
          if(desktop)await deps.desktops.action(saved.desktopId,'stop');
          return json(res,200,{...saved,desktopStopped:true});
        } catch { return json(res,200,{...saved,desktopStopped:false}); }
      }
      return json(res,200,saved);
    }
    if(route==='/api/registrations/prepare'){
      exactKeys(body,['id','desktopId','name']);const saved=await central.call('/operator/prepare',body);
      await deps.desktops.create({id:saved.desktopId,name:saved.name});return json(res,201,saved);
    }
    const registration=/^\/api\/registrations\/(connect|review|register|refresh|signin|desktop|start|stop)$/.exec(route);
    if(registration){
      exactKeys(body,['id']);const saved=await central.call('/operator/operation',{id:body.id});
      if(saved.removedAt&&registration[1]!=='stop')throw new RequestError(409,'registration_removed','This registration was removed. Restore it before continuing.');
      // An explicit retry after a lost connect response returns the already committed operation.
      if(registration[1]==='connect'&&saved.state==='registered')return json(res,200,{id:saved.id,state:'registered',accountId:saved.accountId,replayed:true});
      if(busy.has(saved.id))throw new RequestError(409,'action_in_progress','Wait for the current action to finish.');busy.add(saved.id);
      try {
        // Resolve the desktop through the centrally scoped registration, never a browser-supplied desktop ID.
        if(registration[1]==='start'||registration[1]==='stop'){await deps.desktops.action(saved.desktopId,registration[1]);return json(res,200,{saved:true});}
        const desktop=await deps.desktops.connection(saved.desktopId);
        if(registration[1]==='signin'){await deps.desktops.signIn(saved.desktopId,null,'device');return json(res,200,{opened:true});}
        if(registration[1]==='desktop')return json(res,200,{...gatewayTicket(req),desktopId:saved.desktopId});
        const ticket=await central.call('/operator/ticket',{id:saved.id,purpose:registration[1]});
        const files=await deps.desktops.driver.credentials!(saved.desktopId);
        if((await deps.desktops.connection(saved.desktopId)).containerId!==desktop.containerId)throw new RequestError(409,'desktop_changed','The desktop changed. Review its sign-in again.');
        return json(res,200,await deps.registrar.call(`/registrar/${registration[1]}`,{id:saved.id,ticket:ticket.ticket,files}));
      } finally {busy.delete(saved.id);}
    }
    throw new RequestError(404,'not_found','Not found.');
  })().catch(error=>{if(!res.headersSent)failure(res,error);else res.destroy();}));
  // Desktop access ticket is obtained through the existing gateway route in the browser.
  function gatewayTicket(_req:http.IncomingMessage){return {ready:true};}
  server.on('upgrade',(req,socket,head)=>void(async()=>{
    requireOperator(req);const status=await deps.operator.call('/operator/status');
    const desktop=/^\/api\/desktops\/([a-f0-9-]+)\/display$/.exec(new URL(req.url??'/','http://local').pathname);
    if(!desktop)throw new RequestError(404,'not_found','Not found.');
    checkDesktop(status,desktop[1],'display');await gateway.upgrade(req,socket,head);
  })().catch(()=>socket.destroy()));
  return {server,close:async()=>{server.close();await gateway.close();}};
}
