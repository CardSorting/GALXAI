import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { isPublicProductPath, normalizedPath } from '../src/lib/security/preview-policy';
import { previewMiddleware } from '../src/lib/security/preview-middleware';
import { generationQuotaRoute } from '../src/lib/billing/generation-quota-route';
import { enforceDeveloperAccess } from '../src/lib/security/developer-access';
import { createDeveloperAccessHandlers } from '../src/lib/auth/developer-access-route';
import { AccountIdentityError } from '../src/lib/auth/accountIdentity';
import { DeveloperAccessRepository, type PreviewRecord } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { normalizeProfile, validateApplication, type ApplicationInput } from '../src/lib/developers/application';
const application: ApplicationInput = { introduction: 'I build tools for a small research team.', github_url: 'https://github.com/research-builder', linkedin_url: null,
  use_case: 'A project with sufficient detail', expected_traffic: 'exploring', cohort_interest: 'next' };

test('only product and supporting endpoints bypass preview, including async images and site publication', () => {
  for (const path of ['/images','/sites','/sites/id','/v1/images/generations','/v1/images/requests/id','/v1/images/requests/id/stream', '/v1/images/assets/token','/api/images/availability','/api/images/feed','/api/images/library/id','/api/sites/workspace','/api/sites/published/name','/api/stripe/webhook','/images/studio/desert.webp','/images/showcase/cafe_cat.jpg']) assert.equal(isPublicProductPath(path), true, path);
  for (const path of ['/v1/chat/completions','/v1/models','/v1/models/id.png','/v1/messages','/api/generate','/api/run','/api/chat','/api/keys','/api/auth/tokens/restricted','/api/sites/workspace-evil','/v1/images/generations/evil','/api/images/availability/diagnostics','/api/new-service','/playground','/docs','/keys','/models/opengraph-image','/llms-full.txt']) assert.equal(isPublicProductPath(path), false, path);
  assert.equal(normalizedPath('/v1/chat/completions/'), '/v1/chat/completions');
  assert.equal(isPublicProductPath('/api/%73ites/workspace-evil'), false);
});

test('anonymous, pending, revoked, forged grants, and unavailable authority cannot dispatch', async () => {
  const req = new Request('https://galx.ai/v1/chat/completions', { headers: { 'x-galx-approved': 'true', 'x-user-id': 'approved-other-account', 'x-galx-internal-key': 'invalid' } });
  let checks = 0;
  const anonymous = await enforceDeveloperAccess(req, { identity: async () => ({ authenticated: false, userId: 'approved' }), approved: async () => { checks++; return true; } });
  assert.equal(anonymous?.status, 401); assert.equal(checks, 0);
  for (const status of ['pending','revoked','missing']) {
    const denied = await enforceDeveloperAccess(req, { identity: async () => ({ authenticated: true, userId: 'caller' }), approved: async id => { assert.equal(id, 'caller'); return status === 'approved'; } });
    assert.equal(denied?.status, 403);
    assert.equal(denied?.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Object.keys(await denied!.json()).sort(), ['error','request_access_url']);
  }
  const unavailable = await enforceDeveloperAccess(req, { identity: async () => ({ authenticated: true, userId: 'caller' }), approved: async () => { throw new Error('private database credential sentinel'); } });
  assert.equal(unavailable?.status, 503); assert.doesNotMatch(await unavailable!.text(), /sentinel|database|credential/);
  let approved = true;
  const deps = { identity: async () => ({ authenticated: true, userId: 'caller' }), approved: async () => approved };
  assert.equal(await enforceDeveloperAccess(req, deps), null);
  approved = false;
  assert.equal((await enforceDeveloperAccess(req, deps))?.status, 403, 'revocation must not use a cached grant');
});

