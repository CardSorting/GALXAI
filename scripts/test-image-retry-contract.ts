import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/v1/images/generations/route';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '../src/core/subscription/GalxSeatTierEngine';
import { galxRouter } from '../src/core/router/GalxModelRouter';
import { ImageCapacityError } from '../src/core/router/ImageCapacityError';
import { RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
import { isSystemicFailure } from '../src/lib/stars/StarPopulationController';
import { ImageRequestService } from '../src/lib/images/request-service';

const auth = GalxAuthEngine.getInstance;
const seat = GalxSeatTierEngine.getInstance;
const route = galxRouter.routeImageGeneration;
const service = ImageRequestService.getInstance;
try {
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ authenticated: true, userId: 'fixture' }) }) as any;
  GalxSeatTierEngine.getInstance = () => ({ resolveUserSeatTier: async () => ({ isCapped: false, isPriorityUser: false, tier: 'standard' }) }) as any;
  ImageRequestService.getInstance = () => ({
    create: async (owner: string, payload: any, options: any) => {
      assert.equal(owner, 'fixture');
      assert.deepEqual(options, { priority: false, schedule: false });
      return { id: '00000000-0000-4000-8000-000000000001', user_id: owner, state: 'queued', payload };
    },
    run: async (owner: string, id: string, reportFailure: boolean) => {
      try {
        await galxRouter.routeImageGeneration({ request: { prompt: 'test' }, userId: owner, requestId: id,
          workClass: 'private', isPriorityUser: false, signal: AbortSignal.timeout(1000) } as any);
      } catch (error) { if (reportFailure) throw error; }
    },
  }) as any;
  for (const failure of [new ImageCapacityError(Date.now() + 30000), new RelayDispatchError('image_deadline_or_cancelled')]) {
    galxRouter.routeImageGeneration = async () => { throw failure; };
    const response = await POST(new NextRequest('http://localhost/v1/images/generations', {
      method: 'POST', body: JSON.stringify({ prompt: 'test' }),
      headers: { 'content-type': 'application/json' }
    }));
    const body = await response.json();
    assert.equal(response.status, failure instanceof ImageCapacityError ? 503 : 504);
    assert.match(response.headers.get('x-request-id')!, /^[a-f0-9-]{36}$/);
    assert.equal(response.headers.get('x-galx-request-id'), null);
    assert.equal(response.headers.get('ratelimit-limit'), null);
    assert.equal(response.headers.get('x-should-retry'), 'false');
    assert.equal(body.error.code, failure instanceof ImageCapacityError ? 'temporarily_unavailable' : 'timeout');
    assert.deepEqual(Object.keys(body.error).sort(), ['code', 'message', 'request_id']);
  }
  console.log('PASS: image HTTP retry hints distinguish admission from ambiguous dispatch and carry request IDs.');
} finally {
  GalxAuthEngine.getInstance = auth;
  GalxSeatTierEngine.getInstance = seat;
  galxRouter.routeImageGeneration = route;
  ImageRequestService.getInstance = service;
}

// Exercise the actual dispatcher decision without starting persistence workers.
const { GalxTaskQueueEngine } = await import('../src/core/queue/GalxTaskQueueEngine');
for (const failure of [new Error('transport disconnected'), Object.assign(new Error('retry requested'), {isPermanent:false,statusCode:503})]) {
  const engine = Object.create(GalxTaskQueueEngine.prototype) as any;
  const writes: any[] = []; let deadLetters = 0;
  engine.persistence = {taskTable:{put:(_id:string,value:any)=>writes.push(value)}};
  engine.eventBus = {emitEvent:()=>{}};
  engine.executeInternalModelTask = async () => { throw failure; };
  engine.routeToDeadLetter = () => { deadLetters++; };
  engine.updateTaskProgress = () => {};
  await engine.executeTaskOrPipeline({id:'image-receipt',userId:'owner',dispatchCount:1,attempts:[],target:{type:'INTERNAL_MODEL',taskKind:'image_generation',imagePayload:{prompt:'test'}}}, {id:'images',retryConfig:{maxAttempts:5}});
  assert.equal(deadLetters, 1);
  assert.equal(writes.some(task=>task.status==='RETRYING'), false);
}
console.log('PASS: queued image failures cannot trigger duplicate synthesis.');

assert.equal(isSystemicFailure(new RelayDispatchError('relay_http_503', {
  upstreamCode: 'request_unavailable', executionState: 'unknown', shouldRetry: false,
})), false, 'generic worker relay failures remain attempt-level outcomes');
assert.equal(isSystemicFailure(new RelayDispatchError('relay_fleet_unavailable', {
  upstreamCode: 'relay_fleet_unavailable', executionState: 'unknown', shouldRetry: false,
})), true, 'explicit fleet failures stop a bounded population');
console.log('PASS: Star systemic-stop classification distinguishes worker failures from fleet failures.');
