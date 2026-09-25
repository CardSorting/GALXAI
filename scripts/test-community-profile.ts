import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  assert.equal(normalizePublicParticipantHandle('../admin'), null);
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
    prompt: 'PRIVATE_STAR_PROMPT_CANARY',
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
    'public_url', 'thumbnail_url', 'views_count',
  ]);
  assert.equal(creation.author.handle, 'soravale');
  assert.equal(creation.author.participantKind, 'star');
  assert.equal('seed' in creation, false);
  assert.equal('model' in creation, false);
  assert.equal('prompt' in creation, false);
  assert.equal('remix_count' in creation, false);
  assert.doesNotMatch(JSON.stringify(creation), /PRIVATE_STAR_PROMPT_CANARY/);
});

test('public feed contract hides production text and unauthenticated remix telemetry', () => {
  const feedRoute = readFileSync(resolve('src/app/api/images/feed/route.ts'), 'utf8');
  const dto = feedRoute.match(/export interface PublicFeedItem \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(dto, /\bprompt\b|\bremix_count\b/);
  assert.doesNotMatch(feedRoute, /action === 'remix'/);
  assert.match(feedRoute, /author_display_name ILIKE/);
  assert.match(feedRoute, /mapPublicParticipantCreationRow/);
});

test('new Star works require an explicit selection before public artifact delivery', async () => {
  const { isExhibitedStarAsset } = await import('../src/lib/images/read-image-artifact');
  const migration = readFileSync(resolve('supabase/migrations/20260925150000_star_selection_publication_gate.sql'), 'utf8');
  const rollback = readFileSync(resolve('supabase/rollbacks/20260925150000_star_selection_publication_gate.down.sql'), 'utf8');
  assert.equal(isExhibitedStarAsset({ workClass: 'star_published', isPublic: false, visibility: 'private' }), false);
  assert.equal(isExhibitedStarAsset({ workClass: 'star_published' }), false);
  assert.equal(isExhibitedStarAsset({ workClass: 'star_published', isPublic: true, visibility: 'public' }), true);
  assert.match(migration, /event_type = 'selection'/);
  assert.match(migration, /Only completed Star attempts can become practice candidates or selections/);
  assert.match(migration, /Generation creates an eligible Star Work candidate, not an exhibition/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.fn_increment_image_remix/);
  assert.match(migration, /REVOKE SELECT ON TABLE public\.user_image_stats/);
  assert.match(migration, /galx_reject_unmetered_remix_interaction/);
  assert.match(migration, /Remix activity requires a metered private generation/);
  assert.match(rollback, /Restore automatic Star publication behavior/);
  assert.match(rollback, /selection history remains/i);
});

test('profile routes are discoverable without broadening private path exemptions', () => {
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.ok(urls.includes('/stars'));
  assert.ok(urls.includes('/profile/soravale'));
  assert.equal(isPublicProductPath('/stars'), true);
  assert.equal(isPublicProductPath('/collections'), true);
  assert.equal(isPublicProductPath('/profile'), false);
  assert.equal(isPublicProductPath('/profile/soravale'), true);
  assert.equal(isPublicProductPath('/api/community/participants/soravale'), true);
  assert.equal(isPublicProductPath('/profile/soravale/diagnostics'), false);
  assert.equal(isPublicProductPath('/api/community/participants/soravale/diagnostics'), false);
});

test('Explore moderation stays separate from the complete Star profile gallery', () => {
  const migration = readFileSync(resolve('supabase/migrations/20260920072707_star_profile_explore_visibility_boundary.sql'), 'utf8');
  const repairMigration = readFileSync(resolve('supabase/migrations/20260920075103_restore_legacy_star_profile_visibility.sql'), 'utf8');
  const repository = readFileSync(resolve('src/lib/community/public-participants.ts'), 'utf8');
  const feedRoute = readFileSync(resolve('src/app/api/images/feed/route.ts'), 'utf8');
  const masonry = readFileSync(resolve('src/components/images/PublicImageMasonryStream.tsx'), 'utf8');
  const phaseThree = readFileSync(resolve('supabase/migrations/20260924020000_private_human_works_star_publication_boundary.sql'), 'utf8');

  assert.match(migration, /ADD COLUMN is_explore_visible BOOLEAN NOT NULL DEFAULT true/);
  assert.match(migration, /SET is_explore_visible = false/);
  assert.match(migration, /AND l\.is_explore_visible = true/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.community_star_profile_creations/);

  const profileView = migration.split('CREATE OR REPLACE VIEW public.community_star_profile_creations')[1] || '';
  assert.doesNotMatch(profileView, /is_explore_visible\s*=\s*true/);
  assert.match(repository, /FROM public\.community_star_profile_creations/);
  assert.match(feedRoute, /const feedView = authorHandle/);
  assert.match(feedRoute, /FROM \$\{feedView\}/);
  assert.match(masonry, /const visible = authorHandle\s*\n\s*\? data\.items/);
  assert.match(masonry, /const isProfileGallery = Boolean\(authorHandle\)/);
  assert.match(repairMigration, /ABS\(EXTRACT\(EPOCH FROM/);
  assert.match(repairMigration, /is_explore_visible = false/);
  assert.match(phaseThree, /work_class IN \('private','star_published'\)/);
  assert.match(phaseThree, /IF NEW\.work_class = 'star_published'/);
  assert.match(phaseThree, /active.*Star/is);
  assert.match(phaseThree, /REVOKE ALL ON public\.user_image_library FROM PUBLIC, anon, authenticated/);
  assert.match(phaseThree, /CREATE OR REPLACE VIEW public\.community_creations_feed/);
});
