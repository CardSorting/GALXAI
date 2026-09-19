import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { MonitorSessions } from './monitor-sessions.js';
import { DesktopGateway } from './desktop-gateway.js';
import type { DesktopManager } from './desktop-manager.js';
import { CentralClient, bearer, equalSecret, exactKeys, failure, json } from './pool-protocol.js';
import { RequestError, readJsonBody } from './request-policy.js';

const text = (value: unknown, max = 256) => typeof value === 'string' && value.length <= max ? value : undefined;
const integer = (value: unknown) => Number.isSafeInteger(value) ? value as number : undefined;
const dateText = (value: unknown) => text(value, 80);
const models = (value: unknown) => Array.isArray(value) ? value.filter((model): model is string => typeof model === 'string' && model.length <= 128).slice(0, 512) : [];
const state = (value: unknown, allowed: readonly string[], fallback: string) => typeof value === 'string' && allowed.includes(value) ? value : fallback;

/**
 * The browser monitor gets a deliberately small, product-shaped contract.
 * Central identity, epoch, credential revisions, tickets and arbitrary upstream
 * fields stay server-side even though the monitor is local-only.
 */
function monitorStatus(current: Record<string, any>, access: 'operator' | 'viewer', desktopState: any) {
  const epoch = text(current.epoch, 128);
  const accounts = (Array.isArray(current.accounts) ? current.accounts : []).map((account: any) => {
    const id = text(account?.id, 128);
    if (!id) return undefined;
    return {
      id, desktopId: text(account.desktopId, 128), name: text(account.name, 128) ?? 'Account',
      state: state(account.state, ['enabled', 'paused', 'revoked'], 'paused'), revision: integer(account.revision) ?? 0,
      applied: !!epoch && account.acknowledgedRevision === account.revision && account.acknowledgedEpoch === epoch,
      acknowledgedAt: dateText(account.acknowledgedAt), models: models(account.models),
      accountClass: account.accountClass === 'paid' || account.accountClass === 'free' ? account.accountClass : undefined,
      credentialExpiresAt: Number.isFinite(Number(account.credentialExpiresAt)) ? Number(account.credentialExpiresAt) : undefined,
      removedAt: dateText(account.removedAt), updatedAt: dateText(account.updatedAt),
      cooldownUntilMs: Number.isFinite(Number(account.cooldownUntilMs)) ? Number(account.cooldownUntilMs) : undefined,
      consecutiveFailures: Number.isSafeInteger(account.consecutiveFailures) ? account.consecutiveFailures : undefined,
      healthSignal: account.healthSignal === 'unavailable' || account.healthSignal === 'cooldown' ? account.healthSignal : undefined,
      connectionState: account.connectionState === 'connected' || account.connectionState === 'sign_in_required' ? account.connectionState : undefined,
      connectionCheckedAt: dateText(account.connectionCheckedAt),
    };
  }).filter(Boolean);
  const registrations = (Array.isArray(current.registrations) ? current.registrations : []).map((registration: any) => {
    const id = text(registration?.id, 128);
    if (!id) return undefined;
    return {
      id, desktopId: text(registration.desktopId, 128), name: text(registration.name, 128) ?? 'Connection',
      state: state(registration.state, ['prepared', 'reviewed', 'registered'], 'prepared'), accountId: text(registration.accountId, 128),
      accountClass: registration.accountClass === 'paid' || registration.accountClass === 'free' ? registration.accountClass : undefined,
      models: models(registration.models), updatedAt: dateText(registration.updatedAt), revision: integer(registration.revision) ?? 0,
      removedAt: dateText(registration.removedAt),
    };
  }).filter(Boolean);
  const activity = (Array.isArray(current.activity) ? current.activity : []).slice(0, 100).map((event: any) => ({
    accountId: text(event?.accountId, 128), name: text(event?.name, 128),
    command: state(event?.command, ['enabled', 'paused', 'revoked', 'rename', 'remove', 'restore'], 'change'), at: dateText(event?.at),
  }));
  const desktops = (Array.isArray(desktopState?.desktops) ? desktopState.desktops : []).map((desktop: any) => {
    const id = text(desktop?.id, 128);
    if (!id) return undefined;
    return { id, state: state(desktop.state, ['running', 'stopped', 'starting', 'creating', 'stopping', 'deleting', 'queued', 'unhealthy', 'missing', 'error', 'unknown'], 'unknown'),
      canConnect: desktop.canConnect === true, login: { state: state(desktop.login?.state, ['idle', 'starting', 'waiting', 'saved', 'failed', 'expired', 'cancelled', 'unavailable'], 'unavailable') } };
  }).filter(Boolean);
  return {
    pool: current.pool === 'premium' ? 'premium' : 'standard', registrationAllowed: current.registrationAllowed === true,
    executionAllowed: current.executionAllowed === true, automaticActivation: current.automaticActivation === true,
    relayFresh: (() => { const seen = Date.parse(String(current.lastSeenAt ?? '')); const age = Date.now() - seen; return Number.isFinite(age) && age >= 0 && age < 45000; })(),
    accounts, registrations, activity, role: access, desktops, desktopAvailable: desktopState?.available === true,
  };
}