test('account quota reads bypass developer approval but retain account authentication',async()=>{
  const request=new NextRequest('https://galx.ai/api/billing/generation-quota');
  assert.equal(await previewMiddleware(request),null);
  for(const path of ['/api/billing/generation-quota/','/api/billing/%67eneration-quota'])assert(isPublicProductPath(path));
  for(const path of ['/api/billing/generation-quota/private','/api/billing/generation-quota-evil','/api/billing/private'])assert(!isPublicProductPath(path));
  const unused=async():Promise<never>=>{throw new Error('Must not query quota');};
  const anonymous=generationQuotaRoute({authenticate:async()=>{throw new AccountIdentityError();},plan:unused,quota:unused,availability:unused});
  const denied=await anonymous(request);assert.equal(denied.status,401);assert.equal(denied.headers.get('cache-control'),'private, no-store');
  const pro=generationQuotaRoute({authenticate:async()=>({id:'verified-account'}),plan:async owner=>{assert.equal(owner,'verified-account');return 'pro';},quota:unused,availability:unused});
  assert.deepEqual(await (await pro(request)).json(),{plan:'pro',quota:null});
});

test('requests bind to verified identity, ignore approval/owner fields, and return an explicit DTO', async () => {
  const record: PreviewRecord = { user_id: 'verified', email: 'verified@example.test', use_case: 'A project with sufficient detail', expected_traffic: 'exploring', status: 'pending', requested_at: new Date(), reviewed_at: null };
  const calls: unknown[] = [];
  const repo = { get: async () => record, request: async (...args: unknown[]) => { calls.push(args); return record; }, feedback: async () => true } as unknown as DeveloperAccessRepository;
  const handlers = createDeveloperAccessHandlers({ identity: async () => ({ id: record.user_id, email: record.email, name: 'Verified' }), repository: () => repo });
  const req = (body: unknown) => new NextRequest('https://galx.ai/api/developer-access', { method: 'POST', body: JSON.stringify(body) });
  const response = await handlers.POST(req({ ...application, status: 'approved', userId: 'victim', email: 'victim@example.test' }));
  assert.equal(response.status, 200); assert.deepEqual(calls[0], ['verified','verified@example.test',record.use_case,'exploring',application]);
  assert.deepEqual(await response.json(), { status: 'pending', requested_at: record.requested_at.toISOString(), expires_at: null,
    application: { introduction: null, github_url: null, linkedin_url: null, cohort_interest: null, use_case: record.use_case, expected_traffic: 'exploring', revision: 1, updated_at: null } });
  assert.equal((await handlers.POST(req({ use_case: 'short', expected_traffic: 'exploring' }))).status, 400);
  assert.equal((await handlers.POST(req({ use_case: 'x'.repeat(25_000), expected_traffic: 'exploring' }))).status, 400);
  assert.equal(calls.length, 1);
  assert.equal((await handlers.feedback(req({ message: 'Private feedback' }))).status, 403);
  const unsigned = createDeveloperAccessHandlers({ identity: async () => { throw new AccountIdentityError(); }, repository: () => { throw new Error('must not reach storage'); } });
  assert.equal((await unsigned.POST(req({}))).status, 401);
  assert.equal((await unsigned.GET(req({}))).status, 401);
});

test('profile validation accepts either profile and rejects hostile URLs and missing cohort interest', () => {
  assert.equal(normalizeProfile(' github.com/Research-Builder?tab=repositories#readme ', 'github'), 'https://github.com/Research-Builder');
  assert.equal(normalizeProfile('http://www.linkedin.com/in/research-builder/?trk=public', 'linkedin'), 'https://www.linkedin.com/in/research-builder');
  assert.equal(normalizeProfile('linkedin.com/in/zoë-builder', 'linkedin'), 'https://www.linkedin.com/in/zo%C3%AB-builder');
  for (const value of ['javascript:alert(1)', 'https://github.com.evil.test/builder', 'https://github.com@evil.test/builder', 'https://evil.test@github.com/builder', 'https://github.com/builder/repo', 'https://github.com/builder%2Frepo', 'https://github.com:444/builder', 'https://github.com\\@evil.test/builder']) {
    assert.equal(normalizeProfile(value, 'github'), null, value);
  }
  assert.deepEqual(validateApplication(application).errors, {});
  assert.deepEqual(validateApplication({ ...application, github_url: '', linkedin_url: 'linkedin.com/in/builder', cohort_interest: 'later' }).errors, {});
  for (const input of [null, [], { ...application, introduction: 'short' }, { ...application, github_url: '', linkedin_url: null },
    { ...application, linkedin_url: 'https://evil.test/in/profile' }, { ...application, cohort_interest: true }, { ...application, cohort_interest: '' },
    { ...application, expected_traffic: '__proto__' }, { ...application, introduction: 'x'.repeat(1001) }]) assert(Object.keys(validateApplication(input).errors).length);
});

