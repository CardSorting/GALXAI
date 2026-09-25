import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getFeed } from '../src/app/api/images/feed/route';
import { GET as getAsset } from '../src/app/v1/images/assets/[token]/route';
import { GET as getThumbnail } from '../src/app/v1/images/assets/[token]/thumbnail/route';
import { closePostgresPool } from '../src/lib/db/postgres';

test('community stream audit: 0 broken test fixtures leak into feed', async () => {
  const req = new NextRequest('http://localhost:3000/api/images/feed?limit=48');
  const res = await getFeed(req);
  assert.equal(res.status, 200, 'Feed endpoint must return 200 OK');

  const data = await res.json();
  assert.equal(data.success, true, 'Feed response must indicate success: true');
  assert.ok(Array.isArray(data.items), 'Feed response must return array of items');
  assert.ok(data.items.length > 0, 'Feed response must contain showcase & authentic creations');

  for (const item of data.items) {
    // 1. Assert no synthetic test items leak
    assert.equal(
      item.id.startsWith('img_test_'),
      false,
      `Synthetic test item "${item.id}" must never appear in public feed`
    );

    // 2. Assert valid properties
    assert.ok(item.id && typeof item.id === 'string', 'Item must have valid string id');
    assert.equal('prompt' in item, false, 'Public work metadata must not expose production prompts');
    assert.equal('remix_count' in item, false, 'Public work metadata must not expose a free remix counter');
    assert.ok(item.aspect_ratio && typeof item.aspect_ratio === 'string', 'Item must have valid aspect_ratio');
    assert.ok(item.public_url && typeof item.public_url === 'string', 'Item must have valid public_url');
    assert.ok(item.author?.displayName, 'Public work metadata must keep Star attribution');

    // 3. Test URL mapping
    if (item.public_url.startsWith('/v1/images/assets/')) {
      const token = item.public_url.replace('/v1/images/assets/', '');
      const assetRes = await getAsset(new NextRequest(`http://localhost:3000${item.public_url}`), {
        params: Promise.resolve({ token }),
      });
      assert.equal(
        assetRes.status,
        200,
        `Capability asset for item "${item.id}" must resolve with 200 OK (got ${assetRes.status})`
      );
      assert.ok(
        assetRes.headers.get('content-type')?.startsWith('image/'),
        'Asset response must serve valid image content-type'
      );

      // Verify thumbnail capability
      const thumbRes = await getThumbnail(
        new NextRequest(`http://localhost:3000${item.public_url}/thumbnail`),
        { params: Promise.resolve({ token }) }
      );
      assert.equal(
        thumbRes.status,
        200,
        `Thumbnail capability for item "${item.id}" must resolve with 200 OK (got ${thumbRes.status})`
      );
    } else {
      // Showcase items must map to /images/showcase/
      assert.ok(
        item.public_url.startsWith('/images/showcase/'),
        `Static showcase item must map to /images/showcase/ (got ${item.public_url})`
      );
    }
  }
});

test('community stream audit: aspect ratio and search filters adhere strictly', async () => {
  // Test aspect ratio filter: 16:9
  const ratioReq = new NextRequest('http://localhost:3000/api/images/feed?aspect_ratio=16:9');
  const ratioRes = await getFeed(ratioReq);
  const ratioData = await ratioRes.json();
  assert.equal(ratioRes.status, 200);
  assert.ok(ratioData.items.length > 0, 'Must return 16:9 items');
  for (const it of ratioData.items) {
    assert.equal(it.aspect_ratio, '16:9', `Expected ratio 16:9, got ${it.aspect_ratio}`);
  }

  // Public discovery search matches Star identity, never production prompt text.
  const firstItem = ratioData.items[0];
  const query = firstItem.author.handle || firstItem.author.displayName;
  const queryReq = new NextRequest(`http://localhost:3000/api/images/feed?q=${encodeURIComponent(query)}`);
  const queryRes = await getFeed(queryReq);
  const queryData = await queryRes.json();
  assert.equal(queryRes.status, 200);
  assert.ok(queryData.items.length > 0, 'Must return works matching the Star identity search');
  for (const it of queryData.items) {
    assert.ok(
      (it.author.handle || '').toLowerCase().includes(query.toLowerCase()) ||
        it.author.displayName.toLowerCase().includes(query.toLowerCase()),
      'Search results must match public Star identity fields',
    );
  }
});

test('community stream audit: pagination terminates cleanly without loop', async () => {
  const req = new NextRequest('http://localhost:3000/api/images/feed?limit=24');
  const res = await getFeed(req);
  const data = await res.json();
  assert.equal(res.status, 200);

  if (data.nextCursor) {
    const page2Req = new NextRequest(`http://localhost:3000/api/images/feed?limit=24&cursor=${data.nextCursor}`);
    const page2Res = await getFeed(page2Req);
    const page2Data = await page2Res.json();
    assert.equal(page2Res.status, 200);
    assert.ok(Array.isArray(page2Data.items));
  } else {
    assert.equal(data.nextCursor, null, 'nextCursor must be null when all items fit in first page');
  }
});

test('community stream audit: direct image deep-linking prioritizes item at index 0', async () => {
  // 1. Showcase creation deep-link
  const showcaseReq = new NextRequest('http://localhost:3000/api/images/feed?image=showcase-blonde-elf');
  const showcaseRes = await getFeed(showcaseReq);
  assert.equal(showcaseRes.status, 200);
  const showcaseData = await showcaseRes.json();
  assert.equal(
    showcaseData.items[0]?.id,
    'showcase-blonde-elf',
    'Requested showcase item must be positioned at index 0 of feed'
  );

  // 2. Database creation deep-link
  const dbReq = new NextRequest('http://localhost:3000/api/images/feed?image=img_1789269951444_6a644f57');
  const dbRes = await getFeed(dbReq);
  assert.equal(dbRes.status, 200);
  const dbData = await dbRes.json();
  assert.equal(
    dbData.items[0]?.id,
    'img_1789269951444_6a644f57',
    'Requested database item must be prioritized at index 0 of feed'
  );

  // 3. Non-existent ID falls back gracefully without crashing
  const missingReq = new NextRequest('http://localhost:3000/api/images/feed?image=img_nonexistent_random_id');
  const missingRes = await getFeed(missingReq);
  assert.equal(missingRes.status, 200);
  const missingData = await missingRes.json();
  assert.equal(missingData.success, true);
  assert.ok(missingData.items.length > 0, 'Feed should still deliver items when image_id does not exist');
});

test('community stream audit: trending keyset pagination sorting and interactions', async (t) => {
  t.after(async () => {
    await closePostgresPool();
  });

  // Test sort=trending
  const trendingReq = new NextRequest('http://localhost:3000/api/images/feed?sort=trending');
  const trendingRes = await getFeed(trendingReq);
  assert.equal(trendingRes.status, 200);
  const trendingData = await trendingRes.json();
  assert.equal(trendingData.success, true);
  assert.ok(trendingData.items.length > 0);

  // Verify descending likes order
  for (let i = 0; i < trendingData.items.length - 1; i++) {
    const currLikes = trendingData.items[i].likes_count ?? 0;
    const nextLikes = trendingData.items[i + 1].likes_count ?? 0;
    assert.ok(
      currLikes >= nextLikes,
      `Trending feed items must be sorted in descending likes order: ${currLikes} >= ${nextLikes}`
    );
  }
});
