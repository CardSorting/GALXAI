import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { createPreviewAdminHandlers } from '../src/lib/admin/preview-route';
import { PreviewAdminRepository } from '../src/lib/supabase/repositories/PreviewAdminRepository';
import { AccountIdentityError } from '../src/lib/auth/accountIdentity';
import { AdminError } from '../src/lib/admin/errors';
import { isSameOriginRequest } from '../src/lib/security/same-origin';
const actor = { id: 'verified-staff', email: 'owner@example.test', name: 'Owner' };
const request = (body: unknown, origin: string | null = 'https://galx.ai') => new NextRequest('https://galx.ai/api/admin/preview', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), 'x-user-id': 'victim', 'x-role': 'owner' }, body: JSON.stringify(body),
});
test('CSRF checks the HTTP target host and port, including Next loopback normalization', () => {
  const req = (origin: string, host = '127.0.0.1:3421') => new NextRequest('http://localhost:3421/api/admin/preview', { headers: {origin,host} });
  assert.equal(isSameOriginRequest(req('http://127.0.0.1:3421')),true);
  for (const origin of ['http://127.0.0.1:3422','https://127.0.0.1:3421','http://localhost:3421','null','http://127.0.0.1:3421/path']) assert.equal(isSameOriginRequest(req(origin)),false);
  assert.equal(isSameOriginRequest(new NextRequest('https://galx.ai/api/admin/preview', {headers:{origin:'https://evil.galx.ai',host:'galx.ai'}})),false);
});
test('admin endpoints require a verified staff session and sanitize failures', async () => {
  for (const error of [new AccountIdentityError('private auth detail'), new AdminError(403,'forbidden','Staff access required.'), new Error('postgres://secret topology sentinel')]) {
    const handlers = createPreviewAdminHandlers({ identity: async () => { throw error; }, repository: () => { throw new Error('must not run'); } });
    const response = await handlers.GET(new NextRequest('https://galx.ai/api/admin/preview?view=requests'));
    assert.equal(response.status, error instanceof AccountIdentityError ? 401 : error instanceof AdminError ? 403 : 503);
    assert(!/private auth|postgres|topology|secret/.test(await response.text()));
    assert.equal(response.headers.get('access-control-allow-origin'), null); assert.match(response.headers.get('cache-control')!, /private, no-store/);
  }
});
test('admin writes reject CSRF, malformed input and oversized bodies before mutation', async () => {
  let calls=0;
  const repo = { session: async () => ({...actor, role:'owner'}), review: async () => { calls++; return {saved:true}; } } as unknown as PreviewAdminRepository;
  const handlers = createPreviewAdminHandlers({identity:async()=>actor,repository:()=>repo});
  const valid = { action:'review', user_id:'applicant', revision:1, status:'approved', expires_in_days:30, reason:'Small first cohort.' };
  for (const origin of ['https://evil.example', 'null', null]) assert.equal((await handlers.POST(request(valid,origin))).status,403);
  for (const input of [null, [], {...valid,revision:0}, {...valid,status:'owner'}, {...valid,expires_in_days:3650}, {...valid,reason:'x'.repeat(13000)}, {...valid,user_id:''}, {...valid,reason:'x'}]) assert.equal((await handlers.POST(request(input))).status,400);
  assert.equal(calls,0);
  assert.equal((await handlers.POST(request(valid))).status,200); assert.equal(calls,1);
});
test('decisions use authenticated reviewer identity and explicit request fields', async () => {
  let args: unknown[]=[];
  const repo = {session:async()=>({...actor,role:'owner'}), review:async(...input:unknown[])=>{args=input;return{saved:true};}} as unknown as PreviewAdminRepository;
  const handlers=createPreviewAdminHandlers({identity:async()=>actor,repository:()=>repo});
  const response=await handlers.POST(request({action:'review',user_id:'applicant',revision:4,status:'approved',reason:'Reviewed the project.',expires_in_days:7,reviewed_by:'spoof',role:'owner',headers:{authorization:'internal'}}));
  assert.equal(response.status,200);assert.deepEqual(args,[actor,'applicant',4,'approved','Reviewed the project.',7]);
  assert.deepEqual(await response.json(),{saved:true});
});
test('direct route handlers and middleware reject forged admin credentials', async () => {
  const {GET,POST}=await import('../src/app/api/admin/preview/route');
  const req=new NextRequest('https://galx.ai/api/admin/preview?view=requests',{headers:{authorization:'Bearer galx_sess_invalid','x-galx-internal-key':'invalid','x-role':'owner','x-user-id':'owner','x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}});
  assert.equal((await GET(req)).status,401);
  const forgedPost = request({action:'staff',email:'attacker@example.test',role:'owner'});
  forgedPost.headers.set('authorization', 'Bearer galx_sess_invalid');
  assert.equal((await POST(forgedPost)).status,401);
  const {previewMiddleware}=await import('../src/lib/security/preview-middleware');
  assert.equal((await previewMiddleware(req))?.status,401);
  const chunk=new NextRequest('https://galx.ai/_next/static/chunks/app/admin/page-fixture.js',{headers:{authorization:'Bearer galx_sess_invalid'}});
  assert.equal((await previewMiddleware(chunk))?.status,401);
});
test('crawler denial does not disclose operational diagnostics', async () => {
  const { middleware } = await import('../src/middleware');
  const response = await middleware(new NextRequest('https://galx.ai/api/internal/training', { headers: { 'user-agent': 'Googlebot' } }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {error:{code:'access_denied',message:'Access denied.'}});
});
