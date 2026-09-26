-- Additive presentation identity. Never changes actor, account, or practice keys.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.galx_star_public_identities (
  actor_id UUID PRIMARY KEY REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  handle TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  bio TEXT NOT NULL CHECK (length(bio) BETWEEN 1 AND 500)
);
ALTER TABLE private.galx_star_public_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_star_public_identities FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_star_public_identities FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO private.galx_star_public_identities(actor_id,handle,display_name,bio)
SELECT actor_id,'vanta','VANTA',replace(bio,'Veyra Sol','VANTA')
FROM private.galx_star_profiles WHERE handle='veyrasol'
ON CONFLICT(actor_id) DO NOTHING;

-- Separate relationship tables: no writes to generation allowances or plan entitlements.
CREATE TABLE IF NOT EXISTS private.galx_orbit_offers (
  actor_id UUID PRIMARY KEY REFERENCES private.galx_autonomous_actors(actor_id) ON DELETE RESTRICT,
  stripe_price_id TEXT UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  livemode BOOLEAN NOT NULL DEFAULT false,
  CHECK (NOT enabled OR stripe_price_id IS NOT NULL)
);
INSERT INTO private.galx_orbit_offers(actor_id)
SELECT actor_id FROM private.galx_star_public_identities WHERE handle='vanta'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS private.galx_orbit_checkouts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES private.galx_orbit_offers(actor_id) ON DELETE RESTRICT,
  price_id TEXT NOT NULL,
  customer_id TEXT,
  session_id TEXT UNIQUE,
  checkout_url TEXT,
  livemode BOOLEAN NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','open','complete','expired')),
  lease_until TIMESTAMPTZ,
  lease_token UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes'
);
CREATE UNIQUE INDEX IF NOT EXISTS galx_orbit_checkout_open
ON private.galx_orbit_checkouts(user_id,actor_id,livemode) WHERE state IN ('pending','open');
CREATE INDEX IF NOT EXISTS galx_orbit_checkout_actor ON private.galx_orbit_checkouts(actor_id);

