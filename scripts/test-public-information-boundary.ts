import test from 'node:test';
import assert from 'node:assert/strict';
import { hasInternalAccess } from '../src/lib/security/internal-access';
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

test('industry pages expose capabilities without internal topology or unverified infrastructure claims', async () => {
  const { INDUSTRIES_DATA } = await import('../src/lib/data/industriesData');
  const published = JSON.stringify(INDUSTRIES_DATA);
  assert.doesNotMatch(
    published,
    /anycast|edge\s+(?:node|pop)|\b(?:routing|route)\b|cloud\s+cluster|volatile\s+(?:ram|memory)|active-active|upstream|x-galxai-jurisdiction|fedramp|fips\s*140|pci\s*dss|soc\s*[12]|iso\/iec|galx_live/i,
  );
  assert.doesNotMatch(published, /guaranteed|zero\s+data\s+retention|cryptographic\s+zero/i);
});
