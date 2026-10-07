import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { EXHIBITIONS, EDITORIALS } from '../src/lib/exhibitions/catalog';
import { PUBLIC_PROGRAMME_PATHS } from '../src/lib/exhibitions/paths';
import { selectPublishedArtwork } from '../src/lib/exhibitions/public-artwork';
import { isPublicProductPath, isPublicFrameworkAssetPath } from '../src/lib/security/preview-policy';
import { previewMiddleware } from '../src/lib/security/preview-middleware';
import sitemap from '../src/app/sitemap';

test('the programme has exact canonical routes, complete captions and linked essays', () => {
  const paths = new Set<string>(PUBLIC_PROGRAMME_PATHS);
  const urls = new Set(sitemap().map(entry => new URL(entry.url).pathname));
  assert.equal(paths.size, PUBLIC_PROGRAMME_PATHS.length);
  const ids = new Set<string>();
  for (const show of EXHIBITIONS) {
    assert(paths.has(`/exhibitions/${show.slug}`));
    assert(urls.has(`/exhibitions/${show.slug}`));
    assert.equal(show.works.length, 12);
    assert(EDITORIALS.some(essay => essay.slug === show.editorialSlug && essay.exhibitionSlug === show.slug));
    for (const work of show.works) {
      assert(!ids.has(work.id)); ids.add(work.id);
      assert.match(work.id, /^img_[a-f0-9]{32}$/);
      assert(work.width > 0 && work.height > 0);
      assert(work.alt.length > 40 && work.caption.length > 80);
      assert.match(work.handle, /^[a-z0-9]+$/);
    }
  }
  for (const essay of EDITORIALS) {
    assert(paths.has(`/editorials/${essay.slug}`));
    assert(urls.has(`/editorials/${essay.slug}`));
    assert(EXHIBITIONS.find(show => show.slug === essay.exhibitionSlug)?.works.some(work => work.id === essay.imageId));
    assert(essay.paragraphs.join(' ').split(/\s+/).length >= 400);
  }
  assert.doesNotMatch(JSON.stringify({ EXHIBITIONS, EDITORIALS }), /supabase|upstream|credential|shard|executionModel|attemptId|personaVersion|residency-v2|P-AHT|checkpoint/i);
});

test('anonymous and ordinary users can read exact programme destinations and shared route templates', async () => {
  for (const path of PUBLIC_PROGRAMME_PATHS) {
    for (const headers of [{}, { authorization: 'Bearer ordinary-user', rsc: '1', 'next-router-prefetch': '1' }]) {
      assert.equal(await previewMiddleware(new NextRequest(`https://galx.ai${path}`, { headers })), null, path);
    }
  }
  for (const template of ['exhibitions', 'editorials']) {
    for (const encoded of ['[slug]', '%5Bslug%5D']) {
      const path = `/_next/static/chunks/app/${template}/${encoded}/page-reviewed.js`;
      assert.equal(isPublicFrameworkAssetPath(path), true);
      assert.equal(await previewMiddleware(new NextRequest(`https://galx.ai${path}`)), null);
    }
  }
});

test('programme exemptions do not disclose drafts, diagnostics, APIs or private chunks', async () => {
  for (const path of ['/exhibitions/draft', '/editorials/private', '/exhibitions/instruments-for-the-impossible/debug',
    '/exhibitions.json', '/editorials/reading-the-trace/admin', '/api/exhibitions', '/api/editorials',
    '/exhibitions/%2e%2e/post-mortem', '/post-mortem', '/exhibitions/%E0%A4%A']) {
    assert.equal(isPublicProductPath(path), false, path);
    const response = await previewMiddleware(new NextRequest(`https://galx.ai${path}?token=private-sentinel`, { headers: { authorization: 'Bearer ordinary-user', rsc: '1' } }));
    assert.equal(response?.status, path.startsWith('/api/') ? 401 : 404, path);
    assert.doesNotMatch(await response!.text(), /private-sentinel|ordinary-user/);
  }
  for (const path of ['/_next/static/chunks/app/exhibitions/[slug]/diagnostics/page-secret.js',
    '/_next/static/chunks/app/editorials/private/page-secret.js']) assert.equal(isPublicFrameworkAssetPath(path), false);
});

test('an exhibition accepts only the selected published work by the correct STAR and an opaque artifact URL', () => {
  const work = EXHIBITIONS[0].works[0];
  const valid = { id: work.id, public_url: '/v1/images/assets/opaque-signed-token', author: { handle: work.handle, participantKind: 'star' } };
  const poison = { ...valid, prompt: 'private-sentinel', upstream: { secret: 'private-sentinel' }, user_id: 'private-owner', dimensions: 'request-not-actual' };
  const result = selectPublishedArtwork(work, [poison]);
  assert.deepEqual(result, { id: work.id, src: valid.public_url, thumbnailSrc: null });
  assert.equal(selectPublishedArtwork(work, [{ ...valid, thumbnail_url: `${valid.public_url}/thumbnail` }]).thumbnailSrc, `${valid.public_url}/thumbnail`);
  assert.equal(selectPublishedArtwork(work, [{ ...valid, thumbnail_url: '/v1/images/assets/different/thumbnail' }]).thumbnailSrc, null);
  assert.doesNotMatch(JSON.stringify(result), /private-sentinel|private-owner|dimensions/);
  for (const candidate of [
    { ...valid, id: 'unselected' },
    { ...valid, author: { handle: 'someoneelse', participantKind: 'star' } },
    { ...valid, author: { handle: work.handle, participantKind: 'human' } },
    ...['https://storage.example/private.png', '//evil.example/image', 'javascript:alert(1)', '/v1/images/assets/token/diagnostics', '/v1/images/assets/../secret', '/v1/images/assets/token?secret=1', ''].map(public_url => ({ ...valid, public_url })),
    null, 'not-a-row', {},
  ]) assert.deepEqual(selectPublishedArtwork(work, [candidate]), { id: work.id, src: null, thumbnailSrc: null });
  assert.deepEqual(selectPublishedArtwork(work, []), { id: work.id, src: null, thumbnailSrc: null });
});