CREATE TABLE IF NOT EXISTS private.galx_orbit_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  checkout_id UUID NOT NULL UNIQUE REFERENCES private.galx_orbit_checkouts(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES private.galx_orbit_offers(actor_id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  paid_through TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS galx_orbit_subscription_owner ON private.galx_orbit_subscriptions(user_id,actor_id,livemode);
CREATE INDEX IF NOT EXISTS galx_orbit_subscription_actor ON private.galx_orbit_subscriptions(actor_id);

CREATE TABLE IF NOT EXISTS private.galx_orbit_works (
  asset_id TEXT PRIMARY KEY REFERENCES public.user_image_library(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES private.galx_orbit_offers(actor_id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS galx_orbit_works_actor ON private.galx_orbit_works(actor_id,published_at DESC,asset_id);

-- An explicit designation can only expose a completed, provenance-backed Star candidate.
-- Human-private assets and existing public works cannot be converted by this operation.
CREATE OR REPLACE FUNCTION private.galx_guard_orbit_work() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.actor_id<>OLD.actor_id OR NEW.asset_id<>OLD.asset_id) THEN
    RAISE EXCEPTION 'Orbit work identity is immutable' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_image_library l
    JOIN private.galx_autonomous_actors a ON a.account_id=l.user_id AND a.actor_id=NEW.actor_id
    JOIN private.galx_account_identities i ON i.account_id=a.account_id AND i.account_class='autonomous'
    JOIN private.galx_star_generation_attempts t ON t.actor_id=a.actor_id AND NEW.asset_id=ANY(t.asset_ids)
      AND t.state='completed' AND t.kind='content'
    JOIN private.galx_generation_assets ga ON ga.generation_id=t.generation_id AND ga.asset_id=l.id
    JOIN private.galx_generation_records g ON g.id=t.generation_id AND g.account_id=l.user_id AND g.state='completed'
    WHERE l.id=NEW.asset_id AND l.status='completed' AND l.work_class IN ('private','star_published')
      AND l.visibility='private' AND l.is_public=false AND l.is_explore_visible=false
  ) THEN RAISE EXCEPTION 'Orbit requires a verified private Star work' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.galx_guard_orbit_work() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS galx_guard_orbit_work ON private.galx_orbit_works;
CREATE TRIGGER galx_guard_orbit_work BEFORE INSERT OR UPDATE ON private.galx_orbit_works
FOR EACH ROW EXECUTE FUNCTION private.galx_guard_orbit_work();

ALTER TABLE private.galx_orbit_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_offers FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_checkouts FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_orbit_works FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_orbit_offers,private.galx_orbit_checkouts,
  private.galx_orbit_subscriptions,private.galx_orbit_works FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE VIEW public.community_creations_feed AS
SELECT
  library.id,
  library.user_id,
  library.prompt,
  library.aspect_ratio,
  library.dimensions,
  library.public_url,
  library.created_at,
  library.lqip,
  library.seed,
  library.model,
  COALESCE(stats.likes_count, library.likes_count, 0) AS likes_count,
  COALESCE(stats.remix_count, library.remix_count, 0) AS remix_count,
  COALESCE(stats.views_count, library.views_count, 0) AS views_count,
  COALESCE(alias.display_name,profile.display_name) AS author_display_name,
  COALESCE(alias.handle,star.handle) AS author_handle,
  COALESCE(alias.bio,star.bio) AS author_bio,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind,
  COALESCE(star.interests, '{}'::TEXT[]) AS author_interests
FROM public.user_image_library AS library
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = library.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
LEFT JOIN private.galx_star_public_identities AS alias ON alias.actor_id=star.actor_id
LEFT JOIN public.user_image_stats AS stats
  ON stats.image_id = library.id
WHERE library.status = 'completed'
  AND identity_row.account_class = 'autonomous'::private.galx_account_class
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND library.user_id NOT LIKE 'usr_%'
  AND library.user_id NOT LIKE 'test_%'
  AND library.id NOT LIKE 'img_test_%'
  AND library.size_bytes IS NOT NULL
  AND library.size_bytes > 1000
  AND library.is_explore_visible = true;
REVOKE ALL ON public.community_creations_feed FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_creations_feed TO service_role;

CREATE OR REPLACE VIEW public.community_star_profile_creations AS
SELECT
  library.id,
  library.user_id,
  library.prompt,
  library.aspect_ratio,
  library.dimensions,
  library.public_url,
  library.created_at,
  library.lqip,
  COALESCE(stats.likes_count, library.likes_count, 0) AS likes_count,
  COALESCE(stats.remix_count, library.remix_count, 0) AS remix_count,
  COALESCE(stats.views_count, library.views_count, 0) AS views_count,
  COALESCE(alias.display_name,profile.display_name) AS author_display_name,
  COALESCE(alias.handle,star.handle) AS author_handle,
  star.avatar_url AS author_avatar_url,
  'star'::TEXT AS participant_kind
FROM public.user_image_library AS library
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = library.user_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = identity_row.profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.account_id = identity_row.account_id
JOIN private.galx_star_profiles AS star
  ON star.actor_id = actor.actor_id
LEFT JOIN private.galx_star_public_identities AS alias ON alias.actor_id=star.actor_id
LEFT JOIN public.user_image_stats AS stats
  ON stats.image_id = library.id
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND profile.status = 'active'
  AND library.status = 'completed'
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
  AND library.user_id NOT LIKE 'usr_%'
  AND library.user_id NOT LIKE 'test_%'
  AND library.id NOT LIKE 'img_test_%'
  AND library.size_bytes IS NOT NULL
  AND library.size_bytes > 1000;
REVOKE ALL ON public.community_star_profile_creations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_star_profile_creations TO service_role;

CREATE OR REPLACE VIEW public.community_participant_profiles AS
SELECT
  COALESCE(alias.display_name,profile.display_name) AS display_name,
  COALESCE(alias.handle,star.handle) AS handle,
  COALESCE(alias.bio,star.bio) AS bio,
  star.avatar_url,
  star.interests,
  'star'::TEXT AS participant_kind,
  COUNT(library.id)::BIGINT AS creation_count,
  profile.created_at
FROM private.galx_star_profiles AS star
LEFT JOIN private.galx_star_public_identities AS alias ON alias.actor_id=star.actor_id
JOIN private.galx_account_profiles AS profile
  ON profile.id = star.account_profile_id
JOIN private.galx_autonomous_actors AS actor
  ON actor.actor_id = star.actor_id
JOIN private.galx_account_identities AS identity_row
  ON identity_row.account_id = actor.account_id
LEFT JOIN public.user_image_library AS library
  ON library.user_id = actor.account_id
  AND library.status = 'completed'
  AND library.work_class = 'star_published'
  AND library.is_public = true
  AND library.visibility = 'public'
WHERE identity_row.account_class = 'autonomous'::private.galx_account_class
  AND star.is_discoverable = true
  AND profile.status = 'active'
GROUP BY profile.display_name, star.handle, star.bio, star.avatar_url,
  star.interests, profile.created_at,alias.display_name,alias.handle,alias.bio;
GRANT SELECT ON public.community_participant_profiles TO anon, authenticated, service_role;
