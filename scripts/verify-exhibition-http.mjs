import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { EXHIBITIONS, EDITORIALS } from '../src/lib/exhibitions/catalog.ts';

const base = process.env.GALX_UI_BASE || 'http://127.0.0.1:3421';
const output = process.env.GALX_EXHIBITION_HTTP_RESULT || '.impeccable/review/exhibitions/http-verification.json';
const privateText = /P-AHT|GALX_VAULT_|GALX_INTERNAL_|executionModel|upstreamId|personaVersion|attemptId|credential source|shard configuration|post-mortem\/|residency-v2|dcd3f989|service_role|community_star_profile_creations/i;
const pages = ['/exhibitions', '/editorials', ...EXHIBITIONS.map(show => `/exhibitions/${show.slug}`), ...EDITORIALS.map(essay => `/editorials/${essay.slug}`)];
const assets = new Set();
const imageUrls = new Set();
const imageDimensions = new Map();
const results = [];
async function read(path, headers) {
  const response = await fetch(new URL(path, base), { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.doesNotMatch([...response.headers].map(([key, value]) => `${key}: ${value}`).join('\n'), privateText, `headers: ${path}`);
  return response;
}
for (const path of pages) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.doesNotMatch(html, privateText, path);
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('main h1').length, 1, path);
  assert(!html.includes('Artwork temporarily unavailable'), `published artworks missing: ${path}`);
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  assert.equal(new URL(canonical).pathname, path);
  if (path === '/editorials') {
    assert.equal(document.querySelectorAll('main article').length, EDITORIALS.length);
    assert(!document.querySelector('meta[http-equiv="refresh"]'));
    for (const essay of EDITORIALS) assert(document.querySelector(`main h2 a[href="/editorials/${essay.slug}"]`));
  }
  if (path.startsWith('/editorials/')) {
    const essay = EDITORIALS.find(item => path.endsWith(`/${item.slug}`));
    assert.equal(document.querySelector('meta[property="og:type"]')?.content, 'article');
    const schema = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => JSON.parse(node.textContent)).find(item => item['@type'] === 'Article');
    assert.equal(schema?.headline, essay.title);
    assert.equal(schema?.datePublished, essay.publishedOn);
    assert.deepEqual(Object.keys(schema).sort(), ['@context', '@type', 'author', 'datePublished', 'description', 'headline', 'mainEntityOfPage']);
    assert(document.querySelector(`main time[datetime="${essay.publishedOn}"]`));
    assert(document.querySelector('nav[aria-label="Breadcrumb"] a[href="/editorials"]'));
    assert.equal(document.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent, essay.title);
    const actions = document.querySelector('[role="group"][aria-label="Essay actions"]');
    assert(actions?.querySelector('a[href="#illustrated-work"]'));
    assert.deepEqual([...actions.querySelectorAll('button')].map(button => button.textContent), ['Copy link', 'Print']);
    const figure = document.querySelector('#illustrated-work');
    assert.equal(figure.querySelector('img')?.getAttribute('loading'), 'eager');
    assert(figure?.textContent.includes(EXHIBITIONS.flatMap(show => show.works).find(work => work.id === essay.imageId).caption));
    assert.equal(figure.previousElementSibling.textContent, essay.paragraphs[essay.figureAfterParagraph - 1]);
    assert(document.querySelector('nav[aria-labelledby="read-next"] a[href="/editorials"]'));
  }
  // React can deliver media in streamed segments outside main before hydration.
  const images = [...document.querySelectorAll('img[src^="/v1/images/assets/"]')];
  for (const image of images) {
    assert(image.alt.length > 30, path);
    assert.match(image.getAttribute('src'), /^\/v1\/images\/assets\/[A-Za-z0-9._-]+(?:\/thumbnail)?$/);
    imageUrls.add(image.getAttribute('src'));
    if (!image.getAttribute('src').endsWith('/thumbnail')) {
      const dimensions = { width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')) };
      assert(dimensions.width > 0 && dimensions.height > 0, path);
      imageDimensions.set(image.getAttribute('src'), dimensions);
    }
  }
  if (path.startsWith('/exhibitions/')) assert.equal(images.length, 12);
  if (path.startsWith('/editorials/')) assert.equal(images.length, 1);
  for (const node of document.querySelectorAll('script[src],link[rel="stylesheet"]')) assets.add(node.getAttribute('src') || node.getAttribute('href'));
  const rsc = await read(path, { rsc: '1', 'next-router-prefetch': '1' });
  assert.equal(rsc.status, 200);
  assert.doesNotMatch(await rsc.text(), privateText, `RSC: ${path}`);
  results.push({ path, status: response.status, images: images.length, canonical, bodySha256: createHash('sha256').update(html).digest('hex') });
}
const bundles = [];
for (const path of assets) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  const source = await response.text();
  assert.doesNotMatch(source, privateText, path);
  bundles.push({ path, status: response.status, sha256: createHash('sha256').update(source).digest('hex') });
}
const artifacts = [];
for (const path of imageUrls) {
  const response = await read(path);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^image\//);
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  assert(!metadata.exif && !metadata.xmp && !metadata.iptc && !metadata.icc && !metadata.comments?.length);
  const dimensions = imageDimensions.get(path);
  if (dimensions) assert.deepEqual({ width: metadata.width, height: metadata.height }, dimensions, 'published intrinsic image dimensions');
  artifacts.push({ kind: path.endsWith('/thumbnail') ? 'thumbnail' : 'image', status: response.status, width: metadata.width, height: metadata.height, metadataAbsent: true, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const denials = [];
for (const path of ['/exhibitions/draft', '/editorials/private', '/exhibitions/instruments-for-the-impossible/diagnostics', '/api/exhibitions', '/v1/images/assets/invalid-token', '/api/relay/status']) {
  for (const headers of [{}, { authorization: 'Bearer ordinary-user' }]) {
    const response = await read(path, headers);
    assert([401, 404].includes(response.status), path);
    assert.doesNotMatch(await response.text(), privateText, path);
    denials.push({ path, ordinaryBearer: Boolean(headers.authorization), status: response.status });
  }
}
await mkdir('.impeccable/review/exhibitions', { recursive: true });
await writeFile(output, JSON.stringify({ version: 1, classification: 'private', observedAt: new Date().toISOString(), target: base, pages: results, bundles, artifacts, denials, limits: 'Local production HTTP/artifact checks, not a hosted deployment or full accessibility audit.' }, null, 2) + '\n');
console.log(`Verified ${results.length} pages, ${bundles.length} browser assets, ${artifacts.length} sanitized artifacts and ${denials.length} denials.`);
