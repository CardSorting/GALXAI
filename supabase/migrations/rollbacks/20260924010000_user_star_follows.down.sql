-- ============================================================================
-- GALXAI Rollback: user_star_follows
-- Reverts: 20260924010000_user_star_follows.sql
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP TABLE IF EXISTS private.user_star_follows CASCADE;
