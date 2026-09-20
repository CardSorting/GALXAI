import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../src/app/sitemap';
import { isPublicProductPath } from '../src/lib/security/preview-policy';
import {
  mapPublicParticipantCreationRow,
  mapPublicParticipantProfileRow,
  isValidPublicParticipantCursor,
  normalizePublicParticipantHandle,
} from '../src/lib/community/public-participants';

test('public participant handles normalize safely and reject traversal-shaped values', () => {
  assert.equal(normalizePublicParticipantHandle(' SoraVale '), 'soravale');
  assert.equal(normalizePublicParticipantHandle('so'), null);
  assert.equal(normalizePublicParticipantHandle('sora/vale'), null);
  assert.equal(normalizePublicParticipantHandle('../settings'), null);
  assert.equal(normalizePublicParticipantHandle(null), null);
  assert.equal(isValidPublicParticipantCursor('not-a-cursor'), false);
  assert.equal(
    isValidPublicParticipantCursor(Buffer.from('2026-09-19T00:00:00.000Z,creation-1').toString('base64')),
    true,
  );
});

test('participant profile projection is an explicit public DTO', () => {
  const profile = mapPublicParticipantProfileRow({
    display_name: ' Sora Vale ',
    handle: 'SoraVale',
    bio: ' A public creative profile. ',
    interests: ['light', 'space', 'light', { private: true }],
    avatar_url: 'javascript:alert(1)',
    participant_kind: 'human',
    creation_count: '3.9',
    created_at: 'private-field',
    creative_persona: { private: true },
  }, 'soravale');

  assert.deepEqual(Object.keys(profile).sort(), [
    'avatarUrl', 'bio', 'creationCount', 'displayName', 'handle', 'interests', 'participantKind',
  ]);
  assert.equal(profile.handle, 'soravale');
  assert.equal(profile.participantKind, 'star');
  assert.equal(profile.creationCount, 3);
  assert.equal(profile.avatarUrl, null);
  assert.deepEqual(profile.interests, ['light', 'space']);
  assert.equal('createdAt' in profile, false);
  assert.equal('creativePersona' in profile, false);
});

test('creation projection excludes database-only fields and canonicalizes attribution', () => {
  const creation = mapPublicParticipantCreationRow({
    id: 'showcase-sora-1',
    user_id: null,
    prompt: 'A luminous observatory',
    aspect_ratio: '1:1',
    dimensions: '1024x1024',
    public_url: '/images/showcase/sora-1.png',
    created_at: '2026-09-19T00:00:00.000Z',
    lqip: null,
    likes_count: 4,
    remix_count: 1,
    views_count: 8,
    author_display_name: 'Sora Vale',
    author_handle: 'SoraVale',
    author_avatar_url: null,
    participant_kind: 'star',
    seed: 'private-seed',
    model: 'private-model',
  });

  assert.deepEqual(Object.keys(creation).sort(), [
    'aspect_ratio', 'author', 'created_at', 'dimensions', 'id', 'likes_count', 'lqip',
    'prompt', 'public_url', 'remix_count', 'thumbnail_url', 'views_count',
  ]);
  assert.equal(creation.author.handle, 'soravale');
  assert.equal(creation.author.participantKind, 'star');
  assert.equal('seed' in creation, false);
  assert.equal('model' in creation, false);
});

test('profile routes are discoverable without broadening private path exemptions', () => {
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.ok(urls.includes('/profile/soravale'));
  assert.equal(isPublicProductPath('/profile/soravale'), true);
  assert.equal(isPublicProductPath('/api/community/participants/soravale'), true);
  assert.equal(isPublicProductPath('/profile/soravale/diagnostics'), false);
  assert.equal(isPublicProductPath('/api/community/participants/soravale/diagnostics'), false);
});
