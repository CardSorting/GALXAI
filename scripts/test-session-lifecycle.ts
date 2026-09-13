import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { GET as profile, DELETE as logout } from '../src/app/api/auth/session/route';
import { GET as devices, DELETE as others } from '../src/app/api/auth/sessions/route';
import { DELETE as removeDevice } from '../src/app/api/auth/sessions/[id]/route';
import { POST as elevate } from '../src/app/api/auth/sudo/elevate/route';
import { POST as revoke } from '../src/app/api/auth/oauth/revoke/route';
import { POST as introspect } from '../src/app/api/auth/oauth/introspect/route';
import { POST as restricted } from '../src/app/api/auth/tokens/restricted/route';
import { POST as connect } from '../src/app/api/auth/openai/route';
import { POST as ingest } from '../src/app/api/auth/ingest/route';
import { POST as refresh } from '../src/app/api/auth/oauth/refresh/route';
import { GET as activity } from '../src/app/api/auth/audit/activity/route';
import { GET as posture } from '../src/app/api/auth/security/posture/route';
import { POST as rewrap } from '../src/app/api/auth/vault/re-wrap/route';
import { GET as jwks } from '../src/app/api/auth/vault/jwks/route';
import { requireAccountIdentity } from '../src/lib/auth/accountIdentity';
import { getSupabaseAuthClient, resetSupabaseClients } from '../src/lib/supabase/client';
import { SessionRequestFence, readSessionProfile, logoutState, rememberOwner, OWNER_HINT_KEY } from '../src/lib/auth/browser-session';
import { OAuthRepository } from '../src/lib/supabase/repositories/OAuthRepository';
import { providerConnectionDTO } from '../src/lib/auth/provider-connection-route';
import { SessionAccessError } from '../src/lib/auth/session-http';
import { verifyWorkspaceSession } from '../src/lib/auth/workspace-session';
import { GalxInternalAuthGuard } from '../src/core/auth/GalxInternalAuthGuard';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
process.env.GALX_INTERNAL_ADMIN_KEY = randomBytes(32).toString('hex');
const key = process.env.GALX_INTERNAL_ADMIN_KEY;
const sentinel = 'PRIVATE_SESSION_DIAGNOSTIC';
const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: 'user-a', exp: 4102444800 })).toString('base64url')}.fixture`;
const req = (method = 'GET', token?: string, body?: unknown, extra: Record<string,string> = {}) => new NextRequest('https://galx.ai/api/auth/session', {
  method, headers: { 'x-galx-internal-key': key, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}),
});
const native = (sub = 'user-a', id = 'sess_a', extra = {}) => ({ valid: true, claims: { sub, accountVerified: true, scopes: ['*'], exp: Date.now() + 60000, email: 'verified@example.test', name: 'Verified', shardId: sentinel, ...extra }, session: { id, userId: sub, scopes: ['*'], expiresAtMs: Date.now() + 60000, shardId: sentinel } });
const clean = async (response: Response, status: number) => { assert.equal(response.status, status); assert.match(response.headers.get('cache-control') || '', /private.*no-store/); const raw = await response.text(); assert(!raw.includes(sentinel)); return JSON.parse(raw); };

test('copied JWTs fail immediately after logout across profile, workspace and API authority while other sessions continue', async () => {
  const original = globalThis.fetch;
  const revoked = new Set<string>(); let unavailable = false, ignoreLogout = false, malformed = false;
  const engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  globalThis.fetch = async (input, init) => {
    const url = String(input), credential = new Headers(init?.headers).get('authorization')!;
    assert(init?.signal);
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'user-a', email: 'a@example.test', email_confirmed_at: '2026-09-13' });
    if (url.includes('/auth/v1/logout')) { assert(url.includes('scope=local')); if (!ignoreLogout) revoked.add(credential); return new Response(null, { status: 204 }); }
    assert(url.endsWith('/fn_account_session_active')); assert.equal(init?.cache, 'no-store');
    assert.equal(init?.body, '{}'); assert.equal(new Headers(init?.headers).get('apikey'), 'sb_publishable_fixture');
    if (unavailable) return Response.json({ error: sentinel }, { status: 503 });
    return Response.json(malformed ? { active: true, diagnostic: sentinel } : !revoked.has(credential));
  };
  resetSupabaseClients();
  try {
    await clean(await profile(req('GET', jwt)), 200);
    ignoreLogout = true; await clean(await logout(req('DELETE', jwt)), 503); ignoreLogout = false;
    await clean(await logout(req('DELETE', jwt)), 200);
    for (let attempt = 0; attempt < 2; attempt++) {
      await clean(await profile(req('GET', jwt)), 401);
      assert.equal(await verifyWorkspaceSession({ getAll: () => [{ name: 'galx_session', value: jwt }] }), 'unauthenticated');
      assert.equal((await engine.resolveAuthIdentity(req('GET', jwt))).authenticated, false);
      await assert.rejects(requireAccountIdentity(req('GET', jwt)), SessionAccessError);
    }
    const other = jwt + 'other'; await clean(await profile(req('GET', other)), 200);
    unavailable = true;
    await clean(await profile(req('GET', other)), 503);
    assert.equal(await verifyWorkspaceSession({ getAll: () => [{ name: 'galx_session', value: other }] }), 'unavailable');
    assert.equal((await engine.resolveAuthIdentity(req('GET', other))).error, 'AUTH_UNAVAILABLE');
    unavailable = false; malformed = true; await clean(await profile(req('GET', other)), 503);
    malformed = false; await clean(await profile(req('GET', other)), 200);
  } finally { globalThis.fetch = original; resetSupabaseClients(); }
});

test('internal administration rejects legacy secrets and account metadata, and canonical cookie failure cannot fall back to a native alias', async () => {
  const guard = GalxInternalAuthGuard.getInstance(), engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  const oldSecret = 'galxai-internal-training-admin-secret-key-32b';
  const make = (headers: Record<string,string>) => new NextRequest('https://galx.ai/api/internal/training', { headers });
  for (const headers of [{}, { 'x-galx-internal-key': oldSecret }, { authorization: `Bearer ${key}` }, { cookie: 'sb-auth-auth-token=invalid; galx_session=galx_sess_fixture', 'x-user-role': 'admin' }]) {
    const result = await guard.verifyInternalRequest(make(headers)); assert.equal(result.authorized, false);
    const body = await guard.createUnauthorizedResponse(result).text(); assert(!body.includes('training')); assert(!body.includes('documentation'));
  }
  assert.equal((await guard.verifyInternalRequest(make({ 'x-galx-internal-key': key }))).authorized, true);
  engine.verifySession = async () => { throw new Error('Native fallback must not be reached'); };
  for (const cookie of ['sb-auth-auth-token=invalid; galx_session=galx_sess_fixture', 'sb-auth-auth-token.1=orphan; galx_session=galx_sess_fixture']) assert.equal((await engine.resolveAuthIdentity(make({ cookie }))).authenticated, false);
});

test('session endpoints reject anonymous credentials, IDs, API keys and forged authority before any session mutation', async () => {
  const original = GalxAuthEngine.getInstance;
  GalxAuthEngine.getInstance = () => { throw new Error('No session storage should be reached'); };
  try {
    for (const token of [undefined, 'sess_victim', '00000000-0000-4000-8000-000000000001', 'galx_key_fake', 'sso_saml_bearer_fake']) {
      await clean(await profile(req('GET', token)), 401);
      await clean(await logout(req('DELETE', token, undefined, { origin: 'https://galx.ai' })), 401);
      for (const handler of [elevate, revoke, introspect, restricted, connect, ingest]) await clean(await handler(req('POST', token, { token: 'sess_victim' }, { origin: 'https://galx.ai' })), 401);
    }
  } finally { GalxAuthEngine.getInstance = original; }
});

test('native profile requires provenance, full account scope and matching database owner; credentials and claims never enter its DTO', async () => {
  const original = GalxAuthEngine.getInstance;
  let value: any = native();
  GalxAuthEngine.getInstance = () => ({ verifySession: async () => value }) as any;
  try {
    const result = await clean(await profile(req('GET', 'galx_sess_fixture')), 200);
    assert.deepEqual(result, { valid: true, user: { id: 'user-a', email: 'verified@example.test', name: 'Verified' } });
    for (const invalid of [{ ...native(), valid: false }, native('user-a', 'sess_a', { accountVerified: false }), native('user-a', 'sess_sub_a'), { ...native(), session: { ...native().session, userId: 'user-b' } }, { ...native(), session: { ...native().session, scopes: ['images:*'] } }]) {
      value = invalid; await clean(await profile(req('GET', 'galx_sess_fixture')), 401);
    }
    value = native();
    await assert.rejects(requireAccountIdentity(req('GET', 'galx_sess_fixture')), /Sign in/);
    await clean(await profile(req('GET', 'galx_sess_fixture', undefined, { cookie: 'galx_logout_pending=1' })), 401);
  } finally { GalxAuthEngine.getInstance = original; }
});

test('browser logout requires same-origin intent, revokes the verified owner, clears all cookie chunks, and keeps failure retryable', async () => {
  const original = GalxAuthEngine.getInstance;
  const mutations: unknown[] = []; let fails = false;
  GalxAuthEngine.getInstance = () => ({ verifySession: async () => native(), revokeSessionById: async (...args: any[]) => { mutations.push(args); if (fails) throw new Error(sentinel); return true; } }) as any;
  try {
    const cookies = { cookie: 'galx_session=galx_sess_fixture' };
    for (const headers of [{}, { origin: 'https://evil.test' }, { origin: 'null' }, { origin: 'https://galx.ai', 'sec-fetch-site': 'same-site' }]) await clean(await logout(req('DELETE', undefined, undefined, { ...cookies, ...headers })), 403);
    assert.equal(mutations.length, 0);
    await clean(await logout(req('DELETE', undefined, undefined, { ...cookies, origin: 'https://galx.ai' })), 200);
    assert.deepEqual(mutations, [['sess_a', 'user-a']]);
    fails = true;
    const failed = await logout(req('DELETE', 'galx_sess_fixture'));
    assert.equal(failed.headers.get('set-cookie'), null); await clean(failed, 503);
    const invalid = await logout(req('DELETE', 'invalid', undefined, { origin: 'https://galx.ai', cookie: 'sb-test-auth-token.0=one; sb-test-auth-token.1=two; sb-test-auth-token-code-verifier=three; galx_logout_pending=1' }));
    assert.match(invalid.headers.get('set-cookie') || '', /sb-test-auth-token\.0=;/); assert.match(invalid.headers.get('set-cookie') || '', /sb-test-auth-token\.1=;/); await clean(invalid, 401);
  } finally { GalxAuthEngine.getInstance = original; }
});

test('Supabase session verification rejects anonymous users, separates outages, and signs out only the current session', async () => {
  const original = globalThis.fetch; let status = 200, anonymous = false, active = true; const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    if (url.endsWith('/fn_account_session_active')) return Response.json(active); assert(init?.signal); assert.equal(init?.cache, 'no-store');
    return new Response(JSON.stringify(status === 200 ? { id: 'user-a', email: 'verified@example.test', email_confirmed_at: '2026-09-13', is_anonymous: anonymous, user_metadata: { name: 'Verified', role: 'owner', token: sentinel }, app_metadata: { internal: sentinel } } : { code: 'failure', msg: sentinel }), { status, headers: { 'Content-Type': 'application/json' } });
  };
  resetSupabaseClients(); const auth = getSupabaseAuthClient().auth.admin, signOut = auth.signOut; const revoked: unknown[] = [];
  auth.signOut = async (...args: any[]) => { revoked.push(args); active = false; return { data: null, error: null } as any; };
  try {
    const result = await clean(await profile(req('GET', jwt)), 200); assert.equal(result.user.id, 'user-a'); assert.equal(result.user.role, undefined);
    assert.equal((await requireAccountIdentity(req('GET', jwt))).id, 'user-a');
    await clean(await logout(req('DELETE', jwt)), 200); assert.deepEqual(revoked, [[jwt, 'local']]);
    anonymous = true; await clean(await profile(req('GET', jwt)), 401); anonymous = false;
    for (status of [429,503]) await clean(await profile(req('GET', jwt)), 503);
    status = 401; await clean(await profile(req('GET', jwt)), 401);
    assert(calls.length > 3);
  } finally { globalThis.fetch = original; auth.signOut = signOut; resetSupabaseClients(); }
});

test('session management allowlists devices and cannot revoke another account or elevate without new proof', async () => {
  const original = GalxAuthEngine.getInstance; const changes: any[] = [];
  const engine = { verifySession: async (token: string) => token.endsWith('foreign') ? native('user-b', 'sess_b') : native(),
    getUserActiveSessions: async () => [{ ...native().session, browser: 'Safari', os: 'macOS', riskScore: 99, token: sentinel }],
    revokeSessionById: async (id: string, owner: string) => { changes.push([id,owner]); return id === 'sess_a' && owner === 'user-a'; },
    revokeOtherSessions: async (...args: any[]) => { changes.push(args); return 2; },
    elevateSessionSudo: () => { throw new Error('Elevation must not be called'); } };
  GalxAuthEngine.getInstance = () => engine as any;
  try {
    const body = await clean(await devices(req('GET', 'galx_sess_fixture')), 200); assert.equal(body.sessions[0].riskScore, undefined); assert.equal(body.sessions[0].userId, undefined);
    await clean(await removeDevice(req('DELETE','galx_sess_fixture'), { params: Promise.resolve({ id: 'sess_b' }) }), 404);
    await clean(await others(req('DELETE','galx_sess_fixture')), 200);
    assert.deepEqual(changes, [['sess_b','user-a'], ['user-a','sess_a']]); changes.length = 0;
    for (const target of ['sess_b','galx_sess_foreign']) { await clean(await revoke(req('POST','galx_sess_fixture',{ token: target })),200); assert.deepEqual(await clean(await introspect(req('POST','galx_sess_fixture',{token:target})),200),{active:false}); }
    assert.deepEqual(changes, []);
    await clean(await elevate(req('POST','galx_sess_fixture',{ durationMs: 999999999, password: 'fake' })),403);
    await clean(await restricted(req('POST','galx_sess_fixture',{ scopes: ['*'], ttlMs: -1 })),400);
    await clean(await restricted(req('POST','galx_sess_fixture',{ scopes: [{ toString: 'admin:*' }] })),400);
    const r = await clean(await introspect(req('POST','galx_sess_fixture',{token:'galx_sess_fixture'})),200); assert.equal(r.active,true); assert.equal(r.shardId,undefined);
  } finally { GalxAuthEngine.getInstance = original; }
});

test('engine revocation rejects plain IDs and verifies session ownership and account provenance', async () => {
  const engine: any = Object.create(GalxAuthEngine.prototype); const original = GalxCryptoVault.verifySessionToken;
  let claims: any = { sub:'user-a', accountVerified:true }; let userId = 'user-a'; let lookups = 0;
  GalxCryptoVault.verifySessionToken = () => ({ valid:true,claims }) as any;
  engine.sessionRepo = { findSessionByTokenHash: async () => { lookups++; return { id:'sess_a', userId, tokenHash: GalxCryptoVault.hashSessionToken('galx_sess_fixture'), expiresAtMs: Date.now()+60000 }; }, touchSession: async () => {}, findSessionById: async () => ({userId:'user-a'}), revokeSession: async () => {} };
  engine.persistence = { logAudit: () => {} };
  try {
    assert.equal(await engine.revokeSession('sess_a'),false); assert.equal(lookups,0);
    assert.equal((await engine.verifySession('galx_sess_fixture',false)).valid,true);
    userId='user-b'; assert.equal((await engine.verifySession('galx_sess_fixture',false)).valid,false);
    userId='user-a'; claims.accountVerified=false; assert.equal((await engine.verifySession('galx_sess_fixture',false)).valid,false);
    await assert.rejects(engine.authenticateProviderUser('openai',{apiKey:'sk_fake'}),/VERIFIED_ACCOUNT_REQUIRED/);
  } finally { GalxCryptoVault.verifySessionToken = original; }
});

test('provider refresh resolves only the verified account’s connection; public DTOs cannot forward operational objects', async () => {
  const originalFetch=globalThis.fetch, originalRepo=OAuthRepository.getInstance, originalEngine=GalxAuthEngine.getInstance;
  globalThis.fetch=async(input)=>String(input).endsWith('/fn_account_session_active') ? Response.json(true) : Response.json({id:'user-a',email:'a@example.test',email_confirmed_at:'2026-09-13'});
  let refreshed=''; OAuthRepository.getInstance=()=>({findIdentityByProvider:async(id:string)=>{assert.equal(id,'user-a');return {userId:id,shardId:'owned-connection'};}}) as any;
  GalxAuthEngine.getInstance=()=>({refreshProviderShardTokens:async(id:string)=>{refreshed=id;return true;}}) as any;
  try {
    await clean(await refresh(req('POST',jwt,{connectionId:'foreign',shardId:'foreign',sessionAffinity:'foreign'})),200); assert.equal(refreshed,'owned-connection');
    const dto=providerConnectionDTO({success:true,user:{id:'user-a',name:'Verified',token:'opaque-credential',shardId:sentinel,shardMode:sentinel,scopes:['admin:*']},extra:sentinel} as any);
    assert(!JSON.stringify(dto).includes(sentinel)); assert.equal((dto as any).user.scopes,undefined);
  } finally {globalThis.fetch=originalFetch;OAuthRepository.getInstance=originalRepo;GalxAuthEngine.getInstance=originalEngine;}
});

test('ordinary authenticated users never receive operational diagnostics or synthetic symmetric JWKS keys',async()=>{
  const original=GalxAuthEngine.getInstance;
  const { DeveloperAccessRepository } = await import('../src/lib/supabase/repositories/DeveloperAccessRepository');
  const approved=DeveloperAccessRepository.prototype.isApproved;
  GalxAuthEngine.getInstance=()=>({resolveAuthIdentity:async()=>({authenticated:true,userId:'user-a'})}) as any;
  DeveloperAccessRepository.prototype.isApproved=async()=>true;
  try {
    for(const [handler,method] of [[activity,'GET'],[posture,'GET'],[rewrap,'POST']] as const) await clean(await handler(req(method,jwt,undefined,{'x-galx-internal-key':''})),403);
    assert.deepEqual(await clean(await jwks(req()),200),{keys:[]});
  } finally {GalxAuthEngine.getInstance=original;DeveloperAccessRepository.prototype.isApproved=approved;}
});

test('late browser responses cannot restore old identities and storage contains only an owner hint',()=>{
  const fence=new SessionRequestFence(), first=fence.begin(), second=fence.begin();
  assert.equal(first.current(),false); assert.equal(first.signal.aborted,true); assert.equal(second.current(),true); fence.invalidate(); assert.equal(second.current(),false);
  const profile=readSessionProfile({valid:true,kind:'supabase',user:{id:'user-a',name:'A',token:sentinel,role:'owner',claims:sentinel}});
  assert.deepEqual(profile,{user:{id:'user-a',name:'A'}}); assert.equal(readSessionProfile({user:{id:'user-a'}}),null);
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const items=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k:string,v:string)=>items.set(k,v),getItem:()=>{throw new Error('blocked');},removeItem:(k:string)=>items.delete(k)}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{cookie:'galx_logout_pending=1'}});
  try {rememberOwner({id:'user-a',email:'private@example.test'});assert.equal(items.get(OWNER_HINT_KEY),' {"id":"user-a"}'.trim());assert.equal(logoutState(),'pending');}
  finally {for(const [name,descriptor] of [['localStorage',originalStorage],['document',originalDocument]] as const) {if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete (globalThis as any)[name];}}
});

test('restricted tokens cannot outlive their parent or widen its scopes', async () => {
  const engine:any=Object.create(GalxAuthEngine.prototype), generate=GalxCryptoVault.generateEncryptedSessionToken;
  const expiry=Date.now()+30000;let created:any;
  engine.verifySession=async()=>({ ...native(),claims:{...native().claims,exp:expiry,scopes:['images:*']},session:{...native().session,expiresAtMs:expiry}});
  engine.sessionRepo={createSession:async(record:any)=>{created=record;}};engine.persistence={logAudit:()=>{}};
  GalxCryptoVault.generateEncryptedSessionToken=(params:any)=>({token:'opaque',tokenHash:'hash',expiresAtMs:Date.now()+params.ttlMs,claims:{...params}}) as any;
  try {
    assert.equal((await engine.createRestrictedToken('galx_sess_fixture',{scopes:['admin:*']})).success,false);
    assert.equal((await engine.createRestrictedToken('galx_sess_fixture',{scopes:['images:*'],ttlMs:Infinity})).success,false);
    const result=await engine.createRestrictedToken('galx_sess_fixture',{scopes:['images:*'],ttlMs:86400000});
    assert.equal(result.success,true);assert(created.expiresAtMs<=expiry+1);assert.match(created.id,/^sess_sub_/);assert.deepEqual(created.scopes,['images:*']);
  } finally {GalxCryptoVault.generateEncryptedSessionToken=generate;}
});

test('device authorization never acknowledges an uncommitted grant or falls back to consumed memory state',async()=>{
  const { getSupabaseAdmin }=await import('../src/lib/supabase/client');
  const originalSecret=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY='sb_secret_'+randomBytes(24).toString('hex');resetSupabaseClients();
  const client=getSupabaseAdmin(),rpc=client.rpc;let reply:any={data:false,error:null};const calls:any[]=[];
  client.rpc=(async(name:string,args:any)=>{calls.push([name,args]);return reply;}) as any;
  const repository:any=Object.create(OAuthRepository.prototype);
  repository.deviceCodesTable={query:()=>{throw new Error('Memory must not grant authorization');}};
  try {
    assert.equal(await repository.approveDeviceCode('ABCD-EFGH','opaque',undefined,'user-a'),false);
    assert.equal(calls[0][1].p_user_id,'user-a');
    reply={data:null,error:{message:sentinel}};await assert.rejects(repository.approveDeviceCode('ABCD-EFGH','opaque',undefined,'user-a'),/UNAVAILABLE/);
    await assert.rejects(repository.pollDeviceCode('device-fixture'),/UNAVAILABLE/);
    reply={data:{success:false,error:'invalid_grant'},error:null};assert.deepEqual(await repository.pollDeviceCode('device-fixture'),{success:false,error:'invalid_grant',interval:undefined});
    reply={data:{success:true,access_token:'opaque',token_record:{secret:sentinel}},error:null};assert.deepEqual(await repository.pollDeviceCode('device-fixture'),{success:true,data:{access_token:'opaque'}});
  } finally {client.rpc=rpc;if(originalSecret===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=originalSecret;resetSupabaseClients();}
});

test('device approval issues a separate bounded credential and never shares the current browser token',async()=>{
  const { POST: approve }=await import('../src/app/api/auth/oauth/device/approve/route');
  const { GalxOAuthManager }=await import('../src/core/auth/GalxOAuthManager');
  const originalEngine=GalxAuthEngine.getInstance, originalManager=GalxOAuthManager.getInstance;
  let accepted=true;const revoked:string[]=[];
  GalxAuthEngine.getInstance=()=>({verifySession:async()=>native(),createRestrictedToken:async(token:string,params:any)=>{assert.equal(token,'galx_sess_browser');assert.equal(params.ttlMs,86400000);return {success:true,token:'galx_sess_device'};},revokeSession:async(token:string)=>{revoked.push(token);return true;}}) as any;
  GalxOAuthManager.getInstance=()=>({approveDeviceCode:async(code:string,token:string,_record:any,owner:string)=>{assert.equal(code,'ABCD-EFGH');assert.equal(token,'galx_sess_device');assert.equal(owner,'user-a');return accepted;}}) as any;
  try {
    await clean(await approve(req('POST','galx_sess_browser',{userCode:'ABCD-EFGH',sessionToken:'attacker'})),200);
    accepted=false;await clean(await approve(req('POST','galx_sess_browser',{userCode:'ABCD-EFGH'})),400);assert.deepEqual(revoked,['galx_sess_device']);
  } finally {GalxAuthEngine.getInstance=originalEngine;GalxOAuthManager.getInstance=originalManager;}
});

test('logout preserves rotated refresh cookies when revocation is temporarily unavailable',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input)=>String(input).endsWith('/fn_account_session_active') ? Response.json(true) : String(input).includes('/auth/v1/token')
    ? Response.json({access_token:jwt,refresh_token:'rotated-fixture',expires_in:3600,token_type:'bearer',user:{id:'user-a'}})
    : Response.json({id:'user-a',email:'a@example.test',is_anonymous:false});
  resetSupabaseClients();const admin=getSupabaseAuthClient().auth.admin, original=admin.signOut;
  admin.signOut=async()=>({error:{status:503,message:sentinel}}) as any;
  const value='base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'old-fixture',expires_at:1,user:{id:'user-a'}})).toString('base64url');
  try {
    const response=await logout(req('DELETE',undefined,undefined,{origin:'https://galx.ai',cookie:'sb-auth-auth-token='+value}));
    assert(response.cookies.getAll().some(cookie=>cookie.name.startsWith('sb-auth-auth-token')&&cookie.value&&cookie.value!==value));
    await clean(response,503);
  } finally {admin.signOut=original;globalThis.fetch=originalFetch;resetSupabaseClients();}
});

test('provider callback keeps the canonical account cookie and returns only the explicit connection DTO',async()=>{
  const { POST: callback }=await import('../src/app/api/auth/oauth/callback/route');
  const { GalxOAuthManager }=await import('../src/core/auth/GalxOAuthManager');
  const originalFetch=globalThis.fetch, originalEngine=GalxAuthEngine.getInstance, originalManager=GalxOAuthManager.getInstance, originalRepo=OAuthRepository.getInstance;
  globalThis.fetch=async(input)=>String(input).endsWith('/fn_account_session_active') ? Response.json(true) : Response.json({id:'user-a',email:'a@example.test',email_confirmed_at:'2026-09-13'});
  GalxOAuthManager.getInstance=()=>({exchangeCodeForTokens:async()=>({accessToken:'connection-credential',accountId:'connection-id'})}) as any;
  OAuthRepository.getInstance=()=>({}) as any;
  GalxAuthEngine.getInstance=()=>({authenticateProviderUser:async(_provider:string,_params:any,account:any)=>{assert.equal(account.id,'user-a');return {success:true,user:{id:account.id,email:account.email,token:'opaque',shardId:sentinel,shardMode:sentinel}};}}) as any;
  try {
    const response=await callback(req('POST',jwt,{code:'fixture',codeVerifier:'fixture',email:'foreign@example.test'}));
    assert.equal(response.cookies.get('galx_session'),undefined);
    const body=await clean(response,200);assert.equal(body.user.id,'user-a');assert.equal(body.user.email,'a@example.test');assert.equal(body.user.shardId,undefined);
  } finally {globalThis.fetch=originalFetch;GalxAuthEngine.getInstance=originalEngine;GalxOAuthManager.getInstance=originalManager;OAuthRepository.getInstance=originalRepo;}
});

test('native session storage never grants cached authorization or acknowledges failed writes',async()=>{
  const { SessionRepository }=await import('../src/lib/supabase/repositories/SessionRepository');
  const { getSupabaseAdmin }=await import('../src/lib/supabase/client');
  const originalSecret=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_SECRET_KEY='sb_secret_'+randomBytes(24).toString('hex');resetSupabaseClients();
  const client=getSupabaseAdmin(),from=client.from,rpc=client.rpc;
  let reply:any={data:null,error:null};const writes:any[]=[];let saved=0;
  const query:any={select:()=>query,or:()=>query,eq:()=>query,order:()=>query,maybeSingle:async()=>reply,insert:(row:any)=>{writes.push(row);return Promise.resolve(reply);},update:()=>query,then:(resolve:any,reject:any)=>Promise.resolve(reply).then(resolve,reject)};
  client.from=(()=>query) as any;client.rpc=(async()=>reply) as any;
  const repo:any=Object.create(SessionRepository.prototype);repo.saveSessionInMemory=()=>{saved++;};repo.deleteSessionInMemory=()=>{};
  repo.inMemoryCache=new Map([['sess_a',native().session]]);repo.sessionTable={query:()=>{throw new Error('Cache must never establish session authority');}};
  const hash='a'.repeat(64);
  try {
    assert.equal(await repo.findSessionByTokenHash(hash),null);assert.equal(await repo.findSessionById('sess_a'),null);
    reply={data:[],error:null};assert.deepEqual(await repo.getUserSessions('user-a'),[]);
    reply={data:null,error:{message:sentinel}};
    for(const operation of [()=>repo.findSessionByTokenHash(hash),()=>repo.findSessionById('sess_a'),()=>repo.getUserSessions('user-a'),()=>repo.revokeSession('sess_a'),()=>repo.revokeOtherSessions('user-a','sess_a'),()=>repo.revokeAllUserSessions('user-a'),()=>repo.revokeSessionFamily('family'),()=>repo.rotateSessionTokenAtomic(hash,'b'.repeat(64),Date.now()+10000)]) await assert.rejects(operation(),/UNAVAILABLE/);
    const record={...native().session,tokenHash:hash,sessionFamilyId:'family',scopes:['images:*'],issuedAtMs:Date.now(),lastActiveAtMs:Date.now()};
    await assert.rejects(repo.createSession(record),/UNAVAILABLE/);assert.equal(saved,0);
    reply={data:null,error:null};await repo.createSession(record);assert.equal(saved,1);assert.deepEqual(writes.at(-1).scopes,['images:*']);assert.equal(writes.at(-1).session_family_id,'family');
    reply={data:{revoked_count:0},error:null};assert.equal(await repo.revokeOtherSessions('user-a','sess_a'),0);
    reply={data:{success:false},error:null};assert.equal((await repo.rotateSessionTokenAtomic(hash,'b'.repeat(64),Date.now()+10000)).success,false);
    assert.equal((await repo.elevateSessionSudo('sess_a','user-a')).success,false);
  } finally {client.from=from;client.rpc=rpc;if(originalSecret===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=originalSecret;resetSupabaseClients();}
});

test('native token rotation honors the previous-token grace window and reports database outages as unavailable',async()=>{
  const engine:any=Object.create(GalxAuthEngine.prototype),verify=GalxCryptoVault.verifySessionToken;
  const hash=GalxCryptoVault.hashSessionToken('galx_sess_fixture');let grace=Date.now()+10000;
  GalxCryptoVault.verifySessionToken=()=>({valid:true,claims:{sub:'user-a',accountVerified:true}}) as any;
  engine.sessionRepo={findSessionByTokenHash:async()=>({id:'sess_a',userId:'user-a',tokenHash:'replacement',previousTokenHash:hash,gracePeriodUntilMs:grace,expiresAtMs:Date.now()+60000})};
  try {
    assert.equal((await engine.verifySession('galx_sess_fixture',false)).valid,true);grace=Date.now()-1;
    assert.equal((await engine.verifySession('galx_sess_fixture',false)).valid,false);
    engine.sessionRepo.findSessionByTokenHash=async()=>{throw new Error(sentinel);};
    const result=await engine.resolveAuthIdentity(req('GET','galx_sess_fixture'));assert.equal(result.authenticated,false);assert.equal(result.error,'AUTH_UNAVAILABLE');
  } finally {GalxCryptoVault.verifySessionToken=verify;}
});
