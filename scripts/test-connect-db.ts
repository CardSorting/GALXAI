import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { NextRequest } from 'next/server';
import { ConnectRepository, connectHash, connectSecret } from '../src/lib/supabase/repositories/ConnectRepository';
import { type ConnectConfig } from '../src/lib/connect/config';
import { connectHandlers } from '../src/lib/connect/http';
import { SessionAccessError } from '../src/lib/auth/session-http';
import { invokeNova } from '../src/lib/nova/inference';
import { NovaError } from '../src/lib/nova/contract';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const owner = randomUUID(), other = randomUUID();
const config: ConnectConfig = { issuer: 'https://galx.test', resource: 'https://nova.test', clients: [
  { id: 'studio', name: 'Independent Studio', kind: 'browser', redirectUris: ['https://studio.test/callback'], origins: ['https://studio.test'] },
  { id: 'native', name: 'Native Studio', kind: 'native', redirectUris: ['http://127.0.0.1/callback'], origins: [] },
] };
const first = new ConnectRepository(config, pool), cold = new ConnectRepository(config, pool);
let checks = 0;
const equal = (a: unknown, b: unknown) => { assert.deepEqual(a, b); checks++; };
const rejects = async (p: Promise<unknown>, code: string) => { await assert.rejects(p, (e: any) => e.code === code); checks++; };
const params = (client = 'studio') => ({ client_id: client, redirect_uri: client === 'native' ? 'http://127.0.0.1:48221/callback' : 'https://studio.test/callback', resource: config.resource, state: connectSecret(), challenge: createHash('sha256').update('v'.repeat(43)).digest('base64url') });
async function connect(user = owner, client = 'studio') {
  const p = params(client), browser = connectHash(connectSecret());
  const id = await first.begin(p, browser);
  const redirect = new URL(await cold.decide(id, browser, user, true));
  return cold.exchange({ clientId: client, code: redirect.searchParams.get('code')!, redirectUri: p.redirect_uri, challenge: p.challenge });
}
const admit = (access: string, origin: string | null = 'https://studio.test', requestKey = connectHash(connectSecret()), resource = config.resource) => cold.admit({ tokenHash: connectHash(access), origin, resource, requestKey, fingerprint: 'fingerprint' });
const grant = async (user: string) => pool.query('INSERT INTO private.galx_inference_access(user_id,enabled,valid_until) VALUES ($1,true,now()+interval \'1 day\') ON CONFLICT (user_id) DO UPDATE SET enabled=true,valid_until=excluded.valid_until', [user]);
try {
  await pool.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [owner,other]);
  let accounts = (await pool.query('SELECT count(*)::int n FROM auth.users')).rows[0].n;
  const profiles = (await pool.query('SELECT count(*)::int n FROM private.galx_account_profiles')).rows[0].n;
  // RLS plus explicit privilege denial: no browser, user, service-role Data API or PUBLIC bypass.
  const tables = ['galx_inference_access','galx_connect_requests','galx_connect_grants','galx_connect_codes','galx_connect_tokens','galx_nova_requests'];
  for (const table of tables) {
    const flags = (await pool.query('SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass', [`private.${table}`])).rows[0];
    equal(flags, { relrowsecurity: true, relforcerowsecurity: true });
    for (const role of ['anon','authenticated','service_role']) for (const permission of ['SELECT','INSERT','UPDATE','DELETE']) equal((await pool.query('SELECT has_table_privilege($1,$2,$3) allowed', [role,`private.${table}`,permission])).rows[0].allowed, false);
  }
  const token = await connect();
  equal(await first.entitled(owner), false);
  await rejects(admit(token.access_token), 'inference_access_required');
  equal((await cold.connections(owner)).length, 1); // Permission exists independently of entitlement.
  await grant(owner); equal(await first.entitled(owner), true);
  await rejects(admit(token.access_token, 'https://evil.test'), 'invalid_token');
  await rejects(admit(token.access_token, null, undefined, 'https://other.test'), 'invalid_token');
  await rejects(admit(token.refresh_token), 'invalid_token');
  const native = await connect(owner, 'native');
  const a = await admit(token.access_token), b = await admit(native.access_token, null);
  equal(a.userId, owner); equal(b.userId, owner);
  await rejects(admit(token.access_token), 'service_busy'); // Multiple apps share the same account slots.
  const connection = (await cold.connections(owner)).find(c => c.application === 'Independent Studio')!;
  await first.disconnect(connection.id, other); // Foreign owner cannot revoke it.
  equal((await cold.connections(owner)).length, 2);
  await first.finish(a.id, 'completed'); await first.finish(b.id, 'not_accepted');
  const active = await admit(token.access_token); equal(active.userId, owner); await first.finish(active.id,'completed');
  await pool.query('UPDATE private.galx_inference_access SET enabled=false WHERE user_id=$1', [owner]);
  await rejects(admit(token.access_token), 'inference_access_required');
  equal((await cold.connections(owner)).length, 2); await grant(owner);
  await first.disconnect(connection.id, owner);
  await rejects(admit(token.access_token), 'invalid_token'); // Cold reader, no revocation cache window.
  await rejects(cold.refresh(token.refresh_token,'studio'), 'invalid_grant');
  equal(await first.entitled(owner), true);
  equal((await cold.connections(owner)).length, 1);
  const independent = await admit(native.access_token, null); await first.finish(independent.id,'completed');

  // Rotation: spent refresh tokens revoke the active connection and its new access tokens.
  const original = await connect();
  await rejects(cold.refresh(original.refresh_token,'native'), 'invalid_grant');
  const rotated = await first.refresh(original.refresh_token,'studio');
  await rejects(admit(original.access_token), 'invalid_token');
  const rotatedAdmission = await admit(rotated.access_token); await cold.finish(rotatedAdmission.id,'completed');
  await rejects(cold.refresh(original.refresh_token,'studio'), 'invalid_grant');
  await rejects(admit(rotated.access_token), 'invalid_token');

  const p = params(), browser = connectHash(connectSecret()), id = await first.begin(p,browser);
  await rejects(cold.authorization(id, connectHash('wrong')), 'invalid_request');
  const callback = new URL(await cold.decide(id,browser,owner,true));
  await rejects(first.decide(id,browser,owner,true), 'invalid_request');
  const exchange = { clientId: 'studio', code: callback.searchParams.get('code')!, redirectUri: p.redirect_uri, challenge: p.challenge };
  await rejects(first.exchange({ ...exchange, challenge: 'x'.repeat(43) }), 'invalid_grant');
  await rejects(first.exchange({ ...exchange, redirectUri: 'https://evil.test/callback' }), 'invalid_grant');
  const concurrent = await Promise.allSettled([first.exchange(exchange),cold.exchange(exchange)]);
  equal(concurrent.filter(v => v.status === 'fulfilled').length, 1);
  const issued = concurrent.find(v => v.status === 'fulfilled') as PromiseFulfilledResult<any>;
  await rejects(admit(issued.value.access_token), 'invalid_token'); // Replay commits revocation.
  const decline = params(), declineBrowser = connectHash(connectSecret());
  const declineId = await first.begin(decline, declineBrowser);
  equal(new URL(await first.decide(declineId,declineBrowser,owner,false)).searchParams.get('error'), 'access_denied');

  // Request identity survives errors. No duplicate execution, even from another process/repository.
  const current = await connect(), key = connectHash(connectSecret());
  const once = await admit(current.access_token,'https://studio.test',key); await first.finish(once.id,'unknown');
  await rejects(admit(current.access_token,'https://studio.test',key),'request_already_submitted');
  await rejects(cold.admit({ tokenHash:connectHash(current.access_token), origin:'https://studio.test', resource:config.resource, requestKey:key, fingerprint:'changed' }),'invalid_request');
  const afterUnknown = await admit(native.access_token,null); await cold.finish(afterUnknown.id,'completed');
  await pool.query("UPDATE private.galx_nova_requests SET created_at=now()-interval '2 minutes',lease_until=now()-interval '1 second' WHERE user_id=$1", [owner]);

  // Actual request handlers + durable repository: an existing synthetic account completes PKCE then invokes.
  const cookie = '__Host-galx_connect_flow=' + connectSecret();
  const actorSession = async (request: NextRequest) => {
    if (request.headers.get('x-fixture-account') !== owner) throw new SessionAccessError(401);
    return { kind:'supabase' as const, user:{ id:owner }, token:'fixture-account-session', session:undefined, cookies:[], emailConfirmed:true };
  };
  const handlers = connectHandlers({ config:()=>config, repository:()=>cold, session:actorSession as any });
  const authorization = params();
  const query = new URLSearchParams({ ...authorization, response_type:'code', scope:'inference:invoke', code_challenge:authorization.challenge, code_challenge_method:'S256' }); query.delete('challenge');
  const started = await handlers.authorize(new NextRequest(`${config.issuer}/oauth/authorize?${query}`, { headers:{ cookie } })); equal(started.status,303);
  const requestId = new URL(started.headers.get('location')!).searchParams.get('request')!;
  const decision = await handlers.decision(new NextRequest(`${config.issuer}/api/connect/consent`, { method:'POST', headers:{ Cookie:cookie, Origin:config.issuer, 'x-fixture-account':owner, 'Content-Type':'application/x-www-form-urlencoded' }, body:new URLSearchParams({ request:requestId,decision:'allow' }) })); equal(decision.status,200);
  const location = new URL((await decision.json()).redirect_uri);
  const exchanged = await handlers.token(new NextRequest(`${config.issuer}/oauth/token`, { method:'POST', headers:{ Origin:'https://studio.test','Content-Type':'application/x-www-form-urlencoded' }, body:new URLSearchParams({ grant_type:'authorization_code',client_id:'studio',code:location.searchParams.get('code')!,code_verifier:'v'.repeat(43),redirect_uri:authorization.redirect_uri,resource:config.resource }) })); equal(exchanged.status,200);
  const credential = await exchanged.json(); let executed = 0;
  const inferenceRequest = () => new Request(`${config.resource}/v1/inference`, { method:'POST',headers:{ Authorization:`Bearer ${credential.access_token}`, Origin:'https://studio.test','Content-Type':'application/json','Idempotency-Key':randomUUID() },body:JSON.stringify({ messages:[{role:'user',content:'Make a small thing.'}] }) });
  const executor = async () => { executed++; return Response.json({ choices:[{message:{content:'A small thing.'},finish_reason:'stop'}] }); };
  const result = await invokeNova(inferenceRequest(),config.resource,cold,executor); equal(result.status,200); equal((await result.json()).choices[0].message.content,'A small thing.'); equal(executed,1);
  await cold.revokeToken(credential.refresh_token,'studio');
  equal((await invokeNova(inferenceRequest(),config.resource,first,executor)).status,401); equal(executed,1);

  // Expiry and refresh lifetimes are authoritative database decisions.
  const expiry = await connect();
  await pool.query("UPDATE private.galx_connect_tokens SET expires_at=now()-interval '1 second' WHERE access_hash=$1", [connectHash(expiry.access_token)]);
  await rejects(admit(expiry.access_token),'invalid_token');
  const renewed = await cold.refresh(expiry.refresh_token,'studio');
  const times = (await pool.query('SELECT refresh_expires_at FROM private.galx_connect_tokens WHERE access_hash=ANY($1)', [[connectHash(expiry.access_token),connectHash(renewed.access_token)]])).rows;
  equal(times[0].refresh_expires_at, times[1].refresh_expires_at);
  await pool.query("UPDATE private.galx_inference_access SET valid_until=now()-interval '1 second' WHERE user_id=$1", [owner]);
  await rejects(admit(renewed.access_token),'inference_access_required');
  equal((await pool.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,accounts);
  equal((await pool.query('SELECT count(*)::int n FROM private.galx_account_profiles')).rows[0].n,profiles);
  // No plaintext credential or input content is persisted in a token or request record.
  const records = JSON.stringify((await pool.query('SELECT * FROM private.galx_connect_tokens')).rows);
  assert(!records.includes('galx_connect_at_') && !records.includes('galx_connect_rt_')); checks++;
  const requests = JSON.stringify((await pool.query('SELECT * FROM private.galx_nova_requests')).rows);
  assert(!requests.includes('Make a small thing')); checks++;
  // Account retention is an existing authority. Its denial must not partially erase a grant.
  const retained = randomUUID();
  await pool.query('INSERT INTO auth.users(id) VALUES ($1)', [retained]); accounts++;
  await grant(retained);
  const retainedToken = await connect(retained);
  await rejects(pool.query('DELETE FROM auth.users WHERE id=$1', [retained]), '55000');
  equal((await cold.connections(retained)).length, 1);
  const retainedGrant = (await cold.connections(retained))[0];
  await cold.disconnect(retainedGrant.id, retained);
  await rejects(admit(retainedToken.access_token), 'invalid_token');
  await rejects(cold.refresh(retainedToken.refresh_token, 'studio'), 'invalid_grant');
  await pool.query('UPDATE private.galx_inference_access SET enabled=false WHERE user_id=$1', [retained]);
  equal(await first.entitled(retained), false);
  // These foreign keys enforce cascade IF the separate account-erasure policy permits deletion.
  for (const table of ['galx_inference_access','galx_connect_grants','galx_nova_requests']) {
    equal((await pool.query("SELECT confdeltype FROM pg_constraint WHERE conrelid=$1::regclass AND confrelid='auth.users'::regclass", [`private.${table}`])).rows, [{ confdeltype:'c' }]);
  }
  const migrate = async (sql:string) => { const c=await pool.connect();try { await c.query('BEGIN');await c.query(sql);await c.query('COMMIT'); } catch(e) { await c.query('ROLLBACK');throw e; } finally { c.release(); } };
  const name='20261003131619_galx_connect_grants';
  await migrate(await readFile(new URL(`../supabase/rollbacks/${name}.down.sql`,import.meta.url),'utf8'));
  await assert.rejects(cold.connections(owner));checks++;
  equal((await pool.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,accounts);
  const up=await readFile(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
  await migrate(up);await migrate(up);equal((await cold.connections(owner)).length,0);
  console.log(JSON.stringify({ checks, failed:0, scope:'Disposable PostgreSQL: PKCE/consent, cold revocation, shared account admission, refresh reuse, RLS/privileges, HTTP handlers, media isolation and rollback. Synthetic existing identity and inference executor; no live provider calls.' }));
} finally { await pool.end(); }
