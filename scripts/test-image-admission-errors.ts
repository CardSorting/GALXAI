import assert from 'node:assert/strict';
import { GalxModelRouter } from '../src/core/router/GalxModelRouter';
import { ImageCapacityError } from '../src/core/router/ImageCapacityError';

const router = Object.create(GalxModelRouter.prototype) as any;
router.substrate = { ensureFreshFromAuthority: async () => {} };
router.privacyEngine = {
  resolvePrivacyPolicy: () => ({}),
  sanitizeImageRequest: (request: unknown) => ({ sanitizedRequest: request }),
};
router.resolveAffinityShard = () => undefined;
for (const reason of ['SHARD_NOT_HEALTHY', 'SHARD_COOLDOWN', 'SHARD_CONCURRENCY_EXHAUSTED', 'SHARD_TOKEN_QUOTA_EXHAUSTED']) {
  router.pool = { acquireLeaseAuthoritatively: async (request: any) => {
    assert.equal(request.queueIfExhausted, false, 'rejected images must not leave an unobserved queued lease');
    return { status: 'no_healthy_shards', reason };
  } };
  await assert.rejects(router.routeImageGeneration({
    request: { model: 'openai-gpt-image-latest', prompt: 'test' }, userId: 'test', requestId: 'test',
  }), (error: Error) => {
    assert(error instanceof ImageCapacityError);
    assert.equal(error.status, 503);
    assert.equal(error.retryAfterSeconds, 5);
    assert.notEqual(GalxModelRouter.sanitizeUpstreamError(error.message), 'route');
    return true;
  });
  assert.notEqual(GalxModelRouter.sanitizeUpstreamError(reason), 'route');
}
console.log('PASS: image admission errors retain availability classification and never collapse to route.');
