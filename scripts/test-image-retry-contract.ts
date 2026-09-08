import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/v1/images/generations/route';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '../src/core/subscription/GalxSeatTierEngine';
import { galxRouter } from '../src/core/router/GalxModelRouter';
import { ImageCapacityError } from '../src/core/router/ImageCapacityError';
import { RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';

const auth = GalxAuthEngine.getInstance;
const seat = GalxSeatTierEngine.getInstance;
const route = galxRouter.routeImageGeneration;
try {
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ authenticated: true, userId: 'fixture' }) }) as any;
  GalxSeatTierEngine.getInstance = () => ({ resolveUserSeatTier: async () => ({ isCapped: false, tier: 'standard' }) }) as any;
  for (const failure of [new ImageCapacityError(Date.now() + 30000), new RelayDispatchError('image_deadline_or_cancelled')]) {
    galxRouter.routeImageGeneration = async () => { throw failure; };
    const response = await POST(new NextRequest('http://localhost/v1/images/generations', {
      method: 'POST', body: JSON.stringify({ prompt: 'test', model: 'openai-gpt-image-latest' }),
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
}