test('application edits bind to the caller, reject stale revisions and fail closed without leaking diagnostics', async () => {
  let args: unknown[] = []; let conflict = false;
  const record = { ...application, user_id: 'caller', email: 'caller@example.test', status: 'pending' as const, revision: 4, requested_at: new Date(), reviewed_at: null, reviewed_by: 'PRIVATE_SENTINEL' };
  const repo = { get: async (id: string) => { assert.equal(id, 'caller'); return record; }, updateApplication: async (...input: unknown[]) => { args = input; return conflict ? null : record; } } as unknown as DeveloperAccessRepository;
  const handlers = createDeveloperAccessHandlers({ identity: async () => ({ id: 'caller', email: 'caller@example.test', name: 'Caller' }), repository: () => repo });
  const req = (input: unknown, origin = 'https://galx.ai') => new NextRequest('https://galx.ai/api/developer-access?user_id=victim', { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const response = await handlers.PATCH(req({ ...application, revision: 3, user_id: 'victim', status: 'approved', role: 'owner' }));
  assert.equal(response.status, 200); assert.deepEqual(args, ['caller', 3, application]);
  const body = await response.json(); assert.equal(body.application.github_url, application.github_url); assert.equal(body.application.revision, 4);
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE_SENTINEL|reviewed_by|caller@example/); assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal((await handlers.PATCH(req({ ...application, revision: 0 }))).status, 400);
  assert.equal((await handlers.PATCH(req({ ...application, revision: 3 }, 'https://evil.test'))).status, 403);
  conflict = true; assert.equal((await handlers.PATCH(req({ ...application, revision: 3 }))).status, 409);
  const invalid = await handlers.POST(req({ ...application, github_url: 'javascript:PRIVATE_SENTINEL' }));
  assert.equal(invalid.status, 400); assert.doesNotMatch(await invalid.text(), /PRIVATE_SENTINEL/);
  const own = await handlers.GET(req({})); assert.equal((await own.json()).application.introduction, application.introduction);
  const denied = createDeveloperAccessHandlers({ identity: async () => { throw new AccountIdentityError(); }, repository: () => repo });
  assert.equal((await denied.PATCH(req(application))).status, 401);
});

test('direct handlers deny anonymous execution and key minting before handling input', async () => {
  const [{ POST: chat }, { POST: keys }, { GET: models }] = await Promise.all([
    import('../src/app/v1/chat/completions/route'), import('../src/app/api/keys/route'), import('../src/app/v1/models/route'),
  ]);
  for (const [path, handler] of [['/v1/chat/completions',chat], ['/api/keys',keys], ['/v1/models',models]] as const) {
    const response = await handler(new NextRequest('https://galx.ai'+path));
    assert.equal(response.status, 401); assert.equal((await response.json()).error.code, 'authentication_required');
  }
});

test('API hostname rechecks approval even for authenticated cached keys and preserves images', async () => {
  const { GalxEdgeGateway } = await import('../src/workers/cloudflare/GalxEdgeGateway');
  const gateway = new GalxEdgeGateway({ SUPABASE_URL: 'https://unused.example.test' });
  const internals = gateway as unknown as { authenticateGatewayKey: () => Promise<unknown>; checkRateLimit: () => Promise<boolean>; handleListModels: () => Response; handleImageGenerations: () => Promise<Response> };
  internals.authenticateGatewayKey = async () => ({ ok: true, key: { userId: 'verified', keyHash: 'fixture', rateLimitPerMinute: 10 } });
  let dispatched = 0, checks = 0;
  internals.checkRateLimit = async () => { dispatched++; return true; };
  internals.handleListModels = () => new Response('{"data":[]}');
  internals.handleImageGenerations = async () => new Response('image-fixture', { headers: { 'Content-Type': 'image/png' } });
  const original = globalThis.fetch;
  let accessStatus = 403;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://galx.ai/api/developer-access/check');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer galx_live_fixture');
      assert.equal(init?.redirect, 'manual'); checks++;
      return new Response(accessStatus === 200 ? '{"approved":true}' : 'private sentinel', { status: accessStatus });
    };
    const request = (path: string) => new Request('https://api.galx.ai'+path, { headers: { Authorization: 'Bearer galx_live_fixture' } });
    for (const path of ['/v1/models','/v1/chat/completions','/chat/completions','/api/generate','/v1/embeddings','/v1/assets/upload']) {
      const denied = await gateway.handleRequest(request(path)); assert.equal(denied.status, 403); assert.doesNotMatch(await denied.text(), /sentinel/);
    }
    assert.equal(dispatched, 0);
    accessStatus = 200; assert.equal((await gateway.handleRequest(request('/v1/models'))).status, 200); assert.equal(dispatched, 1);
    accessStatus = 403; assert.equal((await gateway.handleRequest(request('/v1/models'))).status, 403); assert.equal(dispatched, 1);
    accessStatus = 500; assert.equal((await gateway.handleRequest(request('/v1/models'))).status, 503);
    accessStatus = 307; assert.equal((await gateway.handleRequest(request('/v1/models'))).status, 503);
    const checked = checks;
    assert.equal((await gateway.handleRequest(request('/v1/images/generations'))).status, 200);
    assert.equal(checks, checked, 'images never query developer approval');
    globalThis.fetch = async () => { throw new Error('private outage'); };
    assert.equal((await gateway.handleRequest(request('/v1/models'))).status, 503);
  } finally { globalThis.fetch = original; }
});