function publicRegistrationResult(result: Record<string, any>, action: string) {
  if (action === 'start' || action === 'stop') return { saved: true };
  if (action === 'signin') return { opened: true };
  if (action === 'desktop') return { ready: true };
  return {
    state: state(result.state, ['prepared', 'reviewed', 'registered'], 'prepared'),
    accountId: text(result.accountId, 128), accountClass: result.accountClass === 'paid' || result.accountClass === 'free' ? result.accountClass : undefined,
    models: models(result.models), replayed: result.replayed === true,
  };
}

function publicManagementResult(result: Record<string, any>, desktopStopped?: boolean) {
  return { removedAt: dateText(result.removedAt), replayed: result.replayed === true, ...(desktopStopped === undefined ? {} : { desktopStopped }) };
}

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
  // Coalesce duplicate requests for the same persisted operation. This is the
  // familiar single-flight pattern: a double click, a second browser tab, or a
  // retry after a lost response shares one server-side mutation instead of
  // competing for the same desktop and credential record.
  const busy=new Map<string,string>();
  const operationFlights=new Map<string,Promise<unknown>>();
  const statusFlights=new Map<'operator'|'viewer',Promise<any>>();
  const readStatus=(access:'operator'|'viewer',central:CentralClient)=>{
    const existing=statusFlights.get(access);if(existing)return existing;
    const flight=(async()=>{
      const current=await central.call('/operator/status');
      await deps.desktops.refresh();
      const desktopState=deps.desktops.snapshot();
      return monitorStatus(current,access,desktopState);
    })().finally(()=>{if(statusFlights.get(access)===flight)statusFlights.delete(access);});
    statusFlights.set(access,flight);return flight;
  };
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
    const status=await readStatus(access,central);
    const assets:Record<string,string>={'/assets/monitor.js':'pool-monitor.js','/assets/monitor-model.js':'pool-monitor-model.js','/assets/monitor.css':'pool-monitor.css','/assets/desktop.js':'pool-desktop.js'};
    if(req.method==='GET'&&Object.hasOwn(assets,route)){
      res.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript':'text/css','Cache-Control':'no-store'});res.end(await readFile(new URL('./'+assets[route],import.meta.url)));return;
    }
    if(req.method==='GET'&&route==='/api/status'){
      return json(res,200,status);
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
          return json(res,200,publicManagementResult(saved,true));
        } catch { return json(res,200,publicManagementResult(saved,false)); }
      }
      return json(res,200,publicManagementResult(saved));
    }
    if(route==='/api/registrations/prepare'){
      exactKeys(body,['id','desktopId','name']);const saved=await central.call('/operator/prepare',body);
      await deps.desktops.create({id:saved.desktopId,name:saved.name});return json(res,201,publicRegistrationResult(saved,'prepare'));
    }
    const registration=/^\/api\/registrations\/(connect|review|register|refresh|signin|desktop|start|stop)$/.exec(route);
    if(registration){
      exactKeys(body,['id']);const saved=await central.call('/operator/operation',{id:body.id});
      if(saved.removedAt&&registration[1]!=='stop')throw new RequestError(409,'registration_removed','This registration was removed. Restore it before continuing.');
      // An explicit retry after a lost connect response returns the already committed operation.
      if(registration[1]==='connect'&&saved.state==='registered')return json(res,200,publicRegistrationResult({...saved,replayed:true},'connect'));
      const action=registration[1],current=busy.get(saved.id),existing=operationFlights.get(saved.id);
      if(current&&current!==action)throw new RequestError(409,'action_in_progress','Another connection action is already in progress. Refresh this connection to see its result.');
      if(existing)return json(res,200,await existing);
      busy.set(saved.id,action);
      const operation=(async()=>{
        // Resolve the desktop through the centrally scoped registration, never a browser-supplied desktop ID.
        if(action==='start'||action==='stop'){await deps.desktops.action(saved.desktopId,action);return {saved:true};}
        if(action==='signin'){await deps.desktops.signIn(saved.desktopId,null,'device');return {opened:true};}
        if(action==='desktop')return {...gatewayTicket(req),desktopId:saved.desktopId};
        const ticket=await central.call('/operator/ticket',{id:saved.id,purpose:action});
        const credentials=await deps.desktops.credentials(saved.desktopId);
        const result=await deps.registrar.call(`/registrar/${action}`,{id:saved.id,ticket:ticket.ticket,files:credentials.files});
        return publicRegistrationResult(result,action);
      })();
      operationFlights.set(saved.id,operation);
      try { return json(res,200,await operation); }
      finally { if(operationFlights.get(saved.id)===operation)operationFlights.delete(saved.id);if(busy.get(saved.id)===action)busy.delete(saved.id); }
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
