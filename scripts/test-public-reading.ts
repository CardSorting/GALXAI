import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { PUBLIC_READING_PATHS, PUBLIC_NAVIGATION } from '../src/lib/public-content/routes';
import { GUIDES, FAQS, filterGuides } from '../src/lib/public-content/content';
import { isPublicProductPath } from '../src/lib/security/preview-policy';
import { previewMiddleware } from '../src/lib/security/preview-middleware';
import { constructMetadata } from '../src/lib/seo/metadata';
import sitemap from '../src/app/sitemap';

test('every authored guide has one public, canonical, sitemap-listed destination', () => {
  const routes = new Set<string>(PUBLIC_READING_PATHS);
  assert.equal(routes.size, PUBLIC_READING_PATHS.length);
  assert.equal(new Set(GUIDES.map(guide => guide.path)).size, GUIDES.length);
  const urls = new Set(sitemap().map(entry => new URL(entry.url).pathname));
  for (const path of routes) {
    assert(isPublicProductPath(path), path);
    assert(urls.has(path), path);
    assert.match(path, /^\/[a-z-]+(?:\/[a-z-]+)?$/);
  }
  for (const guide of GUIDES) {
    assert(routes.has(guide.path));
    assert.equal(new Set(guide.sections.map(section => section.id)).size, guide.sections.length);
    for (const related of guide.related) assert(routes.has(related), related);
    const metadata = constructMetadata({ title: guide.title, canonicalPath: guide.path });
    assert.equal(new URL(String(metadata.alternates?.canonical)).origin, 'https://galx.ai');
    assert.equal(new URL(String(metadata.alternates?.canonical)).pathname, guide.path);
    assert.deepEqual(metadata.title, { absolute: `${guide.title} | GALXAI` });
  }
  for (const faq of FAQS) assert(GUIDES.some(guide => guide.path === faq.guide));
  for (const item of PUBLIC_NAVIGATION) assert(!item.href.includes('#'));
});

test('reading exemptions remain exact; misleading paths cannot expose private guides or APIs', () => {
  for (const path of ['/docs','/post-mortem','/knowledge-base/private','/knowledge-base/getting-started/debug',
    '/pricing/private','/pricing/galx-pro/admin','/pricing.json','/faq/internal', '/faq.css',
    '/knowledge-base/../docs','/knowledge-base/%2e%2e/docs','/api/knowledge-base','/api/admin','/v1/chat/completions']) {
    assert.equal(isPublicProductPath(path), false, path);
  }
});

test('anonymous, fake-user and prefetch requests can read only the curated pages and their chunks', async () => {
  for (const path of PUBLIC_READING_PATHS) {
    for (const headers of [{}, { authorization: 'Bearer ordinary-user-token', rsc: '1', 'next-router-prefetch': '1' }]) {
      assert.equal(await previewMiddleware(new NextRequest('https://galx.ai' + path, { headers })), null);
    }
    const chunk = `/_next/static/chunks/app${path}/page-test.js`;
    assert.equal(await previewMiddleware(new NextRequest('https://galx.ai' + chunk)), null);
  }
  const denied = await previewMiddleware(new NextRequest('https://galx.ai/docs?token=do-not-reflect', { headers: { rsc: '1', 'next-router-prefetch': '1' } }));
  assert.equal(denied?.status, 307);
  assert.equal(denied?.headers.get('location'), 'https://galx.ai/developers');
  assert.doesNotMatch(await denied!.text(), /do-not-reflect/);
});

test('search finds body text, tolerates whitespace/case, combines terms and recovers from no results', () => {
  assert.deepEqual(filterGuides('  CANCEL  ', 'All topics').map(guide => guide.path), filterGuides('cancel', 'All topics').map(guide => guide.path));
  assert(filterGuides('pottery', 'All topics').some(guide => guide.path.endsWith('/getting-started')));
  assert(filterGuides('paid period', 'Plans and billing').every(guide => guide.category === 'Plans and billing'));
  assert.equal(filterGuides('zzzz-no-match', 'All topics').length, 0);
  assert.equal(filterGuides('', 'All topics').length, GUIDES.length);
  assert.equal(filterGuides('', 'All topics')[0].path, '/knowledge-base/getting-started');
  assert.equal(filterGuides('<script>alert(1)</script>', 'All topics').length, 0);
});

test('public guidance contains no internal implementation or fabricated commercial claims', () => {
  assert.doesNotMatch(JSON.stringify({ GUIDES, FAQS }), /shard|upstream|supabase|broccolidb|credential source|topology|executionModel|checkpoint|100% uptime|SOC 2|free credits/i);
});