test('authorization probes validate keys without charging request quota or usage', async () => {
  const { ApiKeyRepository } = await import('../src/lib/supabase/repositories/ApiKeyRepository');
  const { GalxCryptoVault } = await import('../src/core/vault/GalxCryptoVault');
  const key = { id:'probe-key',userId:'probe-user',scopes:['images:generate'],revoked:false };
  let slots=0, writes=0;
  const repo=Object.assign(Object.create(ApiKeyRepository.prototype), {
    tokenHashCache:new Map(), findGatewayKeyByHash:async()=>key,
    checkRateLimit:()=>{slots++;return {allowed:true,remaining:10,resetMs:1000};},
    incrementUsage:async()=>{writes++;},
  }) as unknown as import('../src/lib/supabase/repositories/ApiKeyRepository').ApiKeyRepository;
  const {apiKey}=GalxCryptoVault.generateGatewayApiKey({environment:'test'});
  for(let i=0;i<3;i++) assert.equal((await repo.validateGatewayKey(apiKey,{countRequest:false})).valid,true);
  assert.equal(slots,0);assert.equal(writes,0);
  assert.equal((await repo.validateGatewayKey(apiKey,{countRequest:false,requiredScope:'chat:completions'})).valid,false);
  key.revoked=true;assert.equal((await repo.validateGatewayKey(apiKey,{countRequest:false})).valid,false);
  key.revoked=false;
  assert.equal((await repo.validateGatewayKey(apiKey)).valid,true);assert.equal(slots,1);assert.equal(writes,1);
});

test('grantDeveloperTier activates approved access upon developer tier purchase', async () => {
  let executedQuery = '';
  let queryParams: unknown[] = [];
  const fakeDb = {
    query: async <T>(sql: string, params: unknown[]): Promise<{ rows: T[]; rowCount: number }> => {
      executedQuery = sql;
      queryParams = params;
      return {
        rows: [{
          user_id: params[0] as string, email: params[1] as string, use_case: 'Developer tier purchased via checkout for images and frontier models API access',
          expected_traffic: 'over_1000_daily', status: 'approved' as const, requested_at: new Date(), reviewed_at: new Date(),
          expires_at: null, revision: 1,
        }] as unknown as T[],
        rowCount: 1,
      };
    },
  };
  const repo = new DeveloperAccessRepository(fakeDb as any);
  const granted = await repo.grantDeveloperTier('test-user-id', 'test-user@example.com');
  assert.equal(granted?.status, 'approved');
  assert.equal(granted?.user_id, 'test-user-id');
  assert.match(executedQuery, /INSERT INTO private\.developer_access_requests/);
  assert.match(executedQuery, /ON CONFLICT \(user_id\) DO UPDATE SET/);
  assert.equal(queryParams[0], 'test-user-id');
  assert.equal(queryParams[1], 'test-user@example.com');
});
