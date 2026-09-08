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
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ userId: 'fixture' }) }) as any;
  GalxSeatTierEngine.getInstance = () => ({ resolveUserSeatTier: async () => ({ isCapped: false, tier: 'standard' }) }) as any;
  for (const failure of [new ImageCapacityError(Date.now() + 30000), new RelayDispatchError('image_deadline_or_cancelled')]) {
    galxRouter.routeImageGeneration = async () => { throw failure; };
    const response = await POST(new NextRequest('http://localhost/v1/images/generations', {
      method: 'POST', body: JSON.stringify({ prompt: 'test', model: 'openai-gpt-image-latest' }),
      headers: { 'content-type': 'application/json' }
    }));
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.match(response.headers.get('x-request-id')!, /^img_/);
    assert.equal(response.headers.get('x-request-id'), response.headers.get('x-galx-request-id'));
    assert.equal(response.headers.get('ratelimit-limit'), null, 'never invent a provider quota');
    if (failure instanceof ImageCapacityError) {
      assert.equal(response.headers.get('retry-after'), '30');
      assert.equal(body.error.retry_after_seconds, 30);
      assert.equal(body.error.code, 'image_capacity_unavailable');
      assert.equal(response.headers.get('x-should-retry'), 'true');
    } else {
      assert.equal(response.headers.get('x-should-retry'), 'false', 'ambiguous image work must not replay automatically');
      assert.equal(body.error.code, 'relay_unavailable');
    }
  }
  console.log('PASS: image HTTP retry hints distinguish admission from ambiguous dispatch and carry request IDs.');
} finally {
  GalxAuthEngine.getInstance = auth;
  GalxSeatTierEngine.getInstance = seat;
  galxRouter.routeImageGeneration = route;
}
