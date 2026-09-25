import test from 'node:test';
import assert from 'node:assert/strict';
import { hasInternalAccess } from '../src/lib/security/internal-access';
import { isPublicFrameworkAssetPath, isPublicProductPath } from '../src/lib/security/preview-policy';
import { GET as health } from '../src/app/api/health/route';

test('administrator access fails closed for missing, user, and malformed credentials', () => {
  const previous = process.env.GALX_INTERNAL_ADMIN_KEY;
  try {
    delete process.env.GALX_INTERNAL_ADMIN_KEY;
    assert.equal(hasInternalAccess(new Headers()), false);
    process.env.GALX_INTERNAL_ADMIN_KEY = 'test-internal-secret';
    assert.equal(hasInternalAccess(new Headers({ Authorization: 'Bearer valid-user-session' })), false);
    assert.equal(hasInternalAccess(new Headers({ 'x-galx-internal-key': 'wrong' })), false);
    assert.equal(hasInternalAccess(new Headers({ 'x-galx-internal-key': 'test-internal-secret' })), true);
  } finally {
    if (previous === undefined) delete process.env.GALX_INTERNAL_ADMIN_KEY;
    else process.env.GALX_INTERNAL_ADMIN_KEY = previous;
  }
});

test('public health does not enumerate infrastructure', async () => {
  const response = await health();
  assert.deepEqual(Object.keys(await response.json()).sort(), ['status', 'timestamp']);
  assert.equal(response.headers.get('x-galx-platform'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Star profiles and participant APIs are public product surfaces without broadening private routes', () => {
  assert.equal(isPublicProductPath('/profile/veyrasol'), true);
  assert.equal(isPublicProductPath('/profile/soravale'), true);
  assert.equal(isPublicProductPath('/api/community/participants/veyrasol'), true);
  assert.equal(isPublicProductPath('/api/community/participants/soravale'), true);
  assert.equal(isPublicProductPath('/profile/../../admin'), false);
  assert.equal(isPublicProductPath('/api/community/participants/invalid!'), false);
  assert.equal(isPublicProductPath('/api/community/participants/veyrasol/diagnostics'), false);
  assert.equal(isPublicFrameworkAssetPath('/_next/static/chunks/app/profile/%5Bhandle%5D/page-fixture.js'), true);
  assert.equal(isPublicFrameworkAssetPath('/_next/static/chunks/app/profile/%5Bhandle%5D/diagnostics/page-fixture.js'), false);
});

test('operational routes reject anonymous and ordinary bearer callers before collecting data', async () => {
  const { NextRequest } = await import('next/server');
  const routes = [
    await import('../src/app/api/relay/status/route'),
    await import('../src/app/api/internal/telemetry/route'),
    await import('../src/app/api/queues/route'),
  ];
  for (const route of routes) {
    for (const headers of [{}, { authorization: 'Bearer ordinary-user-token' }]) {
      const response = await route.GET(new NextRequest('https://galx.ai/api/test', { headers }));
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'Not found' });
    }
  }
});

test('legacy execution and general task submission cannot bypass private image admission', async () => {
  const { NextRequest } = await import('next/server');
  const originalAdminKey = process.env.GALX_INTERNAL_ADMIN_KEY;
  process.env.GALX_INTERNAL_ADMIN_KEY = 'test-internal-image-boundary';
  try {
    const run = await import('../src/app/api/run/route');
    const noAuth = await run.POST(new NextRequest('https://galx.ai/api/run', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'image', prompt: 'must not dispatch' }),
    }));
    assert.equal(noAuth.status, 401, 'legacy image execution requires an authenticated developer or account');

    const internalOnly = await run.POST(new NextRequest('https://galx.ai/api/run', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-galx-internal-key': 'test-internal-image-boundary' },
      body: JSON.stringify({ type: 'image', prompt: 'must not dispatch' }),
    }));
    assert.equal(internalOnly.status, 401, 'an operational header is not a human identity or publishing grant');

    const queue = await import('../src/app/api/queues/[queueId]/tasks/route');
    for (const body of [
      { target: { type: 'INTERNAL_MODEL', taskKind: 'image_generation' } },
      { target: { type: 'HTTP_PUSH' }, pipelineSteps: [{ taskKind: 'image_generation' }] },
    ]) {
      const response = await queue.POST(new NextRequest('https://galx.ai/api/queues/image-gen/tasks', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-galx-internal-key': 'test-internal-image-boundary' },
        body: JSON.stringify(body),
      }), { params: Promise.resolve({ queueId: 'image-gen' }) });
      assert.equal(response.status, 403, 'general task submission rejects image work before queue admission');
    }
  } finally {
    if (originalAdminKey === undefined) delete process.env.GALX_INTERNAL_ADMIN_KEY;
    else process.env.GALX_INTERNAL_ADMIN_KEY = originalAdminKey;
  }
});

test('public model catalog contains no execution configuration', async () => {
  const { FRONTEND_VISIBLE_MODELS } = await import('../src/core/router/PublicModelCatalog');
  for (const model of FRONTEND_VISIBLE_MODELS) {
    assert.equal('upstreamId' in model, false);
    assert.doesNotMatch(JSON.stringify(model), /codex|shard|relay|checkpoint|topology|executionModel/i);
  }
});

test('published documentation does not include operational implementation vocabulary', async () => {
  const { readFile } = await import('node:fs/promises');
  const paths = ['README.md', 'docs/API_REFERENCE.md', 'docs/API_BASE_URL.md', 'docs/QUICKSTART.md',
    'public/llms.txt', 'public/llms-full.txt', 'public/agents.txt', 'src/lib/data/capabilitiesData.ts', 'src/lib/data/glossaryData.ts', 'src/lib/data/errorsData.ts'];
  for (const path of paths) assert.doesNotMatch(await readFile(path, 'utf8'), /codex|shard|relay|checkpoint|topolog|upstream|P-AHT|VM_RELAY_URL|GALX_VAULT_|deploymentId/i, path);
});

test('sitemap lists discovery and public Stars, never private creation workspaces', async () => {
  const { default: sitemap } = await import('../src/app/sitemap');
  const paths = sitemap().map(entry => new URL(entry.url).pathname);
  assert(paths.includes('/explore'));
  assert(paths.some(path => path.startsWith('/profile/')));
  assert.equal(paths.some(path => path === '/images' || path.startsWith('/images/')), false);
  assert.equal(paths.some(path => /library|favorites|create|private/i.test(path)), false);
});

test('industry pages expose capabilities without internal topology or unverified infrastructure claims', async () => {
  const { INDUSTRIES_DATA } = await import('../src/lib/data/industriesData');
  const published = JSON.stringify(INDUSTRIES_DATA);
  assert.doesNotMatch(
    published,
    /anycast|edge\s+(?:node|pop)|\b(?:routing|route)\b|cloud\s+cluster|volatile\s+(?:ram|memory)|active-active|upstream|x-galxai-jurisdiction|fedramp|fips\s*140|pci\s*dss|soc\s*[12]|iso\/iec|galx_live/i,
  );
  assert.doesNotMatch(published, /guaranteed|zero\s+data\s+retention|cryptographic\s+zero/i);
});
