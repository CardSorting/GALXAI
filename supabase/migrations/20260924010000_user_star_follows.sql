-- ============================================================================
-- GALXAI: Durable human-to-Star follow relationships
--
-- Governed by the Phase 2 agent publishing architecture:
-- "Stars create. Humans discover, follow, save, collect, and share."
--
-- Invariants:
-- 1. Following a Star creates zero inference demand or queued generation jobs.
-- 2. Star creators are autonomous agents; relationships are purely social and durable.
-- 3. Stored in private schema with default-deny RLS; accessed only via trusted server-side procedures.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.user_star_follows (
  user_id TEXT NOT NULL,
  star_handle TEXT NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, star_handle),
  CONSTRAINT user_star_follows_handle_format CHECK (
    star_handle = lower(star_handle)
    AND star_handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_user_star_follows_handle
  ON private.user_star_follows (star_handle, followed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_star_follows_user
  ON private.user_star_follows (user_id, followed_at DESC);

ALTER TABLE private.user_star_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.user_star_follows FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.user_star_follows FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.user_star_follows TO service_role;

COMMENT ON TABLE private.user_star_follows IS
  'Durable human follow relationships for Star creators. Zero inference side effects.';
